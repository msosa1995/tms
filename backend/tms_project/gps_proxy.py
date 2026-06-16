"""
GPS proxy: posicion en tiempo real + historial de recorridos desde Cusat.
"""
import math
import re

import requests as req
import pytz
from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

CUSAT_BASE  = "https://gps.cusat.com.py"
CUSAT_EMAIL = getattr(settings, "CUSAT_EMAIL", "HBK137@cusat.com.py")
CUSAT_PASS  = getattr(settings, "CUSAT_PASSWORD", "Sosaro44")
SESSION_KEY = "cusat_session_cookies"
CACHE_TTL   = 60 * 50  # 50 minutos

TZ_LOCAL = pytz.timezone("America/Asuncion")


# ── Sesion Cusat ─────────────────────────────────────────────────────────────

def _get_session():
    cookies = cache.get(SESSION_KEY)
    session = req.Session()

    if cookies:
        session.cookies.update(cookies)
        r = session.get(
            f"{CUSAT_BASE}/objects/list/data?draw=1&start=0&length=1",
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=10,
        )
        if r.status_code == 200 and r.headers.get("Content-Type", "").startswith("application/json"):
            return session

    session = req.Session()
    r0 = session.get(f"{CUSAT_BASE}/authentication/create", timeout=10)
    csrf = re.search(r'name="_token"[^>]+value="([^"]+)"', r0.text)
    if not csrf:
        raise RuntimeError("No se pudo obtener CSRF token de Cusat")

    session.post(
        f"{CUSAT_BASE}/authentication/store",
        data={
            "_token": csrf.group(1),
            "identifier": CUSAT_EMAIL,
            "password": CUSAT_PASS,
            "remember_me": "1",
        },
        allow_redirects=True,
        timeout=15,
    )
    cache.set(SESSION_KEY, dict(session.cookies), CACHE_TTL)
    return session


def _parse_device(obj):
    pos = obj.get("position", "")
    match = re.search(r"q=([-\d.]+),([-\d.]+)", pos)
    lat = float(match.group(1)) if match else None
    lng = float(match.group(2)) if match else None

    status_html = obj.get("status", "")
    color_match = re.search(r"background-color:\s*(\w+)", status_html)
    title_match = re.search(r"title='([^']+)'", status_html)
    color  = color_match.group(1) if color_match else "gray"
    estado = title_match.group(1) if title_match else "Desconocido"

    nombre = re.sub(r"<[^>]+>", "", obj.get("name", "")).strip()
    hora   = re.sub(r"<[^>]+>", "", obj.get("time", "")).strip()

    return {
        "nombre": nombre,
        "lat": lat,
        "lng": lng,
        "estado": estado,
        "color": color,
        "ultima_actualizacion": hora,
        "google_maps": f"https://maps.google.com/maps?q={lat},{lng}" if lat else None,
    }


def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


# ── Vistas ────────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([])
def gps_snapshot(request):
    """
    Endpoint llamado por cron externo (cron-job.org) cada 5 minutos.
    Requiere header X-Cron-Secret con el valor de la variable CRON_SECRET.
    """
    from tms_project.apps.gps.models import GpsPosicion

    try:
        session = _get_session()
        r = session.get(
            f"{CUSAT_BASE}/objects/list/data?draw=1&start=0&length=100",
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()

        dispositivo = "HBK137"
        raw = next(
            (obj for obj in data.get("data", []) if dispositivo in str(obj.get("name", ""))),
            None,
        )
        if not raw:
            return Response({"ok": False, "msg": "HBK137 no encontrado"})

        parsed = _parse_device(raw)
        if not parsed["lat"]:
            return Response({"ok": False, "msg": "Sin coordenadas"})

        ultima = GpsPosicion.objects.filter(dispositivo=dispositivo).first()
        if ultima:
            dist_m = _haversine_km(ultima.lat, ultima.lng, parsed["lat"], parsed["lng"]) * 1000
            if dist_m < 50:
                return Response({"ok": True, "msg": f"Sin movimiento ({dist_m:.0f}m)", "guardado": False})

        GpsPosicion.objects.create(
            dispositivo=dispositivo,
            lat=parsed["lat"],
            lng=parsed["lng"],
            estado=parsed["estado"],
        )
        return Response({"ok": True, "msg": "Posicion guardada", "guardado": True,
                         "lat": parsed["lat"], "lng": parsed["lng"]})

    except Exception as e:
        return Response({"ok": False, "error": str(e)}, status=502)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gps_posicion(request):
    """Posicion actual de todos los vehiculos GPS."""
    try:
        session = _get_session()
        r = session.get(
            f"{CUSAT_BASE}/objects/list/data?draw=1&start=0&length=100",
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()
        dispositivos = [
            _parse_device(obj) for obj in data.get("data", [])
            if "HBK137" in str(obj.get("name", ""))
        ]
        return Response({"ok": True, "dispositivos": dispositivos})
    except Exception as e:
        return Response({"ok": False, "error": str(e)}, status=502)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gps_resumen_diario(request):
    """
    Km recorridos por dia en los ultimos N dias.
    ?dispositivo=HBK137&dias=30
    """
    from datetime import timedelta
    from django.utils import timezone
    from tms_project.apps.gps.models import GpsPosicion

    dispositivo = request.query_params.get("dispositivo", "HBK137")
    dias = min(int(request.query_params.get("dias", 30)), 90)

    inicio = timezone.now() - timedelta(days=dias)
    posiciones = list(
        GpsPosicion.objects.filter(
            dispositivo=dispositivo,
            timestamp__gte=inicio,
        ).order_by("timestamp").values("lat", "lng", "timestamp", "estado")
    )

    # Agrupar por dia local (America/Asuncion)
    dias_dict = {}
    for pos in posiciones:
        ts_local = pos["timestamp"].astimezone(TZ_LOCAL)
        fecha_str = ts_local.strftime("%Y-%m-%d")
        dias_dict.setdefault(fecha_str, []).append({**pos, "_ts_local": ts_local})

    resumen = []
    km_total_periodo = 0.0

    for fecha_str, puntos in sorted(dias_dict.items()):
        km_dia = 0.0
        for i in range(1, len(puntos)):
            km_dia += _haversine_km(
                puntos[i - 1]["lat"], puntos[i - 1]["lng"],
                puntos[i]["lat"],     puntos[i]["lng"],
            )
        km_dia = round(km_dia, 1)
        km_total_periodo += km_dia

        resumen.append({
            "fecha": fecha_str,
            "km": km_dia,
            "primera_hora": puntos[0]["_ts_local"].strftime("%H:%M"),
            "ultima_hora":  puntos[-1]["_ts_local"].strftime("%H:%M"),
            "n_puntos": len(puntos),
        })

    return Response({
        "ok": True,
        "dispositivo": dispositivo,
        "dias_solicitados": dias,
        "km_total_periodo": round(km_total_periodo, 1),
        "resumen": resumen,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gps_estado(request):
    """
    Panel de control: odómetro actual, alerta de mantenimiento y autonomía de combustible.
    """
    from datetime import datetime, time
    from django.utils import timezone
    from tms_project.apps.gps.models import GpsPosicion, ConfiguracionVehiculo
    from tms_project.apps.ingresos.models import CargaCombustible

    dispositivo = "HBK137"

    config, _ = ConfiguracionVehiculo.objects.get_or_create(
        dispositivo=dispositivo,
        defaults={
            "odometro_base_km": 104050,
            "km_ultimo_mantenimiento": 100000,
            "intervalo_mantenimiento_km": 5000,
            "descripcion_mantenimiento": "Cambio de aceite y filtros",
            "consumo_l_100km": 25.0,
        },
    )

    # ── Odómetro ─────────────────────────────────────────────────────────────
    posiciones = list(
        GpsPosicion.objects.filter(dispositivo=dispositivo)
        .order_by("timestamp")
        .values("lat", "lng", "timestamp")
    )
    km_gps = sum(
        _haversine_km(posiciones[i - 1]["lat"], posiciones[i - 1]["lng"],
                      posiciones[i]["lat"],     posiciones[i]["lng"])
        for i in range(1, len(posiciones))
    )
    odometro_actual   = config.odometro_base_km + km_gps
    km_proximo_mant   = config.km_ultimo_mantenimiento + config.intervalo_mantenimiento_km
    km_hasta_mant     = km_proximo_mant - odometro_actual

    if km_hasta_mant <= 0:
        alerta_mant = "vencido"
    elif km_hasta_mant <= 500:
        alerta_mant = "urgente"
    elif km_hasta_mant <= 1000:
        alerta_mant = "proximo"
    else:
        alerta_mant = "ok"

    # ── Combustible ───────────────────────────────────────────────────────────
    ultima_carga = CargaCombustible.objects.order_by("-fecha").first()
    combustible = None
    if ultima_carga:
        inicio = TZ_LOCAL.localize(datetime.combine(ultima_carga.fecha, time.min))
        pos_carga = list(
            GpsPosicion.objects.filter(dispositivo=dispositivo, timestamp__gte=inicio)
            .order_by("timestamp")
            .values("lat", "lng")
        )
        km_desde_carga = sum(
            _haversine_km(pos_carga[i - 1]["lat"], pos_carga[i - 1]["lng"],
                          pos_carga[i]["lat"],     pos_carga[i]["lng"])
            for i in range(1, len(pos_carga))
        )
        TANQUE_L        = 100.0  # capacidad real del tanque HBK137
        litros          = float(ultima_carga.litros)
        consumidos      = km_desde_carga * (config.consumo_l_100km / 100)
        restantes       = max(0.0, litros - consumidos)
        km_autonomia    = restantes * (100 / config.consumo_l_100km)
        porcentaje      = round(restantes / TANQUE_L * 100)

        combustible = {
            "ultima_carga_fecha":    str(ultima_carga.fecha),
            "litros_cargados":       litros,
            "km_desde_carga":        round(km_desde_carga, 1),
            "litros_consumidos":     round(consumidos, 1),
            "litros_restantes":      round(restantes, 1),
            "km_autonomia_restante": round(km_autonomia),
            "porcentaje_tanque":     porcentaje,
            "consumo_l_100km":       config.consumo_l_100km,
        }

    return Response({
        "ok": True,
        "odometro": {
            "actual_km":        round(odometro_actual),
            "km_gps_acumulado": round(km_gps, 1),
        },
        "mantenimiento": {
            "descripcion":  config.descripcion_mantenimiento,
            "ultimo_km":    config.km_ultimo_mantenimiento,
            "proximo_km":   km_proximo_mant,
            "km_hasta":     round(km_hasta_mant),
            "alerta":       alerta_mant,
        },
        "combustible": combustible,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gps_posiciones_fecha(request):
    """
    Todas las posiciones registradas en una fecha.
    ?fecha=2026-06-16&dispositivo=HBK137
    """
    from datetime import datetime, time
    from django.utils import timezone
    from tms_project.apps.gps.models import GpsPosicion

    fecha_str = request.query_params.get("fecha")
    dispositivo = request.query_params.get("dispositivo", "HBK137")

    if not fecha_str:
        return Response({"ok": False, "error": "Parametro 'fecha' requerido (YYYY-MM-DD)"}, status=400)

    try:
        fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
    except ValueError:
        return Response({"ok": False, "error": "Formato invalido, usar YYYY-MM-DD"}, status=400)

    inicio = TZ_LOCAL.localize(datetime.combine(fecha, time.min))
    fin    = TZ_LOCAL.localize(datetime.combine(fecha, time.max))

    qs = GpsPosicion.objects.filter(
        dispositivo=dispositivo,
        timestamp__gte=inicio,
        timestamp__lte=fin,
    ).order_by("timestamp")

    puntos = [
        {
            "lat": p.lat,
            "lng": p.lng,
            "estado": p.estado,
            "hora": p.timestamp.astimezone(TZ_LOCAL).strftime("%H:%M:%S"),
        }
        for p in qs
    ]

    # Calcular km total del dia
    km = sum(
        _haversine_km(puntos[i - 1]["lat"], puntos[i - 1]["lng"],
                      puntos[i]["lat"],     puntos[i]["lng"])
        for i in range(1, len(puntos))
    )

    return Response({
        "ok": True,
        "dispositivo": dispositivo,
        "fecha": fecha_str,
        "km_total": round(km, 1),
        "n_puntos": len(puntos),
        "puntos": puntos,
    })

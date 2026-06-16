"""
GPS proxy: obtiene posición en tiempo real desde Cusat GPS.
Mantiene la sesión en caché para no re-loguear en cada request.
"""
import re
import requests as req
from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

CUSAT_BASE  = "https://gps.cusat.com.py"
CUSAT_EMAIL = getattr(settings, "CUSAT_EMAIL", "HBK137@cusat.com.py")
CUSAT_PASS  = getattr(settings, "CUSAT_PASSWORD", "Sosaro44")
SESSION_KEY = "cusat_session_cookies"
CACHE_TTL   = 60 * 50  # 50 minutos (sesión de Cusat dura ~1 hora)


def _get_session():
    """Devuelve una sesión requests autenticada con Cusat."""
    cookies = cache.get(SESSION_KEY)
    session = req.Session()

    if cookies:
        session.cookies.update(cookies)
        # Verificar que la sesión sigue activa
        r = session.get(f"{CUSAT_BASE}/objects/list/data?draw=1&start=0&length=1",
                        headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
                        timeout=10)
        if r.status_code == 200 and r.headers.get("Content-Type", "").startswith("application/json"):
            return session

    # Re-login
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
    """Extrae lat, lng, estado y hora de un objeto del JSON de Cusat."""
    pos = obj.get("position", "")
    match = re.search(r"q=([-\d.]+),([-\d.]+)", pos)
    lat = float(match.group(1)) if match else None
    lng = float(match.group(2)) if match else None

    status_html = obj.get("status", "")
    color_match = re.search(r"background-color:\s*(\w+)", status_html)
    title_match = re.search(r"title='([^']+)'", status_html)
    color = color_match.group(1) if color_match else "gray"
    estado = title_match.group(1) if title_match else "Desconocido"

    nombre = re.sub(r"<[^>]+>", "", obj.get("name", "")).strip()
    hora = re.sub(r"<[^>]+>", "", obj.get("time", "")).strip()

    return {
        "nombre": nombre,
        "lat": lat,
        "lng": lng,
        "estado": estado,
        "color": color,
        "ultima_actualizacion": hora,
        "google_maps": f"https://maps.google.com/maps?q={lat},{lng}" if lat else None,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gps_posicion(request):
    """Devuelve la posición actual de todos los vehículos GPS."""
    try:
        session = _get_session()
        r = session.get(
            f"{CUSAT_BASE}/objects/list/data?draw=1&start=0&length=100",
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()
        dispositivos = [_parse_device(obj) for obj in data.get("data", [])]
        return Response({"ok": True, "dispositivos": dispositivos})
    except Exception as e:
        return Response({"ok": False, "error": str(e)}, status=502)

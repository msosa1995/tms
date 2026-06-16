"""
Importa historial GPS del HBK137 desde Cusat (HTML scraping).
Ejecutar: python manage.py importar_historial_gps
"""
import math
import re
from datetime import date, datetime, time, timedelta

import pytz
from django.core.management.base import BaseCommand
from django.db import connection

from tms_project.gps_proxy import CUSAT_BASE, _get_session
from tms_project.apps.gps.models import GpsPosicion


def _raw_insert(objs):
    """INSERT directo via SQL para respetar timestamps históricos (Django bulk_create los sobreescribe)."""
    if not objs:
        return
    rows = [(o.dispositivo, o.lat, o.lng, o.estado, o.timestamp) for o in objs]
    placeholders = ",".join(["(%s,%s,%s,%s,%s)"] * len(rows))
    flat = [v for row in rows for v in row]
    with connection.cursor() as cur:
        cur.execute(
            f"INSERT INTO gps_gpsposicion (dispositivo, lat, lng, estado, timestamp) VALUES {placeholders}",
            flat,
        )

DEVICE_ID    = 76194
DISPOSITIVO  = "HBK137"
FECHA_INICIO = date(2026, 3, 7)
MIN_DIST_M   = 30
TZ           = pytz.timezone("America/Asuncion")


def _haversine_m(lat1, lng1, lat2, lng2):
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _fetch_dia(session, fecha_str):
    """
    Devuelve lista de {lat, lng, timestamp} para un dia.
    fecha_str = "YYYY-MM-DD"
    Cusat devuelve HTML con <tr data-lat="..." data-lng="..." data-time="DD-MM-YYYY HH:MM:SS">
    """
    params = {
        "device_id": DEVICE_ID,
        "from_date": fecha_str,
        "from_time": "00:00",
        "to_date":   fecha_str,
        "to_time":   "23:59",
        "limit":     1000,
    }
    try:
        r = session.get(
            f"{CUSAT_BASE}/history/positions",
            params=params,
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=30,
        )
    except Exception:
        return []

    if r.status_code != 200:
        return []

    rows = re.findall(
        r'data-lat="([-\d.]+)"[^>]*data-lng="([-\d.]+)"[^>]*data-time="([^"]+)"',
        r.text,
    )

    puntos = []
    for lat_str, lng_str, time_str in rows:
        try:
            lat = float(lat_str)
            lng = float(lng_str)
            dt  = datetime.strptime(time_str, "%d-%m-%Y %H:%M:%S")
            ts  = TZ.localize(dt)
            puntos.append({"lat": lat, "lng": lng, "timestamp": ts})
        except Exception:
            continue
    return puntos


class Command(BaseCommand):
    help = "Importa historial GPS del HBK137 desde Cusat (7 mar 2026 - hoy)"

    def handle(self, *args, **kwargs):
        session = _get_session()
        self.stdout.write("Sesion Cusat OK")

        # Limpiar registros previos del rango para evitar duplicados
        desde_dt = TZ.localize(datetime.combine(FECHA_INICIO, time.min))
        borrados = GpsPosicion.objects.filter(
            dispositivo=DISPOSITIVO, timestamp__gte=desde_dt
        ).count()
        if borrados:
            GpsPosicion.objects.filter(dispositivo=DISPOSITIVO, timestamp__gte=desde_dt).delete()
            self.stdout.write(f"Eliminados {borrados} registros previos del rango")

        fecha   = FECHA_INICIO
        hoy     = date.today()
        total_p = 0
        total_k = 0.0
        ultimo  = None   # ultimo punto guardado (para filtro de distancia)
        bulk    = []

        while fecha <= hoy:
            fstr   = fecha.strftime("%Y-%m-%d")
            puntos = _fetch_dia(session, fstr)
            dia_p  = 0
            dia_k  = 0.0

            for p in puntos:
                if ultimo:
                    dist = _haversine_m(ultimo["lat"], ultimo["lng"], p["lat"], p["lng"])
                    if dist < MIN_DIST_M:
                        continue
                    dia_k   += dist / 1000
                    total_k += dist / 1000

                bulk.append(GpsPosicion(
                    dispositivo=DISPOSITIVO,
                    lat=p["lat"],
                    lng=p["lng"],
                    estado="Historico",
                    timestamp=p["timestamp"],
                ))
                ultimo = {"lat": p["lat"], "lng": p["lng"]}
                dia_p += 1

            # Flush each 500 records to avoid memory issues
            if len(bulk) >= 500:
                _raw_insert(bulk)
                bulk = []

            total_p += dia_p
            msg = f"  {fstr}: {dia_p} pts ({len(puntos)} brutos)"
            if dia_k > 0:
                msg += f" | {dia_k:.1f} km"
            self.stdout.write(self.style.SUCCESS(msg))

            fecha += timedelta(days=1)

        if bulk:
            _raw_insert(bulk)

        self.stdout.write(self.style.SUCCESS(
            f"\nImportacion completa: {total_p} puntos guardados | {total_k:.1f} km acumulados"
        ))

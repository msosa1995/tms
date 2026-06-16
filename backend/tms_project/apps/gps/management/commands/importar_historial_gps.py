"""
Importa el historial GPS del HBK137 desde Cusat.
Ejecutar: python manage.py importar_historial_gps
Rango por defecto: 2026-03-07 hasta hoy.
"""
import math
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from tms_project.gps_proxy import CUSAT_BASE, _get_session
from tms_project.apps.gps.models import GpsPosicion

DEVICE_ID  = 76194
DISPOSITIVO = "HBK137"
FECHA_INICIO = date(2026, 3, 7)
MIN_DISTANCIA_M = 30  # guardar puntos con al menos 30m de diferencia


def _haversine_m(lat1, lng1, lat2, lng2):
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


class Command(BaseCommand):
    help = "Importa historial GPS del HBK137 desde Cusat (7 mar 2026 hasta hoy)"

    def handle(self, *args, **kwargs):
        import pytz
        tz = pytz.timezone("America/Asuncion")

        session = _get_session()
        self.stdout.write("Sesion Cusat OK")

        # Limpiar posiciones anteriores al rango para no duplicar
        desde_dt = tz.localize(
            __import__("datetime").datetime.combine(FECHA_INICIO, __import__("datetime").time.min)
        )
        borrados = GpsPosicion.objects.filter(
            dispositivo=DISPOSITIVO, timestamp__gte=desde_dt
        ).count()
        if borrados > 0:
            GpsPosicion.objects.filter(dispositivo=DISPOSITIVO, timestamp__gte=desde_dt).delete()
            self.stdout.write(f"Eliminados {borrados} registros existentes del rango")

        fecha_actual = FECHA_INICIO
        fecha_fin    = date.today()
        total_puntos = 0
        total_km     = 0.0
        ultimo_punto = None

        while fecha_actual <= fecha_fin:
            fecha_str = fecha_actual.strftime("%Y-%m-%d")
            self.stdout.write(f"Importando {fecha_str}...")

            puntos_dia = self._fetch_dia(session, fecha_str)

            guardados_dia = 0
            for p in puntos_dia:
                lat, lng = p.get("lat"), p.get("lng")
                if lat is None or lng is None:
                    continue

                # Filtrar puntos demasiado cercanos
                if ultimo_punto:
                    dist = _haversine_m(ultimo_punto["lat"], ultimo_punto["lng"], lat, lng)
                    if dist < MIN_DISTANCIA_M:
                        continue
                    total_km += dist / 1000

                ts = p.get("timestamp")
                GpsPosicion.objects.create(
                    dispositivo=DISPOSITIVO,
                    lat=lat,
                    lng=lng,
                    estado=p.get("estado", "Historico"),
                    timestamp=ts,
                )
                ultimo_punto = {"lat": lat, "lng": lng}
                guardados_dia += 1

            total_puntos += guardados_dia
            self.stdout.write(
                self.style.SUCCESS(f"  {fecha_str}: {guardados_dia} puntos guardados")
            )
            fecha_actual += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(
            f"\nImportacion completa: {total_puntos} puntos | {total_km:.1f} km totales"
        ))

    def _fetch_dia(self, session, fecha_str):
        """Intenta obtener posiciones del dia via /history/positions."""
        from datetime import datetime
        import pytz
        tz = pytz.timezone("America/Asuncion")
        puntos = []

        # Probar distintas combinaciones de parametros
        combos = [
            {"device_id": DEVICE_ID, "date": fecha_str, "draw": 1, "start": 0, "length": 5000},
            {"object_id": DEVICE_ID, "date": fecha_str, "draw": 1, "start": 0, "length": 5000},
            {"device_id": DEVICE_ID, "date_from": fecha_str, "date_to": fecha_str, "draw": 1, "start": 0, "length": 5000},
            {"id": DEVICE_ID, "date": fecha_str, "draw": 1, "start": 0, "length": 5000},
            {"device_id": DEVICE_ID, "from": fecha_str, "to": fecha_str, "draw": 1, "start": 0, "length": 5000},
        ]

        for endpoint in ["/history/positions", "/routes/list"]:
            for params in combos:
                try:
                    r = session.get(
                        f"{CUSAT_BASE}{endpoint}",
                        params=params,
                        headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
                        timeout=15,
                    )
                    if r.status_code != 200:
                        continue
                    ct = r.headers.get("Content-Type", "")
                    if "json" not in ct:
                        continue
                    data = r.json()

                    # Si la respuesta tiene datos, extraer posiciones
                    filas = data.get("data", [])
                    if not filas:
                        continue

                    self.stdout.write(f"    ENCONTRADO: {endpoint} con params {list(params.keys())}")
                    self.stdout.write(f"    Muestra: {str(filas[0])[:300]}")

                    # Extraer lat/lng/timestamp de cada fila
                    for fila in filas:
                        p = self._parsear_fila(fila, fecha_str, tz)
                        if p:
                            puntos.append(p)

                    if puntos:
                        return puntos

                except Exception as e:
                    pass

        if not puntos:
            self.stdout.write(f"    Sin datos para {fecha_str}")
        return puntos

    def _parsear_fila(self, fila, fecha_str, tz):
        """Extrae lat, lng y timestamp de una fila del JSON de Cusat."""
        import re
        from datetime import datetime

        lat = lng = ts = None

        # Buscar lat/lng directamente
        if isinstance(fila, dict):
            lat = fila.get("lat") or fila.get("latitude") or fila.get("y")
            lng = fila.get("lng") or fila.get("lon") or fila.get("longitude") or fila.get("x")
            hora_str = fila.get("time") or fila.get("datetime") or fila.get("timestamp") or fila.get("date")

            # Buscar en campos HTML si no hay directo
            for v in fila.values():
                if isinstance(v, str) and "q=" in v:
                    m = re.search(r"q=([-\d.]+),([-\d.]+)", v)
                    if m:
                        lat, lng = float(m.group(1)), float(m.group(2))

            if lat is None or lng is None:
                return None

            # Parsear timestamp
            if hora_str:
                for fmt in ["%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S",
                             "%Y-%m-%dT%H:%M:%S", "%H:%M:%S"]:
                    try:
                        if fmt == "%H:%M:%S":
                            dt = datetime.strptime(f"{fecha_str} {hora_str}", f"%Y-%m-%d {fmt}")
                        else:
                            dt = datetime.strptime(str(hora_str)[:19], fmt)
                        ts = tz.localize(dt)
                        break
                    except Exception:
                        continue

            if ts is None:
                ts = tz.localize(datetime.strptime(fecha_str, "%Y-%m-%d").replace(hour=12))

            return {"lat": float(lat), "lng": float(lng), "timestamp": ts, "estado": "Historico"}

        return None

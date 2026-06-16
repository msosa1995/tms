"""
Comando: python manage.py guardar_gps
Guarda la posicion actual del HBK137 en la base de datos.
Railway lo ejecuta cada 5 minutos como Cron Job.
Solo guarda un punto si el camion se movio mas de 50 metros.
"""
import math

from django.core.management.base import BaseCommand

from tms_project.gps_proxy import CUSAT_BASE, _get_session, _parse_device
from tms_project.apps.gps.models import GpsPosicion

DISPOSITIVO = "HBK137"
MIN_DISTANCIA_M = 50


def _haversine_m(lat1, lng1, lat2, lng2):
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


class Command(BaseCommand):
    help = "Guarda la posicion GPS actual del HBK137 en la base de datos"

    def handle(self, *args, **kwargs):
        try:
            session = _get_session()
            r = session.get(
                f"{CUSAT_BASE}/objects/list/data?draw=1&start=0&length=100",
                headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
                timeout=12,
            )
            r.raise_for_status()
            data = r.json()

            raw = next(
                (obj for obj in data.get("data", []) if DISPOSITIVO in str(obj.get("name", ""))),
                None,
            )
            if not raw:
                self.stdout.write(self.style.WARNING("HBK137 no encontrado en Cusat"))
                return

            parsed = _parse_device(raw)
            if not parsed["lat"]:
                self.stdout.write(self.style.WARNING("Sin coordenadas GPS"))
                return

            ultima = GpsPosicion.objects.filter(dispositivo=DISPOSITIVO).first()
            if ultima:
                dist = _haversine_m(ultima.lat, ultima.lng, parsed["lat"], parsed["lng"])
                if dist < MIN_DISTANCIA_M:
                    self.stdout.write(f"Sin movimiento ({dist:.0f}m) — no se guarda")
                    return

            GpsPosicion.objects.create(
                dispositivo=DISPOSITIVO,
                lat=parsed["lat"],
                lng=parsed["lng"],
                estado=parsed["estado"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Guardado: {parsed['lat']}, {parsed['lng']} [{parsed['estado']}]"
                )
            )

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error al guardar GPS: {e}"))

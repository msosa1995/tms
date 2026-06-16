"""
Diagnostico v5: prueba from_date/from_time y history/export
Ejecutar: python manage.py explorar_cusat
"""
import re
from django.core.management.base import BaseCommand
from tms_project.gps_proxy import CUSAT_BASE, _get_session

DEVICE_ID = 76194


class Command(BaseCommand):
    help = "Diagnostico v5 endpoint historial Cusat"

    def handle(self, *args, **kwargs):
        session = _get_session()
        self.stdout.write("Sesion OK\n")

        # ── 1. GET /history/positions con from_date/from_time ────────────────
        self.stdout.write("=== GET /history/positions con from_date/from_time ===")
        combos = [
            {"device_id": DEVICE_ID, "from_date": "2026-06-15", "from_time": "00:00", "to_date": "2026-06-15", "to_time": "23:59", "draw": 1, "start": 0, "length": 1000},
            {"device_id": DEVICE_ID, "from_date": "2026-06-15", "from_time": "00:00:00", "to_date": "2026-06-15", "to_time": "23:59:59", "draw": 1, "start": 0, "length": 1000},
            {"device_id": DEVICE_ID, "from_date": "15/06/2026", "from_time": "00:00", "to_date": "15/06/2026", "to_time": "23:59"},
            {"device_id": DEVICE_ID, "from_date": "2026-06-15", "from_time": "00:00", "to_date": "2026-06-16", "to_time": "00:00"},
            # Sin times
            {"device_id": DEVICE_ID, "from_date": "2026-06-15", "to_date": "2026-06-15", "draw": 1, "start": 0, "length": 1000},
            # Fecha de ayer por si hoy no tiene datos
            {"device_id": DEVICE_ID, "from_date": "2026-06-14", "from_time": "00:00", "to_date": "2026-06-14", "to_time": "23:59", "draw": 1, "start": 0, "length": 1000},
        ]
        for params in combos:
            r = session.get(
                f"{CUSAT_BASE}/history/positions",
                params=params,
                headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
                timeout=12,
            )
            self.stdout.write(f"\nParams: from_date={params.get('from_date')} from_time={params.get('from_time','N/A')}")
            self.stdout.write(f"Status: {r.status_code} | {r.text[:500]}")

        # ── 2. Visitar /history y extraer estructura del formulario ──────────
        self.stdout.write("\n=== Formulario en /history ===")
        r = session.get(f"{CUSAT_BASE}/history", timeout=10)
        form_frags = re.findall(r'<(?:input|select)[^>]+name="([^"]+)"[^>]*>', r.text)
        self.stdout.write(f"Campos del formulario: {form_frags}")
        # Buscar valores por defecto
        defaults = re.findall(r'name="([^"]+)"[^>]+value="([^"]*)"', r.text)
        self.stdout.write(f"Valores por defecto: {defaults[:10]}")

        # ── 3. GET /history/export ────────────────────────────────────────────
        self.stdout.write("\n=== GET /history/export ===")
        for params in [
            {"device_id": DEVICE_ID, "from_date": "2026-06-15", "from_time": "00:00", "to_date": "2026-06-15", "to_time": "23:59", "format": "json"},
            {"device_id": DEVICE_ID, "from_date": "2026-06-15", "from_time": "00:00", "to_date": "2026-06-15", "to_time": "23:59"},
        ]:
            r = session.get(f"{CUSAT_BASE}/history/export", params=params, timeout=15)
            self.stdout.write(f"\nStatus: {r.status_code} | CT: {r.headers.get('Content-Type','')} | {r.text[:400]}")

        # ── 4. GET /history/position (singular) ──────────────────────────────
        self.stdout.write("\n=== GET /history/position (singular) ===")
        r = session.get(
            f"{CUSAT_BASE}/history/position",
            params={"device_id": DEVICE_ID, "from_date": "2026-06-15", "from_time": "00:00", "to_date": "2026-06-15", "to_time": "23:59"},
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=12,
        )
        self.stdout.write(f"Status: {r.status_code} | {r.text[:400]}")

        self.stdout.write("\nListo.")

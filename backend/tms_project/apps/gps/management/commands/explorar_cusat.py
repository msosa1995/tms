"""
Diagnostico v4: explora la pagina del dispositivo y prueba formatos de fecha
Ejecutar: python manage.py explorar_cusat
"""
import re
from django.core.management.base import BaseCommand
from tms_project.gps_proxy import CUSAT_BASE, _get_session

DEVICE_ID = 76194


class Command(BaseCommand):
    help = "Diagnostico v4 endpoint historial Cusat"

    def handle(self, *args, **kwargs):
        session = _get_session()
        self.stdout.write("Sesion OK\n")

        # ── 1. Visitar pagina follow_map del dispositivo ─────────────────────
        self.stdout.write("=== GET /devices/follow_map/76194 ===")
        r = session.get(f"{CUSAT_BASE}/devices/follow_map/{DEVICE_ID}", timeout=12)
        self.stdout.write(f"Status: {r.status_code}")
        # Buscar JS con device/history data embebida
        frags = re.findall(r'.{0,50}(?:device_id|history|positions|date_from|sensor).{0,200}', r.text)
        for f in frags[:10]:
            self.stdout.write(f"  {f.replace(chr(10),' ')}")

        # ── 2. Buscar en app.js como se llama history/positions ──────────────
        self.stdout.write("\n=== app.js: buscar llamada a history/positions ===")
        rjs = session.get(f"{CUSAT_BASE}/assets/js/app.js?t=1773043745", timeout=12)
        # Buscar la funcion que llama a history/positions
        frags2 = re.findall(r'.{0,300}history/positions.{0,300}', rjs.text)
        for f in frags2[:5]:
            self.stdout.write(f"  {f.replace(chr(10),' ')}")
        # Buscar parametros adicionales
        frags3 = re.findall(r'.{0,100}date_from|date_to|sensor_id|device_id.{0,100}', rjs.text)
        for f in frags3[:10]:
            self.stdout.write(f"  {f.replace(chr(10),' ')}")

        # ── 3. Probar /history/positions con POST y distintos formatos ────────
        self.stdout.write("\n=== POST /history/positions ===")

        # Obtener CSRF token
        r0 = session.get(f"{CUSAT_BASE}/history", timeout=10)
        csrf = re.search(r'name="_token"[^>]+value="([^"]+)"', r0.text)
        csrf_token = csrf.group(1) if csrf else ""
        self.stdout.write(f"CSRF token: {'OK' if csrf_token else 'NO ENCONTRADO'}")

        post_combos = [
            {"_token": csrf_token, "device_id": DEVICE_ID, "date_from": "2026-06-15 00:00:00", "date_to": "2026-06-15 23:59:59"},
            {"_token": csrf_token, "device_id": DEVICE_ID, "date_from": "15/06/2026 00:00", "date_to": "15/06/2026 23:59"},
            {"_token": csrf_token, "device_id": DEVICE_ID, "date": "2026-06-15"},
            {"_token": csrf_token, "device_id": DEVICE_ID, "date": "15/06/2026"},
        ]
        for params in post_combos:
            r = session.post(
                f"{CUSAT_BASE}/history/positions",
                data=params,
                headers={"X-Requested-With": "XMLHttpRequest"},
                timeout=12,
            )
            self.stdout.write(f"\nPOST params={list(params.keys())} date={params.get('date') or params.get('date_from')}")
            self.stdout.write(f"Status: {r.status_code} | {r.text[:400]}")

        # ── 4. Probar /routes/list ────────────────────────────────────────────
        self.stdout.write("\n=== /routes/list ===")
        for params in [
            {"device_id": DEVICE_ID, "date": "2026-06-15", "draw": 1, "start": 0, "length": 100},
            {"device_id": DEVICE_ID, "date_from": "2026-06-15", "date_to": "2026-06-15", "draw": 1, "start": 0, "length": 100},
        ]:
            r = session.get(
                f"{CUSAT_BASE}/routes/list",
                params=params,
                headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
                timeout=12,
            )
            self.stdout.write(f"\nGET {params}")
            self.stdout.write(f"Status: {r.status_code} | {r.text[:400]}")

        self.stdout.write("\nListo.")

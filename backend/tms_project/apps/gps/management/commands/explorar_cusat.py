"""
Diagnóstico enfocado: encuentra los parametros correctos de /history/positions
Ejecutar: python manage.py explorar_cusat
"""
import re
from django.core.management.base import BaseCommand
from tms_project.gps_proxy import CUSAT_BASE, _get_session

DEVICE_ID = 76194


class Command(BaseCommand):
    help = "Diagnostico del endpoint /history/positions de Cusat"

    def handle(self, *args, **kwargs):
        session = _get_session()
        self.stdout.write("Sesion OK\n")

        # ── 1. Leer JS de la pagina /objects para ver como llama a history/positions
        self.stdout.write("=== JS de /objects ===")
        r = session.get(f"{CUSAT_BASE}/objects", timeout=12)
        # Buscar bloques que mencionen history
        fragmentos = re.findall(r'.{200}history/positions.{200}', r.text, re.DOTALL)
        for f in fragmentos:
            self.stdout.write(f.replace("\n", " "))
        if not fragmentos:
            self.stdout.write("No encontrado en /objects, probando /objects/map...")
            r2 = session.get(f"{CUSAT_BASE}/objects/map", timeout=12)
            fragmentos2 = re.findall(r'.{200}history.{200}', r2.text, re.DOTALL)
            for f in fragmentos2[:3]:
                self.stdout.write(f.replace("\n", " "))

        # ── 2. Llamar /history/positions con TODOS los parametros posibles y ver respuesta raw
        self.stdout.write("\n=== /history/positions RAW ===")
        combos = [
            {"device_id": DEVICE_ID, "date": "2026-06-15"},
            {"device_id": DEVICE_ID, "date": "2026-06-15", "draw": 1, "start": 0, "length": 1000},
            {"object_id": DEVICE_ID, "date": "2026-06-15"},
            {"id": DEVICE_ID, "date": "2026-06-15"},
            {"device": DEVICE_ID, "date": "2026-06-15"},
            {"device_id": DEVICE_ID, "date_from": "2026-06-15 00:00:00", "date_to": "2026-06-15 23:59:59"},
            {"device_id": DEVICE_ID, "from": "2026-06-15 00:00:00", "to": "2026-06-15 23:59:59"},
            {"device_id": DEVICE_ID, "date": "15-06-2026"},
        ]
        for params in combos:
            try:
                r = session.get(
                    f"{CUSAT_BASE}/history/positions",
                    params=params,
                    headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
                    timeout=12,
                )
                self.stdout.write(f"\nParams: {params}")
                self.stdout.write(f"Status: {r.status_code} | CT: {r.headers.get('Content-Type','')[:50]}")
                self.stdout.write(f"Body: {r.text[:500]}")
            except Exception as e:
                self.stdout.write(f"ERROR {params}: {e}")

        # ── 3. Buscar archivos JS externos que mencionen history
        self.stdout.write("\n=== Buscando JS externos ===")
        r = session.get(f"{CUSAT_BASE}/objects", timeout=12)
        js_files = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', r.text)
        for js_url in js_files:
            if not js_url.startswith("http"):
                js_url = CUSAT_BASE + js_url
            try:
                rj = session.get(js_url, timeout=8)
                if "history" in rj.text.lower() and "positions" in rj.text.lower():
                    frags = re.findall(r'.{100}history.{100}', rj.text)
                    self.stdout.write(f"\n{js_url}:")
                    for f in frags[:5]:
                        self.stdout.write(f"  {f.replace(chr(10),' ')}")
            except Exception:
                pass

        self.stdout.write("\nListo.")

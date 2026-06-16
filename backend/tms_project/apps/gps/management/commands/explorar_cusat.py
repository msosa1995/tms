"""
Diagnostico v6: parsear HTML de /history/positions
Ejecutar: python manage.py explorar_cusat
"""
import re
from django.core.management.base import BaseCommand
from tms_project.gps_proxy import CUSAT_BASE, _get_session

DEVICE_ID = 76194


class Command(BaseCommand):
    help = "Diagnostico v6 - parsear HTML historial Cusat"

    def handle(self, *args, **kwargs):
        session = _get_session()
        self.stdout.write("Sesion OK\n")

        # ── 1. Fetch full HTML ────────────────────────────────────────────────
        params = {
            "device_id": DEVICE_ID,
            "from_date": "2026-06-14",
            "from_time": "00:00",
            "to_date": "2026-06-14",
            "to_time": "23:59",
            "draw": 1,
            "start": 0,
            "length": 500,
        }
        r = session.get(
            f"{CUSAT_BASE}/history/positions",
            params=params,
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=30,
        )
        self.stdout.write(f"Status: {r.status_code} | CT: {r.headers.get('Content-Type', '')}")
        html = r.text
        self.stdout.write(f"Total length: {len(html)} chars\n")

        # ── 2. Primeros 3000 chars (cabecera + primeras filas) ────────────────
        self.stdout.write("=== PRIMEROS 3000 CHARS ===")
        self.stdout.write(html[:3000])

        # ── 3. Buscar coordenadas lat/lng ─────────────────────────────────────
        coords = re.findall(r'q=([-\d.]+),([-\d.]+)', html)
        self.stdout.write(f"\n=== COORDENADAS encontradas: {len(coords)} ===")
        if coords:
            self.stdout.write(f"Primeras 5: {coords[:5]}")

        # ── 4. Buscar tiempos HH:MM:SS ───────────────────────────────────────
        times = re.findall(r'(\d{2}:\d{2}:\d{2})', html)
        self.stdout.write(f"\n=== TIEMPOS HH:MM:SS encontrados: {len(times)} ===")
        if times:
            self.stdout.write(f"Primeros 10: {times[:10]}")

        # ── 5. Buscar filas <tr> ──────────────────────────────────────────────
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)
        self.stdout.write(f"\n=== FILAS <tr> encontradas: {len(rows)} ===")

        # Mostrar la primera fila de datos (saltando header)
        for i, row in enumerate(rows[:5]):
            self.stdout.write(f"\n--- Fila {i} (primeros 800 chars) ---")
            self.stdout.write(row[:800])

        # ── 6. Buscar cualquier patron de coordenada alternativa ──────────────
        self.stdout.write("\n=== PATRONES lat= o latitude= ===")
        alt = re.findall(r'(?:lat|latitude)["\s:=]+(["-]?[-\d.]+)', html, re.IGNORECASE)
        self.stdout.write(f"Encontrados: {alt[:10]}")

        # ── 7. Ultimos 1000 chars ─────────────────────────────────────────────
        self.stdout.write("\n=== ULTIMOS 1000 CHARS ===")
        self.stdout.write(html[-1000:])

        # ── 8. Probar con fecha de hoy ────────────────────────────────────────
        self.stdout.write("\n=== PRUEBA CON HOY (2026-06-13) ===")
        params2 = {**params, "from_date": "2026-06-13", "to_date": "2026-06-13"}
        r2 = session.get(
            f"{CUSAT_BASE}/history/positions",
            params=params2,
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=30,
        )
        self.stdout.write(f"Status: {r2.status_code} | Length: {len(r2.text)}")
        coords2 = re.findall(r'q=([-\d.]+),([-\d.]+)', r2.text)
        self.stdout.write(f"Coordenadas hoy: {len(coords2)} | Primeras 3: {coords2[:3]}")

        self.stdout.write("\nListo.")

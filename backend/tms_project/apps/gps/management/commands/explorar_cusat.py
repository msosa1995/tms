"""
Explora endpoints de historial de Cusat GPS.
Ejecutar: python manage.py explorar_cusat
"""
import re
import json
import requests as req
from django.core.management.base import BaseCommand
from tms_project.gps_proxy import CUSAT_BASE, _get_session


class Command(BaseCommand):
    help = "Explora historial disponible en Cusat GPS"

    def handle(self, *args, **kwargs):
        session = _get_session()
        self.stdout.write("Sesion OK\n")

        # ── 1. Extraer el campo 'action' del HBK137 para obtener ID ──────────
        r = session.get(
            f"{CUSAT_BASE}/objects/list/data?draw=1&start=0&length=100",
            headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
            timeout=12,
        )
        data = r.json()
        objeto = next(
            (obj for obj in data.get("data", []) if "HBK137" in str(obj.get("name", ""))),
            None,
        )
        if not objeto:
            self.stdout.write("HBK137 no encontrado"); return

        action_html = objeto.get("action", "")
        self.stdout.write(f"ACTION HTML completo:\n{action_html}\n")

        # Extraer todos los numeros que parezcan IDs
        ids_encontrados = re.findall(r'[\'/\(\[](\d+)[\'\)/\]]', action_html)
        self.stdout.write(f"IDs encontrados en action: {ids_encontrados}\n")

        # ── 2. Explorar pagina /reports completa ─────────────────────────────
        r2 = session.get(f"{CUSAT_BASE}/reports", timeout=10)
        self.stdout.write(f"\n/reports HTML (primeros 2000 chars):\n{r2.text[:2000]}\n")

        # ── 3. Buscar endpoints en archivos JS ────────────────────────────────
        self.stdout.write("\nBuscando en pagina principal...")
        r3 = session.get(f"{CUSAT_BASE}/objects", timeout=10)
        # Buscar llamadas AJAX en el HTML
        ajax_urls = re.findall(r'url\s*[:\=]\s*["\']([^"\']+)["\']', r3.text)
        rutas_interesantes = [u for u in ajax_urls if any(k in u.lower() for k in
                              ["history", "route", "report", "position", "track", "log"])]
        self.stdout.write(f"URLs AJAX con datos historicos: {rutas_interesantes}\n")

        # ── 4. Probar endpoints con el ID extraido ───────────────────────────
        for obj_id in ids_encontrados[:3]:
            self.stdout.write(f"\nProbando con ID={obj_id}:")
            for ruta in [
                f"/objects/{obj_id}/history",
                f"/objects/{obj_id}/positions",
                f"/objects/{obj_id}/track",
                f"/objects/{obj_id}/route",
                f"/history/{obj_id}",
                f"/positions/{obj_id}",
            ]:
                try:
                    r = session.get(
                        f"{CUSAT_BASE}{ruta}",
                        params={"from": "2026-03-07", "to": "2026-03-07", "date": "2026-03-07"},
                        headers={"X-Requested-With": "XMLHttpRequest"},
                        timeout=6,
                    )
                    ct = r.headers.get("Content-Type", "")
                    snippet = r.text[:300].replace("\n", " ")
                    self.stdout.write(f"  {ruta} -> {r.status_code} | {ct[:30]} | {snippet}")
                except Exception as e:
                    self.stdout.write(f"  {ruta} -> ERROR: {e}")

        # ── 5. Probar endpoint de reportes con parametros ────────────────────
        self.stdout.write("\nProbando generacion de reportes...")
        for ruta in ["/reports/generate", "/reports/create", "/reports/show",
                     "/reports/export", "/reports/download"]:
            try:
                r = session.post(
                    f"{CUSAT_BASE}{ruta}",
                    data={"type": "route", "object": ids_encontrados[0] if ids_encontrados else "1",
                          "date_from": "2026-03-07", "date_to": "2026-03-07"},
                    headers={"X-Requested-With": "XMLHttpRequest"},
                    timeout=6,
                )
                self.stdout.write(f"  POST {ruta} -> {r.status_code} | {r.text[:200]}")
            except Exception as e:
                self.stdout.write(f"  POST {ruta} -> ERROR: {e}")

        self.stdout.write("\nListo.")

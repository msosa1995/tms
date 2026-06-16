"""
Comando de exploración: descubre el endpoint de historial de Cusat.
Ejecutar en Railway Console:
    python manage.py explorar_cusat
"""
import re
import json
import requests as req
from django.core.management.base import BaseCommand
from tms_project.gps_proxy import CUSAT_BASE, _get_session


RUTAS_CANDIDATAS = [
    "/reports/route/data",
    "/reports/stops/data",
    "/reports/trips/data",
    "/objects/history/data",
    "/history/data",
    "/positions/data",
    "/objects/positions",
    "/reports/general/data",
]


class Command(BaseCommand):
    help = "Explora los endpoints de historial disponibles en Cusat GPS"

    def handle(self, *args, **kwargs):
        self.stdout.write("Iniciando sesion en Cusat...")
        session = _get_session()

        # Paso 1: obtener el ID del objeto HBK137
        self.stdout.write("Buscando ID del HBK137...")
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
            self.stdout.write(self.style.ERROR("HBK137 no encontrado"))
            return

        # Extraer ID del campo DT_RowId o similar
        row_id = objeto.get("DT_RowId", "") or objeto.get("id", "")
        self.stdout.write(self.style.SUCCESS(f"HBK137 encontrado. DT_RowId={row_id}"))
        self.stdout.write(f"Campos disponibles: {list(objeto.keys())}")

        # Paso 2: buscar página de reportes para extraer formulario
        self.stdout.write("\nBuscando pagina de reportes...")
        for path in ["/reports", "/reports/route", "/history"]:
            try:
                r = session.get(f"{CUSAT_BASE}{path}", timeout=8)
                if r.status_code == 200 and len(r.text) > 500:
                    # Buscar inputs de fecha en el HTML
                    fechas = re.findall(r'name="([^"]*(?:date|from|to|start|end|fecha)[^"]*)"', r.text, re.I)
                    objetos_input = re.findall(r'name="([^"]*(?:object|device|unit)[^"]*)"', r.text, re.I)
                    self.stdout.write(self.style.SUCCESS(f"  {path} -> 200 OK"))
                    if fechas:
                        self.stdout.write(f"    Campos fecha: {fechas[:5]}")
                    if objetos_input:
                        self.stdout.write(f"    Campos objeto: {objetos_input[:5]}")
                    # Guardar snippet del HTML
                    snippet = r.text[:800].replace("\n", " ")
                    self.stdout.write(f"    Preview: {snippet[:300]}")
                else:
                    self.stdout.write(f"  {path} -> {r.status_code}")
            except Exception as e:
                self.stdout.write(f"  {path} -> ERROR: {e}")

        # Paso 3: probar endpoints de datos con parametros tipicos
        self.stdout.write("\nProbando endpoints de datos...")
        params_prueba = {
            "draw": 1, "start": 0, "length": 5,
            "date_from": "2026-03-07", "date_to": "2026-03-07",
            "from": "2026-03-07", "to": "2026-03-07",
            "object_id": row_id,
        }
        for ruta in RUTAS_CANDIDATAS:
            try:
                r = session.get(
                    f"{CUSAT_BASE}{ruta}",
                    params=params_prueba,
                    headers={"Accept": "application/json", "X-Requested-With": "XMLHttpRequest"},
                    timeout=8,
                )
                ct = r.headers.get("Content-Type", "")
                if r.status_code == 200 and "json" in ct:
                    snippet = r.text[:400]
                    self.stdout.write(self.style.SUCCESS(f"  {ruta} -> 200 JSON: {snippet}"))
                else:
                    self.stdout.write(f"  {ruta} -> {r.status_code} ({ct[:40]})")
            except Exception as e:
                self.stdout.write(f"  {ruta} -> ERROR: {e}")

        self.stdout.write("\nExploracion completa.")

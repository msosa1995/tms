"""
Carga los ingresos semanales reales desde el Excel de ALAS.
Ejecutar: python load_ingresos.py
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tms_project.settings.local")
django.setup()

from tms_project.apps.ingresos.models import Ingreso
from tms_project.apps.clientes.models import Cliente

SEMANAS = [
    ("W1 MAR",  "2025-03-24", 2860000),
    ("W2 MAR",  "2025-03-31", 3740000),
    ("W3 MAR",  "2025-04-07", 3832000),
    ("W4 ABR",  "2025-04-14", 2860000),
    ("W5 ABR",  "2025-04-21", 2220000),
    ("W6 ABR",  "2025-04-28", 2160000),
    ("W7 ABR",  "2025-05-05", 1460000),
    ("W8 MAY",  "2025-05-12", 2980000),
    ("W9 MAY",  "2025-05-19", 3040000),
    ("W10 MAY", "2025-05-26", 2660000),
    ("W11 MAY", "2025-06-02", 2920000),
    ("W12 MAY", "2025-06-09", 2160000),
    ("W13 JUN", "2025-06-16", 1560000),
    ("W14 JUN", "2025-06-23", 2940000),
    ("W15 JUN", "2025-06-30", 3060000),
    ("W16 JUN", "2025-07-07", 3720000),
    ("W17 JUL", "2025-07-14", 3780000),
    ("W18 JUL", "2025-07-21", 3840000),
    ("W19 JUL", "2025-07-28", 3780000),
    ("W20 JUL", "2025-08-04", 3900000),
    ("W21 JUL", "2025-08-11", 5280000),
    ("W22 AGO", "2025-08-18", 4380000),
    ("W23 AGO", "2025-08-25", 3780000),
    ("W24 AGO", "2025-09-01", 3780000),
    ("W25 AGO", "2025-09-08", 4560000),
    ("W26 SET", "2025-09-15", 3660000),
    ("W27 SET", "2025-09-22", 4440000),
    ("W28 SET", "2025-09-29", 4440000),
    ("W29 SET", "2025-10-06", 3780000),
    ("W30 OCT", "2025-10-13", 4380000),
    ("W31 OCT", "2025-10-20", 5220000),
    ("W32 OCT", "2025-10-27", 3000000),
    ("W33 OCT", "2025-11-03", 4380000),
    ("W34 OCT", "2025-11-10", 4560000),
    ("W35 NOV", "2025-11-17", 3720000),
    ("W36 NOV", "2025-11-24", 3780000),
    ("W37 NOV", "2025-12-01", 3660000),
    ("W38 NOV", "2025-12-08", 5160000),
    ("W39 DIC", "2025-12-15", 3120000),
    ("W40 DIC", "2025-12-22", 4380000),
    ("W41 DIC", "2025-12-29", 4440000),
    ("W42 DIC", "2026-01-05", 2340000),
    ("W1 ENE",  "2026-01-12", 2160000),
    ("W2 ENE",  "2026-01-19", 4440000),
    ("W3 ENE",  "2026-01-26", 5940000),
    ("W4 ENE",  "2026-02-02", 4320000),
    ("W5 FEB",  "2026-02-09", 5400000),
    ("W18 MAY", "2026-05-11", 3000000),
]

cliente = Cliente.objects.filter(razon_social__icontains="ALAS").first()
if not cliente:
    cliente = Cliente.objects.first()

if not cliente:
    print("ERROR: No hay clientes en la base de datos. Ejecuta reset_data.py primero.")
    exit(1)

# Eliminar ingresos existentes
eliminados = Ingreso.objects.all().delete()
print(f"Eliminados: {eliminados[0]} ingresos anteriores")

# Cargar semanas
creados = 0
for semana, fecha, monto in SEMANAS:
    Ingreso.objects.create(
        cliente=cliente,
        fecha=fecha,
        monto=monto,
        moneda="PYG",
        forma_pago="transferencia",
        observaciones=semana,
    )
    creados += 1
    print(f"  OK {semana} | {fecha} | {monto:,} PYG")

total = sum(m for _, _, m in SEMANAS)
print(f"\nTotal cargado: {creados} semanas | ₲ {total:,}")

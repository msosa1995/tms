"""
Borra datos de seed y carga datos reales de ALAS/camion.
"""
import os, sys
os.environ["DJANGO_SETTINGS_MODULE"] = "tms_project.settings.local"
sys.path.insert(0, r"c:\Users\msosa\Desktop\PROYECTOS\Proyecto_Camion\tms\backend")
import django; django.setup()

from django.contrib.auth import get_user_model
from tms_project.apps.vehiculos.models import Vehiculo
from tms_project.apps.choferes.models import Chofer
from tms_project.apps.clientes.models import Cliente
from tms_project.apps.viajes.models import Viaje
from tms_project.apps.ingresos.models import Ingreso, Gasto
from datetime import date

User = get_user_model()

# ── 1. Borrar datos genéricos ────────────────────────────────────────────────
print("Borrando datos de seed...")
Gasto.objects.all().delete()
Ingreso.objects.all().delete()
Viaje.objects.all().delete()
Cliente.objects.all().delete()
Chofer.objects.all().delete()
Vehiculo.objects.all().delete()
# Borrar usuarios genericos excepto sosaro
User.objects.exclude(username="sosaro").delete()
print("  Datos borrados.")

# ── 2. Usuario sosaro como admin ─────────────────────────────────────────────
user = User.objects.get(username="sosaro")

# ── 3. Vehículo real ─────────────────────────────────────────────────────────
v = Vehiculo.objects.create(
    patente="BHG-472",
    marca="Scania",
    modelo="R 450",
    anio=2019,
    capacidad_kg=28000,
    numero_chasis="9BSM6X4X0KB688972",
)
print(f"  Vehiculo: {v.patente}")

# ── 4. Chofer ────────────────────────────────────────────────────────────────
ch = Chofer.objects.create(
    nombre="Roberto",
    apellido="Penayo",
    documento="4123456",
    telefono="0981-555001",
    direccion="Asuncion, Paraguay",
    fecha_ingreso=date(2021, 1, 1),
)
print(f"  Chofer: {ch.nombre} {ch.apellido}")

# ── 5. Cliente principal: ALAS ───────────────────────────────────────────────
alas = Cliente.objects.create(
    razon_social="ALAS S.A.",
    ruc="80099999-0",
    contacto="Administracion ALAS",
    telefono="021-000001",
    email="admin@alas.com.py",
    direccion="Asuncion, Paraguay",
)
print(f"  Cliente: {alas.razon_social}")

# ── 6. Ingresos mensuales reales (facturacion de ALAS) ───────────────────────
ingresos_reales = [
    # (fecha_cobro, monto_total, periodo)
    (date(2025, 12, 31), 14_280_000, "Diciembre 2025"),
    (date(2026, 1, 31),  16_860_000, "Enero 2026"),
    (date(2026, 2, 28),  17_940_000, "Febrero 2026"),
    (date(2026, 3, 31),  20_580_000, "Marzo 2026"),
]

for fecha, monto, obs in ingresos_reales:
    Ingreso.objects.create(
        cliente=alas,
        fecha=fecha,
        monto=monto,
        moneda="PYG",
        forma_pago="transferencia",
        observaciones=obs,
        created_by=user,
    )
print(f"  Ingresos: {len(ingresos_reales)} registros")

# ── 7. Gastos reales desde el Excel (hoja 1) ─────────────────────────────────
# Datos extraídos manualmente de las imagenes del Excel
gastos_raw = [
    # (fecha, monto, concepto, categoria)
    (date(2025,  3, 10), 350_000,  "ESCRIBANIA",          "impuestos"),
    (date(2025,  3, 10), 120_000,  "LAVADO",              "otros"),
    (date(2025,  3, 17), 160_000,  "LATERO",              "reparaciones"),
    (date(2025,  3, 19),  90_000,  "TAPICERIA",           "otros"),
    (date(2025,  3, 19), 315_000,  "ACEITE",              "combustible"),
    (date(2025,  3, 19),  90_000,  "ACEITE",              "combustible"),
    (date(2025,  3, 19),   8_000,  "FRANELA",             "otros"),
    (date(2025,  3, 28), 308_000,  "MULTA",               "impuestos"),
    (date(2025,  4,  2), 160_000,  "POMO",                "otros"),
    (date(2025,  4,  2), 150_000,  "PENAYO",              "viaticos"),
    (date(2025,  4,  5), 130_000,  "LAVADO",              "otros"),
    (date(2025,  4,  5), 130_000,  "LAVADO",              "otros"),
    (date(2025,  4,  6), 150_000,  "CASTE",               "otros"),
    (date(2025,  4,  8), 100_000,  "PENAYO",              "viaticos"),
    (date(2025,  4,  9), 180_000,  "LUCES BOCINA",        "reparaciones"),
    (date(2025,  4, 13),  50_000,  "FERRETERIA",          "reparaciones"),
    (date(2025,  4, 14),  50_000,  "ELECTRICISTA",        "reparaciones"),
    (date(2025,  4, 16),  70_000,  "ELECTRICISTA",        "reparaciones"),
    (date(2025,  4, 27), 300_000,  "ESCRIBANIA",          "impuestos"),
    (date(2025,  5,  2),  80_000,  "MAGUERA BOCINA",      "reparaciones"),
    (date(2025,  5,  2),  80_000,  "ELECTRICISTA",        "reparaciones"),
    (date(2025,  5,  2),  50_000,  "REGALO",              "otros"),
    (date(2025,  5,  2),  14_000,  "AGUA",                "viaticos"),
    (date(2025,  5,  2),  50_000,  "MERIENDA",            "viaticos"),
    (date(2025,  5, 20), 440_000,  "MECANICO",            "reparaciones"),
    (date(2025,  5, 20), 130_000,  "PENAYO",              "viaticos"),
    (date(2025,  6,  2), 100_000,  "GPS",                 "otros"),
    (date(2025,  6,  2), 7_300_000,"BOMBA",               "reparaciones"),
    (date(2025,  6,  9), 560_000,  "BATERIA",             "reparaciones"),
    (date(2025,  6, 17), 100_000,  "INTERES DAVID",       "viaticos"),
    (date(2025,  6, 17), 140_000,  "GPS",                 "otros"),
    (date(2025,  6, 20), 245_000,  "MECANICO",            "reparaciones"),
    (date(2025,  6, 22), 150_000,  "TAPIZADO",            "otros"),
    (date(2025,  6, 24), 100_000,  "INTERES DAVID",       "viaticos"),
    (date(2025,  6, 24), 140_000,  "GPS",                 "otros"),
    (date(2025,  6, 24), 198_000,  "HABITACION",          "viaticos"),
    (date(2025,  6, 28), 200_000,  "PENAYO",              "viaticos"),
    (date(2025,  7,  1), 100_000,  "ESM",                 "otros"),
    (date(2025,  7,  1), 200_000,  "PENAYO",              "viaticos"),
    (date(2025,  7,  3), 175_000,  "CUSAT GPS",           "otros"),
    (date(2025,  7,  5), 175_000,  "CUSAT GPS",           "otros"),
    (date(2025,  7,  7), 122_500,  "CUSAT GPS",           "otros"),
    (date(2025,  7,  9), 100_000,  "CORREA",              "reparaciones"),
    (date(2025,  7, 12), 100_000,  "GOMERIA",             "neumaticos"),
    (date(2025,  7, 14),  84_000,  "GOMERIA",             "neumaticos"),
    (date(2025,  7, 14), 200_000,  "PENAYO",              "viaticos"),
    (date(2025,  7, 14), 140_000,  "GPS",                 "otros"),
    (date(2025,  7, 14),  35_000,  "AGUA",                "viaticos"),
    (date(2025,  7, 19), 200_000,  "PENAYO",              "viaticos"),
    (date(2025,  7, 23),  35_000,  "AGUA",                "viaticos"),
    (date(2025,  7, 26), 300_000,  "IVA",                 "impuestos"),
    (date(2025,  7, 26), 210_000,  "IVA",                 "impuestos"),
    (date(2025,  7, 28), 1_155_000,"DINATRAN",            "impuestos"),
    (date(2025,  7, 30), 560_000,  "BATERIA",             "reparaciones"),
    (date(2025,  7, 30), 210_000,  "IVA",                 "impuestos"),
    (date(2025,  8,  1), 150_000,  "GPS CUSAT",           "otros"),
    (date(2025,  8,  3), 200_000,  "PARRILLA CAMIO",      "reparaciones"),
    (date(2025,  8,  8), 1_155_000,"FARO TRASERO - COCA", "reparaciones"),
    (date(2025,  8,  9),  250_000,  "FLUIDO - ACEITE",    "combustible"),
    (date(2025,  8, 16), 150_000,  "SOPORTE ALTERNADOR",  "reparaciones"),
    (date(2025,  8, 16), 250_000,  "PENAYO",              "viaticos"),
    (date(2025,  8, 16), 250_000,  "ALTERNADOR",          "reparaciones"),
    (date(2025,  8, 28), 100_000,  "BIDON - BOLT",        "reparaciones"),
    (date(2025,  9, 11), 150_000,  "MACANICO ACELERADOR", "reparaciones"),
    (date(2025,  9, 11), 100_000,  "ELECTRICISTA",        "reparaciones"),
    (date(2025,  9, 11), 100_000,  "FLUIDO - ALMUERZO",   "combustible"),
    (date(2025,  9, 13), 175_000,  "PENAYO",              "viaticos"),
    (date(2025,  9, 13),  75_000,  "TAPA COMBUS",         "reparaciones"),
    (date(2025,  9, 20),  60_000,  "TAPA COMBUS",         "reparaciones"),
    (date(2025,  9, 23),  75_000,  "PLUS CHOFER",         "viaticos"),
    (date(2025,  9, 25), 140_000,  "GPS",                 "otros"),
    (date(2025,  9, 25),  75_000,  "PLUS CHOFER",         "viaticos"),
    (date(2025, 10,  4),  75_000,  "GPS",                 "otros"),
    (date(2025, 10, 11),  90_000,  "LAVADO",              "otros"),
    (date(2025, 10, 11),  52_500,  "REPUESTO 2 LITROS",   "combustible"),
    (date(2025, 10, 18), 250_000,  "PENAYO",              "viaticos"),
    (date(2025, 10, 20),  75_000,  "PLUS CHOFER",         "viaticos"),
    (date(2025, 10, 28), 920_000,  "MANTENIMIENTO",       "mantenimiento"),
    (date(2025, 11,  1), 200_000,  "PENAYO",              "viaticos"),
    (date(2025, 11,  1), 350_000,  "FACTURA PARA IVA",    "impuestos"),
    (date(2025, 11,  8), 200_000,  "PENAYO",              "viaticos"),
    (date(2025, 11, 13), 110_000,  "FOCOS",               "reparaciones"),
    (date(2025, 11, 13), 200_000,  "GOMERIA",             "neumaticos"),
    (date(2025, 11, 21),  84_000,  "GOMERIA",             "neumaticos"),
    (date(2025, 11, 21), 350_000,  "MECANICO ELASTICO",   "reparaciones"),
    (date(2025, 11, 29), 300_000,  "PENAYO",              "viaticos"),
    (date(2025, 12,  2), 200_000,  "MULTA CHAPA",         "impuestos"),
    (date(2025, 12,  6), 200_000,  "PENAYO",              "viaticos"),
    (date(2025, 12, 10), 420_000,  "PENAYO",              "viaticos"),
    (date(2025, 12, 20), 175_000,  "PENAYO",              "viaticos"),
    (date(2025, 12, 27), 200_000,  "PENAYO",              "viaticos"),
    (date(2025, 12, 27), 140_000,  "GPS",                 "otros"),
    (date(2026,  1,  1), 500_000,  "CANASTAS Y REGALOS",  "otros"),
    (date(2026,  1, 10), 420_000,  "PENAYO",              "viaticos"),
    (date(2026,  1, 17), 350_000,  "PENAYO",              "viaticos"),
    (date(2026,  1, 26), 500_000,  "CUBIERTA",            "neumaticos"),
    (date(2026,  2,  5), 500_000,  "CUBIERTA",            "neumaticos"),
    (date(2026,  2, 17), 350_000,  "PENAYO",              "viaticos"),
    (date(2026,  2, 28), 300_000,  "ACEITE Y FRENO",      "combustible"),
    (date(2026,  3,  5), 250_000,  "PENAYO",              "viaticos"),
    (date(2026,  3, 13), 250_000,  "PENAYO",              "viaticos"),
    (date(2026,  3, 21), 300_000,  "PENAYO",              "viaticos"),
    (date(2026,  3, 25), 250_000,  "HERRAMIENTAS",        "reparaciones"),
    (date(2026,  4,  3), 1_700_000,"CAMBIO PICOS",        "reparaciones"),
]

cnt = 0
for fecha, monto, concepto, categoria in gastos_raw:
    Gasto.objects.create(
        fecha=fecha,
        monto=monto,
        descripcion=concepto,
        categoria=categoria,
        moneda="PYG",
        vehiculo=v,
        created_by=user,
    )
    cnt += 1
print(f"  Gastos: {cnt} registros")

print("\nLISTO. Resumen:")
print(f"  Vehiculos:  {Vehiculo.objects.count()}")
print(f"  Choferes:   {Chofer.objects.count()}")
print(f"  Clientes:   {Cliente.objects.count()}")
print(f"  Ingresos:   {Ingreso.objects.count()}")
print(f"  Gastos:     {Gasto.objects.count()}")

#!/usr/bin/env python
"""
scripts/seed_data.py — Carga inicial de datos de prueba
Ejecutar: python manage.py shell < scripts/seed_data.py
"""
import os
import sys
import django
from datetime import date, timedelta
import random

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tms_project.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from tms_project.apps.vehiculos.models import Vehiculo, EstadoVehiculo
from tms_project.apps.choferes.models import Chofer, EstadoChofer
from tms_project.apps.clientes.models import Cliente
from tms_project.apps.viajes.models import Viaje, EstadoViaje
from tms_project.apps.ingresos.models import Ingreso, Gasto, CategoriaGasto, FormaPago

User = get_user_model()

print("🚛 Iniciando carga de datos de prueba para TMS...")

# ——— Usuarios ——————————————————————————————————————————
print("  → Creando usuarios...")
admin = User.objects.create_superuser(
    username="admin",
    email="admin@tms.local",
    password="Admin1234!",
    first_name="Administrador",
    last_name="Sistema",
    rol="administrador",
)

supervisor = User.objects.create_user(
    username="supervisor",
    email="supervisor@tms.local",
    password="Supervisor1!",
    first_name="Carlos",
    last_name="Rodríguez",
    rol="supervisor",
)

operador = User.objects.create_user(
    username="operador",
    email="operador@tms.local",
    password="Operador1!",
    first_name="Ana",
    last_name="González",
    rol="operador",
)

auditor = User.objects.create_user(
    username="auditor",
    email="auditor@tms.local",
    password="Auditor1!",
    first_name="Luis",
    last_name="Martínez",
    rol="auditor",
)

# ——— Vehículo ———————————————————————————————————————————
print("  → Creando vehículo...")
vehiculo = Vehiculo.objects.create(
    patente="ABC-123",
    marca="Mercedes-Benz",
    modelo="Actros 2651",
    anio=2020,
    capacidad_kg=25000,
    numero_chasis="WDB9634031L123456",
    estado=EstadoVehiculo.ACTIVO,
)

# ——— Choferes ————————————————————————————————————————————
print("  → Creando choferes...")
choferes = []
datos_choferes = [
    ("Roberto", "Cabañas", "3456789", "0981-123456", "Asunción, PY"),
    ("Diego", "Benítez", "4567890", "0982-234567", "San Lorenzo, PY"),
]
for nombre, apellido, doc, tel, dir in datos_choferes:
    ch = Chofer.objects.create(
        nombre=nombre,
        apellido=apellido,
        documento=doc,
        telefono=tel,
        direccion=dir,
        fecha_ingreso=date(2021, 1, 15),
        estado=EstadoChofer.ACTIVO,
    )
    choferes.append(ch)

# ——— Clientes ————————————————————————————————————————————
print("  → Creando clientes...")
clientes_data = [
    ("Constructora del Norte S.A.", "80012345-6", "Juan García", "021-123456", "juan@constructora.com.py", "Av. Mcal. López 1234, Asunción"),
    ("Industrias Guaraní S.R.L.", "80056789-0", "María López", "021-654321", "mlopez@guarani.com.py", "Ruta 2 Km 15, Capiatá"),
    ("Agroquímica Ñemby S.A.", "80078901-2", "Pedro Ruiz", "021-987654", "pedro@agroquimica.com.py", "Ñemby, Central"),
    ("Distribuidora Central S.A.", "80034567-8", "Laura Sosa", "021-111222", "lsosa@distribuidora.com.py", "San Lorenzo, PY"),
]
clientes = []
for rs, ruc, ct, tel, email, dir in clientes_data:
    c = Cliente.objects.create(
        razon_social=rs, ruc=ruc, contacto=ct,
        telefono=tel, email=email, direccion=dir,
    )
    clientes.append(c)

# ——— Viajes + Ingresos + Gastos ——————————————————————————
print("  → Generando 12 meses de viajes, ingresos y gastos...")
hoy = date.today()
viajes_creados = []

for mes_offset in range(12):
    mes_inicio = (hoy.replace(day=1) - timedelta(days=30 * mes_offset))
    for semana in range(4):
        fecha_salida = mes_inicio + timedelta(days=semana * 7 + random.randint(0, 2))
        fecha_regreso = fecha_salida + timedelta(days=random.randint(1, 3))
        if fecha_regreso > hoy:
            continue

        cliente = random.choice(clientes)
        chofer = random.choice(choferes)
        rutas = [
            ("Asunción", "Ciudad del Este"),
            ("Asunción", "Encarnación"),
            ("Asunción", "Concepción"),
            ("Ciudad del Este", "Asunción"),
        ]
        origen, destino = random.choice(rutas)
        km_base = 350 if "Ciudad del Este" in (origen, destino) else 280

        km_ini = (sum(v.km_finales or 0 for v in viajes_creados) or 150000) + random.randint(0, 50)
        km_fin = km_ini + km_base + random.randint(-30, 80)

        viaje = Viaje.objects.create(
            vehiculo=vehiculo,
            chofer=chofer,
            cliente=cliente,
            fecha_salida=fecha_salida,
            fecha_regreso=fecha_regreso,
            origen=origen,
            destino=destino,
            km_iniciales=km_ini,
            km_finales=km_fin,
            estado=EstadoViaje.FINALIZADO,
            created_by=operador,
        )
        viajes_creados.append(viaje)

        # Ingreso por flete
        monto_flete = random.randint(1_500_000, 4_500_000)  # Guaraníes
        Ingreso.objects.create(
            viaje=viaje,
            cliente=cliente,
            fecha=fecha_regreso,
            monto=monto_flete,
            moneda="PYG",
            forma_pago=random.choice(list(FormaPago.values)),
            numero_factura=f"001-001-{random.randint(100000, 999999)}",
            created_by=operador,
        )

        # Gastos
        distancia = km_fin - km_ini
        Gasto.objects.create(
            viaje=viaje,
            fecha=fecha_salida,
            categoria=CategoriaGasto.COMBUSTIBLE,
            monto=int(distancia * random.randint(2200, 2800)),  # ~₲2500/km
            descripcion=f"Combustible para viaje {viaje.numero_viaje}",
            created_by=operador,
        )
        if random.random() > 0.5:
            Gasto.objects.create(
                viaje=viaje,
                fecha=fecha_salida,
                categoria=CategoriaGasto.PEAJES,
                monto=random.randint(80_000, 200_000),
                descripcion=f"Peajes ruta {origen}-{destino}",
                created_by=operador,
            )
        Gasto.objects.create(
            viaje=viaje,
            fecha=fecha_salida,
            categoria=CategoriaGasto.VIATICOS,
            monto=random.randint(150_000, 350_000),
            descripcion="Viáticos chofer",
            created_by=operador,
        )

print(f"\n✅ Carga completada:")
print(f"   Usuarios: 4 | Vehículos: 1 | Choferes: {len(choferes)}")
print(f"   Clientes: {len(clientes)} | Viajes: {len(viajes_creados)}")
print(f"\n🔐 Credenciales de acceso:")
print(f"   admin@tms.local / Admin1234!")
print(f"   supervisor@tms.local / Supervisor1!")
print(f"   operador@tms.local / Operador1!")
print(f"   auditor@tms.local / Auditor1!")

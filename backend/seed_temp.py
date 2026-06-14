import os, sys
os.environ["DJANGO_SETTINGS_MODULE"] = "tms_project.settings.local"
sys.path.insert(0, r"c:\Users\msosa\Desktop\PROYECTOS\Proyecto_Camion\tms\backend")
import django; django.setup()

from django.contrib.auth import get_user_model
from tms_project.apps.vehiculos.models import Vehiculo
from tms_project.apps.choferes.models import Chofer
from tms_project.apps.clientes.models import Cliente
from tms_project.apps.viajes.models import Viaje, EstadoViaje
from tms_project.apps.ingresos.models import Ingreso, Gasto
from datetime import date, timedelta
import random

User = get_user_model()
if not User.objects.filter(email="admin@tms.local").exists():
    admin = User.objects.create_superuser(username="admin", email="admin@tms.local", password="Admin1234!", first_name="Administrador", last_name="Sistema", rol="administrador")
    operador = User.objects.create_user(username="operador", email="operador@tms.local", password="Operador1!", first_name="Ana", last_name="Gonzalez", rol="operador")
    print("Usuarios creados")
else:
    admin = User.objects.get(email="admin@tms.local")
    operador = User.objects.get(email="operador@tms.local")
    print("Usuarios ya existen")

v, _ = Vehiculo.objects.get_or_create(patente="ABC-123", defaults=dict(marca="Mercedes-Benz", modelo="Actros 2651", anio=2020, capacidad_kg=25000, numero_chasis="WDB9634031L123456"))
ch1, _ = Chofer.objects.get_or_create(documento="3456789", defaults=dict(nombre="Roberto", apellido="Cabanhas", telefono="0981-123456", direccion="Asuncion, PY", fecha_ingreso=date(2021,1,15)))
ch2, _ = Chofer.objects.get_or_create(documento="4567890", defaults=dict(nombre="Diego", apellido="Benitez", telefono="0982-234567", direccion="San Lorenzo, PY", fecha_ingreso=date(2021,1,15)))
c1, _ = Cliente.objects.get_or_create(ruc="80012345-6", defaults=dict(razon_social="Constructora del Norte SA", contacto="Juan Garcia", telefono="021-123456", email="juan@c.py", direccion="Asuncion"))
c2, _ = Cliente.objects.get_or_create(ruc="80056789-0", defaults=dict(razon_social="Industrias Guarani SRL", contacto="Maria Lopez", telefono="021-654321", email="ml@g.py", direccion="Capiata"))
c3, _ = Cliente.objects.get_or_create(ruc="80034567-8", defaults=dict(razon_social="Distribuidora Central SA", contacto="Laura Sosa", telefono="021-111222", email="ls@d.py", direccion="San Lorenzo"))
print("Datos maestros listos")

hoy = date.today(); cnt = 0
for mes in range(6):
    base = hoy.replace(day=1) - timedelta(days=30*mes)
    for sem in range(3):
        fd = base + timedelta(days=sem*7+random.randint(0,2))
        fr = fd + timedelta(days=random.randint(1,3))
        if fr > hoy: continue
        cl = random.choice([c1,c2,c3]); ch = random.choice([ch1,ch2])
        ori, dst = random.choice([("Asuncion","Ciudad del Este"),("Asuncion","Encarnacion"),("Ciudad del Este","Asuncion")])
        km_i = 150000 + Viaje.objects.count()*360 + random.randint(0,50)
        km_f = km_i + 350 + random.randint(-20,80)
        viaje = Viaje.objects.create(vehiculo=v,chofer=ch,cliente=cl,fecha_salida=fd,fecha_regreso=fr,origen=ori,destino=dst,km_iniciales=km_i,km_finales=km_f,estado=EstadoViaje.FINALIZADO,created_by=operador)
        Ingreso.objects.create(viaje=viaje,cliente=cl,fecha=fr,monto=random.randint(1500000,4500000),moneda="PYG",forma_pago=random.choice(["efectivo","transferencia","cheque"]),numero_factura=f"001-001-{random.randint(100000,999999)}",created_by=operador)
        Gasto.objects.create(viaje=viaje,fecha=fd,categoria="combustible",monto=int(350*random.randint(2200,2800)),descripcion="Combustible",created_by=operador)
        Gasto.objects.create(viaje=viaje,fecha=fd,categoria="viaticos",monto=random.randint(150000,350000),descripcion="Viaticos",created_by=operador)
        cnt += 1

print(f"Viajes creados: {cnt}")
print("LISTO")

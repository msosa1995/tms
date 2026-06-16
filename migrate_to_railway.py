"""
Script de migración: SQLite local -> Railway PostgreSQL
Ejecutar desde la carpeta tms/ con el venv del backend activo
"""
import os, sys, django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ['DJANGO_SETTINGS_MODULE'] = 'tms_project.settings.local'
django.setup()

import psycopg2
from decimal import Decimal
from tms_project.apps.vehiculos.models import Vehiculo
from tms_project.apps.choferes.models import Chofer
from tms_project.apps.clientes.models import Cliente
from tms_project.apps.ingresos.models import Ingreso, Gasto, CargaCombustible

# ── Conexión Railway ──────────────────────────────────────────────
RAILWAY_URL = "postgresql://postgres:TRqaGiNKsCHBIzJGRpsgASOdmLHZWMQa@thomas.proxy.rlwy.net:35481/railway"
conn = psycopg2.connect(RAILWAY_URL)
conn.autocommit = False
cur = conn.cursor()

try:
    # Deshabilitar checks de FK temporalmente para poder borrar en cualquier orden
    cur.execute("SET session_replication_role = 'replica'")

    # ── 1. Vehículos ─────────────────────────────────────────────
    print("Migrando vehículos...")
    cur.execute("DELETE FROM vehiculos_vehiculo")
    for v in Vehiculo.objects.all():
        cur.execute("""
            INSERT INTO vehiculos_vehiculo
              (id, patente, marca, modelo, anio, capacidad_kg, numero_chasis,
               estado, observaciones, fecha_alta, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING
        """, (v.id, v.patente, v.marca, v.modelo, v.anio, v.capacidad_kg,
              v.numero_chasis, v.estado, v.observaciones, v.fecha_alta,
              v.created_at, v.updated_at))
    print(f"  -> {Vehiculo.objects.count()} vehículos")

    # ── 2. Choferes ──────────────────────────────────────────────
    print("Migrando choferes...")
    cur.execute("DELETE FROM choferes_chofer")
    for c in Chofer.objects.all():
        cur.execute("""
            INSERT INTO choferes_chofer
              (id, nombre, apellido, documento, telefono, email, direccion,
               licencia_numero, licencia_vencimiento, fecha_ingreso,
               estado, observaciones, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING
        """, (c.id, c.nombre, c.apellido, c.documento, c.telefono, c.email,
              c.direccion, c.licencia_numero, c.licencia_vencimiento,
              c.fecha_ingreso, c.estado, c.observaciones,
              c.created_at, c.updated_at))
    print(f"  -> {Chofer.objects.count()} choferes")

    # ── 3. Clientes ──────────────────────────────────────────────
    print("Migrando clientes...")
    cur.execute("DELETE FROM clientes_cliente")
    for c in Cliente.objects.all():
        cur.execute("""
            INSERT INTO clientes_cliente
              (id, razon_social, ruc, contacto, telefono, email,
               direccion, activo, observaciones, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING
        """, (c.id, c.razon_social, c.ruc, c.contacto, c.telefono, c.email,
              c.direccion, c.activo, c.observaciones, c.created_at, c.updated_at))
    print(f"  -> {Cliente.objects.count()} clientes")

    # ── 4. Ingresos ──────────────────────────────────────────────
    print("Migrando ingresos...")
    cur.execute("DELETE FROM ingresos_ingreso")
    for i in Ingreso.objects.all():
        cur.execute("""
            INSERT INTO ingresos_ingreso
              (id, viaje_id, cliente_id, fecha, monto, moneda, forma_pago,
               numero_factura, observaciones, created_by_id, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING
        """, (i.id, i.viaje_id, i.cliente_id, i.fecha, i.monto, i.moneda,
              i.forma_pago, i.numero_factura, i.observaciones,
              i.created_by_id, i.created_at, i.updated_at))
    print(f"  -> {Ingreso.objects.count()} ingresos")

    # ── 5. Gastos ────────────────────────────────────────────────
    print("Migrando gastos...")
    cur.execute("DELETE FROM ingresos_gasto")
    for g in Gasto.objects.all():
        cur.execute("""
            INSERT INTO ingresos_gasto
              (id, viaje_id, vehiculo_id, fecha, categoria, monto, moneda,
               numero_comprobante, descripcion, proveedor,
               created_by_id, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING
        """, (g.id, g.viaje_id, g.vehiculo_id, g.fecha, g.categoria, g.monto,
              g.moneda, g.numero_comprobante, g.descripcion, g.proveedor,
              g.created_by_id, g.created_at, g.updated_at))
    print(f"  -> {Gasto.objects.count()} gastos")

    # ── 6. Combustible ───────────────────────────────────────────
    print("Migrando cargas de combustible...")
    cur.execute("DELETE FROM ingresos_cargacombustible")
    for c in CargaCombustible.objects.all():
        cur.execute("""
            INSERT INTO ingresos_cargacombustible
              (id, fecha, litros, monto, observaciones, created_by_id, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING
        """, (c.id, c.fecha, c.litros, c.monto, c.observaciones,
              c.created_by_id, c.created_at))
    print(f"  -> {CargaCombustible.objects.count()} cargas")

    # Rehabilitar checks de FK
    cur.execute("SET session_replication_role = 'origin'")

    # ── Actualizar secuencias PostgreSQL ─────────────────────────
    for table, seq in [
        ("vehiculos_vehiculo", "vehiculos_vehiculo_id_seq"),
        ("choferes_chofer",    "choferes_chofer_id_seq"),
        ("clientes_cliente",   "clientes_cliente_id_seq"),
        ("ingresos_ingreso",   "ingresos_ingreso_id_seq"),
        ("ingresos_gasto",     "ingresos_gasto_id_seq"),
        ("ingresos_cargacombustible", "ingresos_cargacombustible_id_seq"),
    ]:
        cur.execute(f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM {table}), 1))")

    conn.commit()
    print("\nOK Migración completa. Todos los datos cargados en Railway.")

except Exception as e:
    conn.rollback()
    print(f"\nERROR Error: {e}")
    raise
finally:
    cur.close()
    conn.close()

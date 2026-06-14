"""
tests/ — Pruebas unitarias e integración del sistema TMS
Ejecutar: pytest --cov=tms_project --cov-report=html
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status


# ============================================================
# FIXTURES
# ============================================================

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def crear_usuario(db):
    from django.contrib.auth import get_user_model
    User = get_user_model()

    def _crear(rol="operador", **kwargs):
        defaults = {
            "username": f"user_{rol}",
            "email": f"{rol}@test.local",
            "password": "TestPass1!",
            "first_name": "Test",
            "last_name": "User",
            "rol": rol,
        }
        defaults.update(kwargs)
        user = User.objects.create_user(**defaults)
        return user
    return _crear


@pytest.fixture
def admin_client(db, api_client, crear_usuario):
    admin = crear_usuario(rol="administrador", username="admin_test", email="admin@test.local")
    api_client.force_authenticate(user=admin)
    return api_client, admin


@pytest.fixture
def operador_client(db, api_client, crear_usuario):
    op = crear_usuario(rol="operador", username="op_test", email="op@test.local")
    api_client.force_authenticate(user=op)
    return api_client, op


@pytest.fixture
def auditor_client(db, api_client, crear_usuario):
    aud = crear_usuario(rol="auditor", username="aud_test", email="aud@test.local")
    api_client.force_authenticate(user=aud)
    return api_client, aud


@pytest.fixture
def vehiculo(db):
    from tms_project.apps.vehiculos.models import Vehiculo
    return Vehiculo.objects.create(
        patente="TEST-001",
        marca="Mercedes-Benz",
        modelo="Actros",
        anio=2021,
        capacidad_kg=25000,
        numero_chasis="WDB0000000L000001",
        estado="activo",
    )


@pytest.fixture
def chofer(db):
    from tms_project.apps.choferes.models import Chofer
    return Chofer.objects.create(
        nombre="Roberto", apellido="Test",
        documento="9999999",
        telefono="0981-000001",
        direccion="Asunción, PY",
        fecha_ingreso=date(2020, 1, 1),
        estado="activo",
    )


@pytest.fixture
def cliente(db):
    from tms_project.apps.clientes.models import Cliente
    return Cliente.objects.create(
        razon_social="Cliente Test S.A.",
        ruc="80099999-9",
        telefono="021-999999",
        email="test@cliente.com.py",
        direccion="Asunción, PY",
    )


@pytest.fixture
def viaje(db, vehiculo, chofer, cliente, crear_usuario):
    from tms_project.apps.viajes.models import Viaje
    op = crear_usuario(rol="operador", username="op2", email="op2@test.local")
    return Viaje.objects.create(
        vehiculo=vehiculo,
        chofer=chofer,
        cliente=cliente,
        fecha_salida=date.today() - timedelta(days=3),
        fecha_regreso=date.today() - timedelta(days=1),
        origen="Asunción",
        destino="Ciudad del Este",
        km_iniciales=150000,
        km_finales=150350,
        estado="finalizado",
        created_by=op,
    )


# ============================================================
# TESTS — MODELOS
# ============================================================

@pytest.mark.django_db
class TestVehiculoModel:
    def test_str_representation(self, vehiculo):
        assert "TEST-001" in str(vehiculo)
        assert "Mercedes-Benz" in str(vehiculo)

    def test_kilometraje_sin_viajes(self, vehiculo):
        assert vehiculo.kilometraje_actual == 0


@pytest.mark.django_db
class TestViajeModel:
    def test_numero_viaje_autogenerado(self, viaje):
        assert viaje.numero_viaje.startswith("VJ-")

    def test_distancia_recorrida(self, viaje):
        assert viaje.distancia_recorrida == 350

    def test_km_finales_invalidos(self, vehiculo, chofer, cliente, crear_usuario):
        from django.core.exceptions import ValidationError
        from tms_project.apps.viajes.models import Viaje
        op = crear_usuario(rol="operador", username="op3", email="op3@test.local")
        with pytest.raises(ValidationError):
            v = Viaje(
                vehiculo=vehiculo, chofer=chofer, cliente=cliente,
                fecha_salida=date.today(),
                origen="A", destino="B",
                km_iniciales=100000, km_finales=90000,  # INVÁLIDO
                estado="programado",
                created_by=op,
            )
            v.full_clean()

    def test_rentabilidad(self, viaje):
        from tms_project.apps.ingresos.models import Ingreso, Gasto
        Ingreso.objects.create(
            viaje=viaje, cliente=viaje.cliente,
            fecha=date.today(), monto=Decimal("3000000"),
            moneda="PYG", forma_pago="efectivo",
        )
        Gasto.objects.create(
            viaje=viaje, fecha=date.today(), categoria="combustible",
            monto=Decimal("800000"), descripcion="Combustible",
        )
        viaje.refresh_from_db()
        assert viaje.rentabilidad == Decimal("2200000")


# ============================================================
# TESTS — API ENDPOINTS
# ============================================================

@pytest.mark.django_db
class TestVehiculoAPI:
    def test_listar_requiere_autenticacion(self, api_client):
        response = api_client.get("/api/v1/vehiculos/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_listar_autenticado(self, operador_client, vehiculo):
        client, _ = operador_client
        response = client.get("/api/v1/vehiculos/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_crear_vehiculo_operador(self, operador_client):
        client, _ = operador_client
        data = {
            "patente": "XYZ-789",
            "marca": "Volvo",
            "modelo": "FH16",
            "anio": 2022,
            "capacidad_kg": "22000.00",
            "numero_chasis": "YV2A4C1A8NB123456",
            "estado": "activo",
        }
        response = client.post("/api/v1/vehiculos/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["patente"] == "XYZ-789"

    def test_auditor_no_puede_crear(self, auditor_client):
        client, _ = auditor_client
        data = {
            "patente": "ZZZ-000",
            "marca": "Test",
            "modelo": "Model",
            "anio": 2020,
            "capacidad_kg": "10000",
            "numero_chasis": "ZZZ0000000L000000",
            "estado": "activo",
        }
        response = client.post("/api/v1/vehiculos/", data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestViajeAPI:
    def test_iniciar_viaje(self, operador_client, vehiculo, chofer, cliente):
        from tms_project.apps.viajes.models import Viaje
        client, op = operador_client
        v = Viaje.objects.create(
            vehiculo=vehiculo, chofer=chofer, cliente=cliente,
            fecha_salida=date.today(), origen="A", destino="B",
            km_iniciales=200000, estado="programado", created_by=op,
        )
        response = client.post(f"/api/v1/viajes/{v.id}/iniciar/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["estado"] == "en_curso"

    def test_finalizar_viaje(self, operador_client, vehiculo, chofer, cliente):
        from tms_project.apps.viajes.models import Viaje
        client, op = operador_client
        v = Viaje.objects.create(
            vehiculo=vehiculo, chofer=chofer, cliente=cliente,
            fecha_salida=date.today() - timedelta(days=1),
            origen="A", destino="B",
            km_iniciales=200000, estado="en_curso", created_by=op,
        )
        response = client.post(
            f"/api/v1/viajes/{v.id}/finalizar/",
            {"km_finales": 200350, "fecha_regreso": date.today().isoformat()},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["estado"] == "finalizado"
        assert response.data["distancia_recorrida"] == 350


@pytest.mark.django_db
class TestDashboardAPI:
    def test_dashboard_kpis(self, operador_client):
        client, _ = operador_client
        response = client.get("/api/v1/dashboard/")
        assert response.status_code == status.HTTP_200_OK
        assert "ingresos_mes" in response.data
        assert "gastos_mes" in response.data
        assert "ganancia_neta" in response.data
        assert "viajes_realizados" in response.data


@pytest.mark.django_db
class TestReportesAPI:
    def test_exportar_csv_ingresos(self, operador_client):
        client, _ = operador_client
        response = client.get("/api/v1/reportes/csv/?tipo=ingresos")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response["Content-Type"]

    def test_exportar_excel(self, operador_client):
        client, _ = operador_client
        response = client.get("/api/v1/reportes/excel/")
        assert response.status_code == status.HTTP_200_OK
        assert "spreadsheetml" in response["Content-Type"]

    def test_exportar_pdf(self, operador_client):
        client, _ = operador_client
        response = client.get("/api/v1/reportes/pdf/")
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "application/pdf"


@pytest.mark.django_db
class TestAuditLogAPI:
    def test_auditor_puede_ver(self, auditor_client):
        client, _ = auditor_client
        response = client.get("/api/v1/audit-log/")
        assert response.status_code == status.HTTP_200_OK

    def test_operador_no_puede_ver(self, operador_client):
        client, _ = operador_client
        response = client.get("/api/v1/audit-log/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

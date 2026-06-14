"""
Serializers principales — DRF
Archivo unificado de referencia; en producción separar por app.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from tms_project.apps.accounts.models import CustomUser, AuditLog
from tms_project.apps.vehiculos.models import Vehiculo
from tms_project.apps.choferes.models import Chofer
from tms_project.apps.clientes.models import Cliente
from tms_project.apps.viajes.models import Viaje
from tms_project.apps.ingresos.models import Ingreso, Gasto
from tms_project.apps.mantenimiento.models import Mantenimiento


# ========================
# ACCOUNTS
# ========================

class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "nombre_completo", "rol", "telefono", "is_active",
            "avatar", "password", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"password": {"write_only": True}}

    def get_nombre_completo(self, obj):
        return obj.get_full_name()

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="usuario.get_full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = "__all__"
        read_only_fields = ["id", "timestamp"]


# ========================
# VEHICULOS
# ========================

class VehiculoSerializer(serializers.ModelSerializer):
    kilometraje_actual = serializers.IntegerField(read_only=True)
    viajes_count = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = "__all__"
        read_only_fields = ["id", "fecha_alta", "created_at", "updated_at"]

    def get_viajes_count(self, obj):
        return obj.viajes.count()


class VehiculoListSerializer(serializers.ModelSerializer):
    """Versión liviana para listas."""
    class Meta:
        model = Vehiculo
        fields = ["id", "patente", "marca", "modelo", "anio", "estado"]


# ========================
# CHOFERES
# ========================

class ChoferSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    viajes_count = serializers.SerializerMethodField()

    class Meta:
        model = Chofer
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_viajes_count(self, obj):
        return obj.viajes.count()


class ChoferListSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = Chofer
        fields = ["id", "nombre_completo", "documento", "estado", "telefono"]


# ========================
# CLIENTES
# ========================

class ClienteSerializer(serializers.ModelSerializer):
    total_ingresos = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_total_ingresos(self, obj):
        from django.db.models import Sum
        return obj.ingresos.aggregate(total=Sum("monto"))["total"] or 0


# ========================
# VIAJES
# ========================

class ViajeSerializer(serializers.ModelSerializer):
    vehiculo_info = VehiculoListSerializer(source="vehiculo", read_only=True)
    chofer_info = ChoferListSerializer(source="chofer", read_only=True)
    distancia_recorrida = serializers.IntegerField(read_only=True)
    total_ingresos = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    total_gastos = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    rentabilidad = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    costo_por_km = serializers.DecimalField(max_digits=18, decimal_places=4, read_only=True)

    class Meta:
        model = Viaje
        fields = "__all__"
        read_only_fields = ["id", "numero_viaje", "created_at", "updated_at", "created_by"]

    def validate(self, data):
        km_ini = data.get("km_iniciales")
        km_fin = data.get("km_finales")
        if km_fin and km_ini and km_fin <= km_ini:
            raise serializers.ValidationError({
                "km_finales": "Los km finales deben ser mayores a los iniciales."
            })
        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if request:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class ViajeListSerializer(serializers.ModelSerializer):
    """Para listados con info básica."""
    chofer_nombre = serializers.CharField(source="chofer.nombre_completo", read_only=True)
    vehiculo_patente = serializers.CharField(source="vehiculo.patente", read_only=True)
    cliente_razon = serializers.CharField(source="cliente.razon_social", read_only=True)

    class Meta:
        model = Viaje
        fields = [
            "id", "numero_viaje", "fecha_salida", "fecha_regreso",
            "origen", "destino", "estado", "chofer_nombre",
            "vehiculo_patente", "cliente_razon", "distancia_recorrida",
        ]


# ========================
# INGRESOS
# ========================

class IngresoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.razon_social", read_only=True)
    viaje_numero = serializers.CharField(source="viaje.numero_viaje", read_only=True)

    class Meta:
        model = Ingreso
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


# ========================
# GASTOS
# ========================

class GastoSerializer(serializers.ModelSerializer):
    viaje_numero = serializers.CharField(source="viaje.numero_viaje", read_only=True)
    vehiculo_patente = serializers.CharField(source="vehiculo.patente", read_only=True)

    class Meta:
        model = Gasto
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


# ========================
# MANTENIMIENTO
# ========================

class MantenimientoSerializer(serializers.ModelSerializer):
    vehiculo_info = VehiculoListSerializer(source="vehiculo", read_only=True)
    dias_para_proximo = serializers.SerializerMethodField()

    class Meta:
        model = Mantenimiento
        fields = "__all__"
        read_only_fields = ["id", "alerta_enviada", "created_at", "updated_at", "created_by"]

    def get_dias_para_proximo(self, obj):
        if not obj.proximo_mantenimiento_fecha:
            return None
        from django.utils import timezone
        delta = obj.proximo_mantenimiento_fecha - timezone.now().date()
        return delta.days

    def create(self, validated_data):
        request = self.context.get("request")
        if request:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


# ========================
# DASHBOARD / KPIs
# ========================

class KPIDashboardSerializer(serializers.Serializer):
    """Serializer de solo lectura para el dashboard principal."""
    periodo_inicio = serializers.DateField()
    periodo_fin = serializers.DateField()
    total_ingresos = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_gastos = serializers.DecimalField(max_digits=18, decimal_places=2)
    ganancia_neta = serializers.DecimalField(max_digits=18, decimal_places=2)
    ganancia_bruta = serializers.DecimalField(max_digits=18, decimal_places=2)
    margen_porcentaje = serializers.FloatField()
    viajes_realizados = serializers.IntegerField()
    km_recorridos = serializers.IntegerField()
    costo_por_km = serializers.DecimalField(max_digits=12, decimal_places=4)
    ingresos_por_viaje = serializers.DecimalField(max_digits=18, decimal_places=2)
    gastos_por_categoria = serializers.DictField()
    top_clientes = serializers.ListField()
    evolucion_mensual = serializers.ListField()

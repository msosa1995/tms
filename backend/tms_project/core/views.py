"""
core/views.py — ViewSets principales con RBAC y acciones adicionales
"""
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from tms_project.core.permissions import PuedeEscribir, EsSupervisorOSuperior, EsAdministrador
from tms_project.core.serializers import (
    UsuarioSerializer, VehiculoSerializer, VehiculoListSerializer,
    ChoferSerializer, ChoferListSerializer, ClienteSerializer,
    ViajeSerializer, ViajeListSerializer, IngresoSerializer,
    GastoSerializer, MantenimientoSerializer, AuditLogSerializer,
)
from tms_project.apps.accounts.models import CustomUser, AuditLog
from tms_project.apps.vehiculos.models import Vehiculo
from tms_project.apps.choferes.models import Chofer
from tms_project.apps.clientes.models import Cliente
from tms_project.apps.viajes.models import Viaje, EstadoViaje
from tms_project.apps.ingresos.models import Ingreso, Gasto, CategoriaGasto
from tms_project.apps.mantenimiento.models import Mantenimiento


class UsuarioViewSet(PuedeEscribir, viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by("-created_at")
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["email", "first_name", "last_name", "username"]
    filterset_fields = ["rol", "is_active"]

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="toggle-activo")
    def toggle_activo(self, request, pk=None):
        usuario = self.get_object()
        if usuario == request.user:
            return Response({"error": "No puede desactivarse a sí mismo."}, status=400)
        usuario.is_active = not usuario.is_active
        usuario.save(update_fields=["is_active"])
        return Response({"is_active": usuario.is_active})


class VehiculoViewSet(PuedeEscribir, viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    permission_classes = [IsAuthenticated, PuedeEscribir]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ["patente", "marca", "modelo", "numero_chasis"]
    filterset_fields = ["estado"]
    ordering_fields = ["patente", "anio", "fecha_alta"]

    def get_serializer_class(self):
        if self.action == "list":
            return VehiculoListSerializer
        return VehiculoSerializer

    @action(detail=True, methods=["get"], url_path="historial-mantenimiento")
    def historial_mantenimiento(self, request, pk=None):
        vehiculo = self.get_object()
        mantenimientos = vehiculo.mantenimientos.order_by("-fecha")
        serializer = MantenimientoSerializer(mantenimientos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="estadisticas")
    def estadisticas(self, request, pk=None):
        vehiculo = self.get_object()
        viajes = vehiculo.viajes.filter(estado=EstadoViaje.FINALIZADO)
        total_km = sum(v.distancia_recorrida or 0 for v in viajes)
        total_ingresos = Ingreso.objects.filter(viaje__vehiculo=vehiculo).aggregate(
            total=Sum("monto")
        )["total"] or 0
        total_gastos = Gasto.objects.filter(
            Q(viaje__vehiculo=vehiculo) | Q(vehiculo=vehiculo)
        ).aggregate(total=Sum("monto"))["total"] or 0
        return Response({
            "vehiculo_id": vehiculo.id,
            "patente": vehiculo.patente,
            "total_viajes": viajes.count(),
            "total_km": total_km,
            "total_ingresos": total_ingresos,
            "total_gastos": total_gastos,
            "rentabilidad": total_ingresos - total_gastos,
            "kilometraje_actual": vehiculo.kilometraje_actual,
        })


class ChoferViewSet(viewsets.ModelViewSet):
    queryset = Chofer.objects.all()
    permission_classes = [IsAuthenticated, PuedeEscribir]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre", "apellido", "documento"]
    filterset_fields = ["estado"]

    def get_serializer_class(self):
        if self.action == "list":
            return ChoferListSerializer
        return ChoferSerializer

    @action(detail=True, methods=["get"], url_path="viajes")
    def viajes(self, request, pk=None):
        chofer = self.get_object()
        viajes = chofer.viajes.order_by("-fecha_salida")
        serializer = ViajeListSerializer(viajes, many=True)
        return Response(serializer.data)


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, PuedeEscribir]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["razon_social", "ruc", "email"]
    filterset_fields = ["activo"]

    @action(detail=True, methods=["get"], url_path="rentabilidad")
    def rentabilidad(self, request, pk=None):
        cliente = self.get_object()
        ingresos = cliente.ingresos.aggregate(total=Sum("monto"))["total"] or 0
        gastos = Gasto.objects.filter(viaje__cliente=cliente).aggregate(
            total=Sum("monto")
        )["total"] or 0
        return Response({
            "cliente_id": cliente.id,
            "razon_social": cliente.razon_social,
            "total_ingresos": ingresos,
            "total_gastos_asociados": gastos,
            "rentabilidad": ingresos - gastos,
            "total_viajes": cliente.viajes.count(),
        })


class ViajeViewSet(viewsets.ModelViewSet):
    queryset = Viaje.objects.select_related(
        "vehiculo", "chofer", "cliente", "created_by"
    ).all()
    permission_classes = [IsAuthenticated, PuedeEscribir]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ["numero_viaje", "origen", "destino", "cliente__razon_social"]
    filterset_fields = ["estado", "vehiculo", "chofer", "cliente"]
    ordering_fields = ["fecha_salida", "numero_viaje"]

    def get_serializer_class(self):
        if self.action == "list":
            return ViajeListSerializer
        return ViajeSerializer

    @action(detail=True, methods=["post"], url_path="iniciar")
    def iniciar(self, request, pk=None):
        viaje = self.get_object()
        if viaje.estado != EstadoViaje.PROGRAMADO:
            return Response({"error": "Solo se pueden iniciar viajes programados."}, status=400)
        viaje.estado = EstadoViaje.EN_CURSO
        viaje.save(update_fields=["estado"])
        return Response(ViajeSerializer(viaje).data)

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        viaje = self.get_object()
        if viaje.estado != EstadoViaje.EN_CURSO:
            return Response({"error": "Solo se pueden finalizar viajes en curso."}, status=400)
        km_finales = request.data.get("km_finales")
        fecha_regreso = request.data.get("fecha_regreso")
        if not km_finales:
            return Response({"error": "km_finales es requerido."}, status=400)
        viaje.km_finales = km_finales
        viaje.fecha_regreso = fecha_regreso or timezone.now().date()
        viaje.estado = EstadoViaje.FINALIZADO
        viaje.save(update_fields=["km_finales", "fecha_regreso", "estado"])
        return Response(ViajeSerializer(viaje).data)

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        viaje = self.get_object()
        if viaje.estado == EstadoViaje.FINALIZADO:
            return Response({"error": "No se puede cancelar un viaje finalizado."}, status=400)
        viaje.estado = EstadoViaje.CANCELADO
        viaje.save(update_fields=["estado"])
        return Response(ViajeSerializer(viaje).data)


class IngresoViewSet(viewsets.ModelViewSet):
    queryset = Ingreso.objects.select_related("cliente", "viaje", "created_by").all()
    serializer_class = IngresoSerializer
    permission_classes = [IsAuthenticated, PuedeEscribir]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["cliente", "viaje", "forma_pago", "moneda"]
    ordering_fields = ["fecha", "monto"]

    def get_queryset(self):
        qs = super().get_queryset()
        fecha_desde = self.request.query_params.get("fecha_desde")
        fecha_hasta = self.request.query_params.get("fecha_hasta")
        if fecha_desde:
            qs = qs.filter(fecha__gte=parse_date(fecha_desde))
        if fecha_hasta:
            qs = qs.filter(fecha__lte=parse_date(fecha_hasta))
        return qs

    @action(detail=False, methods=["get"], url_path="resumen-mensual")
    def resumen_mensual(self, request):
        from django.db.models.functions import TruncMonth
        data = (
            Ingreso.objects
            .annotate(mes=TruncMonth("fecha"))
            .values("mes")
            .annotate(total=Sum("monto"), cantidad=Count("id"))
            .order_by("mes")
        )
        return Response(list(data))


class GastoViewSet(viewsets.ModelViewSet):
    queryset = Gasto.objects.select_related("viaje", "vehiculo", "created_by").all()
    serializer_class = GastoSerializer
    permission_classes = [IsAuthenticated, PuedeEscribir]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["categoria", "viaje", "vehiculo"]
    ordering_fields = ["fecha", "monto"]

    def get_queryset(self):
        qs = super().get_queryset()
        fecha_desde = self.request.query_params.get("fecha_desde")
        fecha_hasta = self.request.query_params.get("fecha_hasta")
        if fecha_desde:
            qs = qs.filter(fecha__gte=parse_date(fecha_desde))
        if fecha_hasta:
            qs = qs.filter(fecha__lte=parse_date(fecha_hasta))
        return qs

    @action(detail=False, methods=["get"], url_path="por-categoria")
    def por_categoria(self, request):
        data = (
            Gasto.objects
            .values("categoria")
            .annotate(total=Sum("monto"), cantidad=Count("id"))
            .order_by("-total")
        )
        return Response(list(data))


class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.select_related("vehiculo", "created_by").all()
    serializer_class = MantenimientoSerializer
    permission_classes = [IsAuthenticated, PuedeEscribir]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["vehiculo", "tipo"]
    ordering_fields = ["fecha", "costo"]

    @action(detail=False, methods=["get"], url_path="alertas-proximas")
    def alertas_proximas(self, request):
        """Mantenimientos programados para los próximos 30 días."""
        hoy = timezone.now().date()
        limite = hoy + timezone.timedelta(days=30)
        proximos = self.get_queryset().filter(
            proximo_mantenimiento_fecha__range=(hoy, limite)
        ).order_by("proximo_mantenimiento_fecha")
        serializer = self.get_serializer(proximos, many=True)
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("usuario").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, EsSupervisorOSuperior]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["accion", "modelo", "usuario"]
    ordering_fields = ["timestamp"]


class DashboardViewSet(viewsets.ViewSet):
    """Endpoint único para KPIs del dashboard principal."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        inicio_anio = hoy.replace(month=1, day=1)

        # KPIs del mes actual
        ingresos_mes = Ingreso.objects.filter(
            fecha__gte=inicio_mes
        ).aggregate(total=Sum("monto"))["total"] or 0

        gastos_mes = Gasto.objects.filter(
            fecha__gte=inicio_mes
        ).aggregate(total=Sum("monto"))["total"] or 0

        viajes_mes = Viaje.objects.filter(
            fecha_salida__gte=inicio_mes,
            estado=EstadoViaje.FINALIZADO,
        ).count()

        km_mes = sum(
            v.distancia_recorrida or 0
            for v in Viaje.objects.filter(
                fecha_salida__gte=inicio_mes,
                estado=EstadoViaje.FINALIZADO,
            )
        )

        # Gastos por categoría del mes
        gastos_categoria = dict(
            Gasto.objects.filter(fecha__gte=inicio_mes)
            .values_list("categoria")
            .annotate(total=Sum("monto"))
        )

        # Top 5 clientes por ingreso del año
        top_clientes = list(
            Ingreso.objects.filter(fecha__gte=inicio_anio)
            .values("cliente__razon_social")
            .annotate(total=Sum("monto"))
            .order_by("-total")[:5]
        )

        ganancia_neta = ingresos_mes - gastos_mes
        margen = float(ganancia_neta / ingresos_mes * 100) if ingresos_mes else 0
        costo_por_km = float(gastos_mes / km_mes) if km_mes else 0

        return Response({
            "periodo": {"inicio": inicio_mes, "fin": hoy},
            "ingresos_mes": ingresos_mes,
            "gastos_mes": gastos_mes,
            "ganancia_neta": ganancia_neta,
            "margen_porcentaje": round(margen, 2),
            "viajes_realizados": viajes_mes,
            "km_recorridos": km_mes,
            "costo_por_km": round(costo_por_km, 4),
            "gastos_por_categoria": gastos_categoria,
            "top_clientes": top_clientes,
        })

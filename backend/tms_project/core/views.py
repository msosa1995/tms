"""
core/views.py — ViewSets principales con RBAC y acciones adicionales
"""
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
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

    @action(detail=False, methods=["post"], url_path="importar-excel",
            parser_classes=[MultiPartParser, FormParser])
    def importar_excel(self, request):
        import openpyxl
        from decimal import Decimal, InvalidOperation
        from datetime import date as date_cls, datetime as datetime_cls

        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response({"error": "No se envió ningún archivo."}, status=400)

        MESES_ES = {
            "ene": 1, "enero": 1, "feb": 2, "febrero": 2, "mar": 3, "marzo": 3,
            "abr": 4, "abril": 4, "may": 5, "mayo": 5, "jun": 6, "junio": 6,
            "jul": 7, "julio": 7, "ago": 8, "agosto": 8, "sep": 9, "sept": 9,
            "septiembre": 9, "oct": 10, "octubre": 10, "nov": 11, "noviembre": 11,
            "dic": 12, "diciembre": 12,
        }

        CONCEPTO_CATEGORIA = {
            "aceite": "combustible", "combustible": "combustible", "fluido": "combustible",
            "gasoil": "combustible", "nafta": "combustible",
            "mecanico": "reparaciones", "mecanica": "reparaciones", "elastico": "reparaciones",
            "embrague": "reparaciones", "bateria": "reparaciones", "alternador": "reparaciones",
            "trasero": "reparaciones", "bidon": "reparaciones", "bolt": "reparaciones",
            "repuesto": "reparaciones", "air comb": "reparaciones",
            "limitador": "reparaciones", "focos": "reparaciones", "correa": "reparaciones",
            "soporte": "reparaciones", "tapa combus": "reparaciones", "acople": "reparaciones",
            "electricista": "reparaciones", "freno": "reparaciones", "additivo": "reparaciones",
            "mano de obra": "reparaciones", "herramientas": "reparaciones",
            "cubierta": "neumaticos", "neumatico": "neumaticos", "goma": "neumaticos",
            "seguro": "seguros",
            "peaje": "peajes",
            "penayo": "viaticos", "viatico": "viaticos", "habitacion": "viaticos",
            "empanada": "viaticos", "almuerzo": "viaticos", "interes": "viaticos",
            "plus chofer": "viaticos", "plus vianda": "viaticos", "incentivo": "viaticos",
            "escribania": "impuestos", "iva": "impuestos", "factura para iva": "impuestos",
            "impuesto": "impuestos", "multa": "impuestos", "patente": "impuestos",
            "medicamento": "otros", "franela": "otros", "lavado": "otros", "gps": "otros",
            "carpa": "otros", "tapiceria": "otros", "tapizeria": "otros",
            "pomo": "otros", "tuerca": "otros", "llave": "otros",
            "regalo": "otros", "canasta": "otros", "foco": "otros",
        }

        def detectar_categoria(concepto):
            c = (concepto or "").lower()
            for kw, cat in CONCEPTO_CATEGORIA.items():
                if kw in c:
                    return cat
            return "otros"

        def parsear_fecha(val, anno_ref):
            # Tipo datetime de Python (openpyxl convierte fechas Excel a datetime)
            if isinstance(val, datetime_cls):
                return val.date()
            # Tipo date de Python
            if isinstance(val, date_cls):
                return val
            # Número (serial Excel: días desde 1900-01-01)
            if isinstance(val, (int, float)):
                try:
                    from openpyxl.utils.datetime import from_excel
                    return from_excel(val).date()
                except Exception:
                    pass
            # String — intentar parsear
            s = str(val).strip()
            if not s or s.lower() in ("none", "fecha", ""):
                return None
            sl = s.lower()
            # Formato "DD-MMM" o "D-MMM" (ej: "10-mar", "2-abr")
            for mes_nombre, mes_num in sorted(MESES_ES.items(), key=lambda x: -len(x[0])):
                if mes_nombre in sl:
                    resto = sl.replace(mes_nombre, "").replace("-", "").replace("/", "").replace(" ", "").strip()
                    if resto.isdigit():
                        dia = int(resto)
                        return date_cls(anno_ref[0], mes_num, dia)
            # Formatos DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
            import re
            m = re.match(r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})", s)
            if m:
                a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
                if c > 31:
                    return date_cls(c, b, a)
                else:
                    yr = c + 2000 if c < 100 else c
                    return date_cls(yr, b, a)
            m2 = re.match(r"(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})", s)
            if m2:
                return date_cls(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))
            return None

        try:
            wb = openpyxl.load_workbook(archivo, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({"error": f"No se pudo leer el archivo: {e}"}, status=400)

        vehiculo = Vehiculo.objects.first()
        creados = 0
        errores = []
        anno_ref = [2025]
        mes_anterior = 0
        # Guardar muestra de primera fila para debug
        muestra = None

        for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row or len(row) < 3:
                continue
            fecha_val = row[0]
            monto_val = row[1]
            concepto_val = row[2]

            if fecha_val is None and monto_val is None:
                continue

            # Guardar muestra de la primera fila con datos
            if muestra is None:
                muestra = f"tipo={type(fecha_val).__name__} val='{fecha_val}'"

            fecha = parsear_fecha(fecha_val, anno_ref)
            if not fecha:
                errores.append(f"Fila {i}: fecha no reconocida '{fecha_val}' (tipo: {type(fecha_val).__name__})")
                if len(errores) >= 5:
                    break
                continue

            if fecha.month < mes_anterior and mes_anterior >= 11:
                anno_ref[0] += 1
                fecha = fecha.replace(year=anno_ref[0])
            mes_anterior = fecha.month

            try:
                monto_str = str(monto_val).replace(",", ".").replace(" ", "")
                monto = Decimal(monto_str)
            except (InvalidOperation, TypeError):
                errores.append(f"Fila {i}: monto inválido '{monto_val}'")
                continue

            if monto <= 0:
                continue

            descripcion = str(concepto_val or "").strip() or "Sin descripción"
            categoria = detectar_categoria(descripcion)

            try:
                Gasto.objects.create(
                    fecha=fecha,
                    monto=monto,
                    descripcion=descripcion,
                    categoria=categoria,
                    moneda="PYG",
                    vehiculo=vehiculo,
                    created_by=request.user,
                )
                creados += 1
            except Exception as e:
                errores.append(f"Fila {i}: error al guardar — {e}")

        if creados == 0 and errores and muestra:
            errores.insert(0, f"DEBUG primera celda: {muestra}")

        return Response({
            "creados": creados,
            "errores": errores[:25],
            "mensaje": f"Se importaron {creados} gastos correctamente." + (
                f" ({len(errores)} filas con error)" if errores else ""
            ),
        })


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
        from django.db.models.functions import TruncMonth
        hoy = timezone.now().date()
        hace_12m = hoy.replace(year=hoy.year - 1)

        # ── Totales acumulados ──────────────────────────────────────────────
        total_ingresos = Ingreso.objects.aggregate(t=Sum("monto"))["t"] or 0
        total_gastos = Gasto.objects.aggregate(t=Sum("monto"))["t"] or 0
        ganancia_total = total_ingresos - total_gastos
        margen = float(ganancia_total / total_ingresos * 100) if total_ingresos else 0

        # ── Último período facturado ────────────────────────────────────────
        ultimo_ingreso = Ingreso.objects.order_by("-fecha").first()
        ultimo_ingreso_monto = float(ultimo_ingreso.monto) if ultimo_ingreso else 0
        ultimo_ingreso_fecha = str(ultimo_ingreso.fecha) if ultimo_ingreso else None
        ultimo_ingreso_obs = (ultimo_ingreso.observaciones or "") if ultimo_ingreso else ""

        # ── Gastos últimos 90 días ──────────────────────────────────────────
        hace_90d = hoy - timezone.timedelta(days=90)
        gastos_90d = Gasto.objects.filter(fecha__gte=hace_90d).aggregate(t=Sum("monto"))["t"] or 0

        # ── Gastos por categoría (todo el período) ──────────────────────────
        gastos_categoria = dict(
            Gasto.objects.values_list("categoria").annotate(total=Sum("monto"))
        )

        # ── Evolución mensual ingresos vs gastos (últimos 12 meses) ────────
        ingresos_mes = list(
            Ingreso.objects.filter(fecha__gte=hace_12m)
            .annotate(mes=TruncMonth("fecha"))
            .values("mes")
            .annotate(total=Sum("monto"))
            .order_by("mes")
        )
        gastos_mes_lista = list(
            Gasto.objects.filter(fecha__gte=hace_12m)
            .annotate(mes=TruncMonth("fecha"))
            .values("mes")
            .annotate(total=Sum("monto"))
            .order_by("mes")
        )

        # ── Gastos recientes (últimos 10) ────────────────────────────────────
        gastos_recientes = list(
            Gasto.objects.order_by("-fecha")[:10]
            .values("fecha", "descripcion", "categoria", "monto")
        )

        return Response({
            "total_ingresos": total_ingresos,
            "total_gastos": total_gastos,
            "ganancia_total": ganancia_total,
            "margen_porcentaje": round(margen, 2),
            "gastos_90d": gastos_90d,
            "ultimo_ingreso": {
                "monto": ultimo_ingreso_monto,
                "fecha": ultimo_ingreso_fecha,
                "periodo": ultimo_ingreso_obs,
            },
            "gastos_por_categoria": gastos_categoria,
            "evolucion_ingresos": [
                {"mes": str(r["mes"])[:7], "total": float(r["total"])} for r in ingresos_mes
            ],
            "evolucion_gastos": [
                {"mes": str(r["mes"])[:7], "total": float(r["total"])} for r in gastos_mes_lista
            ],
            "gastos_recientes": [
                {**g, "fecha": str(g["fecha"]), "monto": float(g["monto"])} for g in gastos_recientes
            ],
        })

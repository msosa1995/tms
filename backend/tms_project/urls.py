"""
tms_project/urls.py — URLs principales con versionado /api/v1/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
    TokenBlacklistView,
)
from tms_project.apps.accounts.views import UsernameTokenObtainPairView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from tms_project.core.views import (
    UsuarioViewSet, VehiculoViewSet, ChoferViewSet, ClienteViewSet,
    ViajeViewSet, IngresoViewSet, GastoViewSet, MantenimientoViewSet,
    AuditLogViewSet, DashboardViewSet,
)
from tms_project.apps.reportes.views import ReporteViewSet
from tms_project.apps.analytics.views import AnalyticsViewSet

# ——— Router ——————————————————————————————————————
router = DefaultRouter()
router.register(r"usuarios", UsuarioViewSet, basename="usuario")
router.register(r"vehiculos", VehiculoViewSet, basename="vehiculo")
router.register(r"choferes", ChoferViewSet, basename="chofer")
router.register(r"clientes", ClienteViewSet, basename="cliente")
router.register(r"viajes", ViajeViewSet, basename="viaje")
router.register(r"ingresos", IngresoViewSet, basename="ingreso")
router.register(r"gastos", GastoViewSet, basename="gasto")
router.register(r"mantenimiento", MantenimientoViewSet, basename="mantenimiento")
router.register(r"audit-log", AuditLogViewSet, basename="audit-log")
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"reportes", ReporteViewSet, basename="reporte")
router.register(r"analytics", AnalyticsViewSet, basename="analytics")

# ——— URL Patterns ————————————————————————————————
urlpatterns = [
    path("admin/", admin.site.urls),

    # ——— API v1 ——————————————————————————————
    path("api/v1/", include(router.urls)),

    # ——— Autenticación JWT ——————————————————
    path("api/v1/auth/token/", UsernameTokenObtainPairView.as_view(), name="token_obtain"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("api/v1/auth/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),

    # ——— Documentación OpenAPI ——————————————
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

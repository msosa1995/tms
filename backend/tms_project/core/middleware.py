"""
core/middleware.py — Middleware de auditoría + IP tracking
"""
import json
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("tms")


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditMiddleware(MiddlewareMixin):
    """
    Registra IPs de acceso y actualiza ultimo_login_ip del usuario.
    Los registros de auditoría de CRUD se generan via signals en cada app.
    """
    SKIP_PATHS = ["/api/schema/", "/api/docs/", "/api/redoc/", "/static/", "/media/"]

    def process_request(self, request):
        request.client_ip = get_client_ip(request)

    def process_response(self, request, response):
        if any(request.path.startswith(p) for p in self.SKIP_PATHS):
            return response

        if (
            hasattr(request, "user")
            and request.user.is_authenticated
            and request.method not in ("GET", "HEAD", "OPTIONS")
        ):
            try:
                ip = getattr(request, "client_ip", None)
                if ip and request.user.ultimo_login_ip != ip:
                    request.user.__class__.objects.filter(pk=request.user.pk).update(
                        ultimo_login_ip=ip
                    )
            except Exception as e:
                logger.warning(f"Error actualizando IP de usuario: {e}")

        return response


# ============================================================
# core/pagination.py
# ============================================================
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 200

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
            "page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })


# ============================================================
# core/exceptions.py
# ============================================================
from rest_framework.views import exception_handler
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            "status_code": response.status_code,
            "errors": response.data,
        }
        if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            custom_data["message"] = "Autenticación requerida."
        response.data = custom_data

    return response

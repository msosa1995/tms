"""
core/permissions.py — Sistema RBAC por rol
"""
from rest_framework.permissions import BasePermission
from tms_project.apps.accounts.models import RolUsuario


class EsAdministrador(BasePermission):
    """Solo administradores."""
    message = "Se requiere rol de Administrador."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol == RolUsuario.ADMINISTRADOR
        )


class EsSupervisorOSuperior(BasePermission):
    """Administrador o Supervisor."""
    message = "Se requiere rol de Supervisor o superior."
    ROLES_PERMITIDOS = {RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR}

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in self.ROLES_PERMITIDOS
        )


class PuedeEscribir(BasePermission):
    """Cualquier rol excepto Auditor (solo lectura)."""
    message = "El rol Auditor solo tiene acceso de lectura."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.puede_escribir


class EsAuditorOSuperior(BasePermission):
    """Todos los roles autenticados (Auditor = solo lectura garantizado por PuedeEscribir)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class PermisoPorRol:
    """
    Mixin para ViewSets con permisos diferenciados por método HTTP.
    Uso: heredar este mixin y definir `permission_classes_by_action`.
    """
    permission_classes_by_action = {}

    def get_permissions(self):
        action = self.action if hasattr(self, "action") else None
        if action and action in self.permission_classes_by_action:
            return [p() for p in self.permission_classes_by_action[action]]
        return [p() for p in self.permission_classes]

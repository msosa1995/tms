"""
apps/accounts/models.py — Usuarios, roles y autenticación
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class RolUsuario(models.TextChoices):
    ADMINISTRADOR = "administrador", _("Administrador")
    SUPERVISOR = "supervisor", _("Supervisor")
    OPERADOR = "operador", _("Operador")
    AUDITOR = "auditor", _("Auditor")


class CustomUser(AbstractUser):
    """
    Usuario personalizado con campo de rol y metadatos adicionales.
    Reemplaza al User de Django para control total sobre el modelo.
    """
    email = models.EmailField(_("email"), unique=True)
    rol = models.CharField(
        max_length=20,
        choices=RolUsuario.choices,
        default=RolUsuario.OPERADOR,
        db_index=True,
    )
    telefono = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    ultimo_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = _("usuario")
        verbose_name_plural = _("usuarios")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.rol})"

    @property
    def es_administrador(self):
        return self.rol == RolUsuario.ADMINISTRADOR

    @property
    def es_supervisor(self):
        return self.rol == RolUsuario.SUPERVISOR

    @property
    def puede_escribir(self):
        """Auditor solo lectura; el resto puede escribir."""
        return self.rol != RolUsuario.AUDITOR


class AuditLog(models.Model):
    """
    Registro de auditoría de todas las acciones del sistema.
    Se genera automáticamente via signals y middleware.
    """
    class Accion(models.TextChoices):
        LOGIN = "login", _("Inicio de sesión")
        LOGOUT = "logout", _("Cierre de sesión")
        CREATE = "create", _("Alta")
        UPDATE = "update", _("Modificación")
        DELETE = "delete", _("Eliminación")
        EXPORT = "export", _("Exportación")
        VIEW = "view", _("Consulta")

    usuario = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )
    accion = models.CharField(max_length=20, choices=Accion.choices, db_index=True)
    modelo = models.CharField(max_length=100, db_index=True)
    objeto_id = models.PositiveIntegerField(null=True, blank=True)
    descripcion = models.CharField(max_length=500)
    valores_anteriores = models.JSONField(null=True, blank=True)
    valores_nuevos = models.JSONField(null=True, blank=True)
    ip_origen = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("registro de auditoría")
        verbose_name_plural = _("registros de auditoría")
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["usuario", "timestamp"]),
            models.Index(fields=["modelo", "objeto_id"]),
            models.Index(fields=["accion", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.timestamp} | {self.usuario} | {self.accion} | {self.modelo}"

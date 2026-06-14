"""
core/signals.py — Auditoría automática via signals de Django
Registrar en cada app en apps.py con: from tms_project.core import signals
"""
import json
import logging
import threading
from django.db.models.signals import post_save, post_delete, pre_save
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from django.forms.models import model_to_dict

logger = logging.getLogger("tms")

# Thread-local para guardar la request actual
_thread_locals = threading.local()


def get_current_request():
    return getattr(_thread_locals, "request", None)


def set_current_request(request):
    _thread_locals.request = request


MODELOS_AUDITADOS = [
    "vehiculos.Vehiculo",
    "choferes.Chofer",
    "clientes.Cliente",
    "viajes.Viaje",
    "ingresos.Ingreso",
    "ingresos.Gasto",
    "mantenimiento.Mantenimiento",
    "accounts.CustomUser",
]


def serializar_instancia(instance):
    """Convierte una instancia de modelo a dict serializable en JSON."""
    try:
        data = model_to_dict(instance)
        return {k: str(v) if hasattr(v, "__str__") else v for k, v in data.items()}
    except Exception:
        return {}


def _label_modelo(instance):
    meta = instance.__class__._meta
    return f"{meta.app_label}.{meta.object_name}"


def registrar_audit(usuario, accion, instance, ip=None, valores_ant=None, valores_nv=None):
    """Crea un AuditLog de forma segura."""
    try:
        from tms_project.apps.accounts.models import AuditLog
        AuditLog.objects.create(
            usuario=usuario,
            accion=accion,
            modelo=_label_modelo(instance),
            objeto_id=instance.pk,
            descripcion=f"{accion.capitalize()} de {_label_modelo(instance)} id={instance.pk}",
            valores_anteriores=valores_ant,
            valores_nuevos=valores_nv,
            ip_origen=ip,
        )
    except Exception as e:
        logger.error(f"Error creando AuditLog: {e}")


# ——— pre_save: guardar valores anteriores —————————————————
@receiver(pre_save)
def capturar_valores_anteriores(sender, instance, **kwargs):
    if _label_modelo(instance) not in MODELOS_AUDITADOS:
        return
    if instance.pk:
        try:
            instance._valores_anteriores = serializar_instancia(
                sender.objects.get(pk=instance.pk)
            )
        except sender.DoesNotExist:
            instance._valores_anteriores = None
    else:
        instance._valores_anteriores = None


# ——— post_save: create y update ———————————————————————————
@receiver(post_save)
def auditar_guardado(sender, instance, created, **kwargs):
    if _label_modelo(instance) not in MODELOS_AUDITADOS:
        return
    request = get_current_request()
    usuario = getattr(request, "user", None) if request else None
    if usuario and not usuario.is_authenticated:
        usuario = None
    ip = getattr(request, "client_ip", None) if request else None
    accion = "create" if created else "update"
    valores_nv = serializar_instancia(instance)
    valores_ant = getattr(instance, "_valores_anteriores", None)
    registrar_audit(usuario, accion, instance, ip, valores_ant, valores_nv)


# ——— post_delete ——————————————————————————————————————————
@receiver(post_delete)
def auditar_eliminacion(sender, instance, **kwargs):
    if _label_modelo(instance) not in MODELOS_AUDITADOS:
        return
    request = get_current_request()
    usuario = getattr(request, "user", None) if request else None
    ip = getattr(request, "client_ip", None) if request else None
    registrar_audit(usuario, "delete", instance, ip, serializar_instancia(instance), None)


# ——— Login / Logout ———————————————————————————————————————
@receiver(user_logged_in)
def auditar_login(sender, request, user, **kwargs):
    from tms_project.apps.accounts.models import AuditLog
    ip = getattr(request, "client_ip", None)
    AuditLog.objects.create(
        usuario=user,
        accion=AuditLog.Accion.LOGIN,
        modelo="accounts.CustomUser",
        objeto_id=user.pk,
        descripcion=f"Login exitoso: {user.email}",
        ip_origen=ip,
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
    )


@receiver(user_logged_out)
def auditar_logout(sender, request, user, **kwargs):
    from tms_project.apps.accounts.models import AuditLog
    if not user:
        return
    ip = getattr(request, "client_ip", None)
    AuditLog.objects.create(
        usuario=user,
        accion=AuditLog.Accion.LOGOUT,
        modelo="accounts.CustomUser",
        objeto_id=user.pk,
        descripcion=f"Logout: {user.email}",
        ip_origen=ip,
    )


@receiver(user_login_failed)
def auditar_login_fallido(sender, credentials, request, **kwargs):
    from tms_project.apps.accounts.models import AuditLog
    ip = getattr(request, "client_ip", None)
    AuditLog.objects.create(
        usuario=None,
        accion=AuditLog.Accion.LOGIN,
        modelo="accounts.CustomUser",
        descripcion=f"Login fallido para: {credentials.get('email', '?')}",
        ip_origen=ip,
    )

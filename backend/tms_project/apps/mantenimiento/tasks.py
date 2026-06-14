"""
apps/mantenimiento/tasks.py — Tareas Celery para alertas y reportes
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger("tms")


@shared_task(bind=True, name="mantenimiento.verificar_alertas", queue="alerts", max_retries=3)
def verificar_alertas_mantenimiento(self):
    """
    Verifica próximos mantenimientos y envía alertas.
    Programado para ejecutarse diariamente a las 08:00.
    """
    from tms_project.apps.mantenimiento.models import Mantenimiento

    hoy = timezone.now().date()
    limite_fecha = hoy + timezone.timedelta(days=7)

    proximos = Mantenimiento.objects.filter(
        proximo_mantenimiento_fecha__range=(hoy, limite_fecha),
        alerta_enviada=False,
    ).select_related("vehiculo")

    alertas_enviadas = 0
    for mant in proximos:
        try:
            dias_restantes = (mant.proximo_mantenimiento_fecha - hoy).days
            mensaje = (
                f"ALERTA: El vehículo {mant.vehiculo.patente} "
                f"({mant.vehiculo.marca} {mant.vehiculo.modelo}) "
                f"tiene un mantenimiento programado en {dias_restantes} día(s).\n\n"
                f"Tipo: {mant.get_tipo_display()}\n"
                f"Fecha programada: {mant.proximo_mantenimiento_fecha}\n"
                f"Último mantenimiento: {mant.fecha}\n"
                f"Kilómetros al próximo: {mant.proximo_mantenimiento_km or 'N/A'}"
            )
            send_mail(
                subject=f"[TMS] Alerta mantenimiento — {mant.vehiculo.patente}",
                message=mensaje,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.DEFAULT_FROM_EMAIL],
                fail_silently=False,
            )
            mant.alerta_enviada = True
            mant.save(update_fields=["alerta_enviada"])
            alertas_enviadas += 1
        except Exception as exc:
            logger.error(f"Error enviando alerta mantenimiento {mant.id}: {exc}")

    # Verificar también por kilometraje
    from tms_project.apps.vehiculos.models import Vehiculo
    for vehiculo in Vehiculo.objects.filter(estado="activo"):
        km_actual = vehiculo.kilometraje_actual
        proximos_km = Mantenimiento.objects.filter(
            vehiculo=vehiculo,
            proximo_mantenimiento_km__isnull=False,
            alerta_enviada=False,
        )
        for mant in proximos_km:
            km_restantes = mant.proximo_mantenimiento_km - km_actual
            if 0 <= km_restantes <= 500:
                try:
                    send_mail(
                        subject=f"[TMS] Alerta por kilometraje — {vehiculo.patente}",
                        message=(
                            f"El vehículo {vehiculo.patente} está a {km_restantes} km "
                            f"del próximo mantenimiento ({mant.get_tipo_display()}).\n"
                            f"Km actual: {km_actual} | Km límite: {mant.proximo_mantenimiento_km}"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[settings.DEFAULT_FROM_EMAIL],
                        fail_silently=False,
                    )
                    mant.alerta_enviada = True
                    mant.save(update_fields=["alerta_enviada"])
                    alertas_enviadas += 1
                except Exception as exc:
                    logger.error(f"Error alerta km {mant.id}: {exc}")

    logger.info(f"Alertas de mantenimiento enviadas: {alertas_enviadas}")
    return {"alertas_enviadas": alertas_enviadas}


@shared_task(bind=True, name="reportes.generar_resumen_mensual", queue="reports")
def generar_resumen_mensual(self):
    """
    Genera el resumen mensual automático.
    Programado para el día 1 de cada mes a las 06:00.
    """
    from django.db.models import Sum, Count
    from tms_project.apps.ingresos.models import Ingreso, Gasto
    from tms_project.apps.viajes.models import Viaje, EstadoViaje

    hoy = timezone.now().date()
    # Mes anterior
    if hoy.month == 1:
        inicio = hoy.replace(year=hoy.year - 1, month=12, day=1)
    else:
        inicio = hoy.replace(month=hoy.month - 1, day=1)
    fin = hoy.replace(day=1) - timezone.timedelta(days=1)

    ingresos = Ingreso.objects.filter(
        fecha__range=(inicio, fin)
    ).aggregate(total=Sum("monto"), count=Count("id"))

    gastos = Gasto.objects.filter(
        fecha__range=(inicio, fin)
    ).aggregate(total=Sum("monto"))

    viajes = Viaje.objects.filter(
        fecha_salida__range=(inicio, fin),
        estado=EstadoViaje.FINALIZADO,
    ).count()

    total_ing = ingresos["total"] or 0
    total_gas = gastos["total"] or 0
    ganancia = total_ing - total_gas

    logger.info(
        f"Resumen {inicio.strftime('%m/%Y')}: "
        f"Ingresos={total_ing} | Gastos={total_gas} | "
        f"Ganancia={ganancia} | Viajes={viajes}"
    )
    return {
        "periodo": f"{inicio} / {fin}",
        "ingresos": float(total_ing),
        "gastos": float(total_gas),
        "ganancia": float(ganancia),
        "viajes": viajes,
    }


# ============================================================
# tms_project/celery.py
# ============================================================
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tms_project.settings.production")

app = Celery("tms")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Tareas programadas
app.conf.beat_schedule = {
    "alertas-mantenimiento-diario": {
        "task": "mantenimiento.verificar_alertas",
        "schedule": crontab(hour=8, minute=0),  # 08:00 todos los días
    },
    "resumen-mensual": {
        "task": "reportes.generar_resumen_mensual",
        "schedule": crontab(day_of_month=1, hour=6, minute=0),  # Día 1 de cada mes
    },
}

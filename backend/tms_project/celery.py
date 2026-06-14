import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tms_project.settings.production")

app = Celery("tms")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "alertas-mantenimiento-diario": {
        "task": "mantenimiento.verificar_alertas",
        "schedule": crontab(hour=8, minute=0),
    },
    "resumen-mensual": {
        "task": "reportes.generar_resumen_mensual",
        "schedule": crontab(day_of_month=1, hour=6, minute=0),
    },
}

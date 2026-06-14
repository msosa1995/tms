"""
settings/local.py — Desarrollo local sin Docker (SQLite + sin Redis/Celery)
"""
from .base import *
import os

DEBUG = True
ALLOWED_HOSTS = ["*"]

# SQLite en lugar de PostgreSQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "ATOMIC_REQUESTS": True,
        "NAME": BASE_DIR / "db_local.sqlite3",
    }
}

# Sin Redis — caché en memoria
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Sin Celery
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Email en consola
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# CORS abierto para desarrollo
CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"]

# Desactivar axes (bloqueo por intentos) en local
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "axes"]
MIDDLEWARE = [m for m in MIDDLEWARE if "axes" not in m]
AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.ModelBackend"]

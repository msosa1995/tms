"""
settings/railway.py — Producción en Railway (cloud)
"""
import os

os.environ.setdefault("SECRET_KEY", "django-insecure-tms-alas-paraguay-2025-x9k-m-p-z-q8v3n")

from .base import *

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

# Sin Redis en Railway free — caché en memoria
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Celery sin worker externo
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# CORS — Vercel frontend
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# Sin axes (requiere Redis/BD extra)
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "axes"]
MIDDLEWARE = [m for m in MIDDLEWARE if "axes" not in m]
AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.ModelBackend"]

# Logging solo consola (Railway captura stdout/stderr)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING"},
        "tms":    {"handlers": ["console"], "level": "INFO"},
    },
}

# Whitenoise — archivos estáticos sin directorio local extra
STATICFILES_DIRS = []
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

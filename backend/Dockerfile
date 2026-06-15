FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=tms_project.settings.railway

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc gettext curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-prod.txt .
RUN pip install --upgrade pip && pip install -r requirements-prod.txt

COPY . .

RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD python manage.py migrate --noinput && python manage.py create_default_user && exec gunicorn tms_project.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 1 --timeout 60 --worker-tmp-dir /dev/shm --access-logfile - --error-logfile -

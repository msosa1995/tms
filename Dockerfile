FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=tms_project.settings.railway

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc gettext curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements-prod.txt .
RUN pip install --upgrade pip && pip install -r requirements-prod.txt

COPY backend/ .

RUN python manage.py collectstatic --noinput || true

EXPOSE 8080

CMD python manage.py migrate --noinput && python manage.py create_default_user && python -c "import os; from waitress import serve; from tms_project.wsgi import application; port=int(os.environ.get('PORT',8080)); print(f'Waitress serving on port {port}',flush=True); serve(application, host='0.0.0.0', port=port, threads=4)"

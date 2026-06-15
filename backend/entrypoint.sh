#!/bin/sh
python manage.py migrate --noinput
python manage.py create_default_user
exec gunicorn tms_project.wsgi --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120

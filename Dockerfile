# Dockerfile racine — permet a Render (Web Service Docker) de deployer le backend
# directement depuis la racine du depot.
#
# Pour un deploiement COMPLET (DB + Redis + Frontend + Workers), utilisez plutot
# le Blueprint via render.yaml (voir DEPLOY.md).

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=core.settings

# Dependances natives pour WeasyPrint (PDF) + psycopg
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango-1.0-0 libpangoft2-1.0-0 \
    libcairo2 libffi-dev libjpeg-dev libpq-dev \
    fonts-dejavu fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les dependances Python en premier (cache Docker layer)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt && pip install gunicorn==22.0.0

# Copier le code backend
COPY backend/ /app/

# Render injecte $PORT dynamiquement
EXPOSE 8000

# Au demarrage : migrations + seed roles + seed users + collectstatic + gunicorn
# Render execute la "Start Command" depuis Settings ; on fournit un fallback ici.
CMD ["sh", "-c", "\
    python manage.py makemigrations --noinput && \
    python manage.py migrate --noinput && \
    python manage.py seed_roles && \
    (python manage.py seed_demo_users || true) && \
    python manage.py collectstatic --noinput && \
    gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --threads 2 --timeout 60 --access-logfile -\
"]

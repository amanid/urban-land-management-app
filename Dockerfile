# Dockerfile racine — deploiement TOUT-EN-UN, 100% agnostique.
#
# Construit le frontend React et le sert depuis Django dans UN SEUL service.
# Aucune dependance externe obligatoire :
#   - SQLite par defaut, PostgreSQL si DATABASE_URL est defini
#   - Cache en memoire par defaut, Redis si REDIS_URL est defini
#   - Celery synchrone par defaut, asynchrone si REDIS_URL est defini
#   - Email console par defaut, SMTP si EMAIL_HOST est defini
#
# Une seule commande suffit pour deployer : git push.

# ============================================================================
# Stage 1 : Build du frontend React (Vite -> dist/)
# ============================================================================
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./
# URL relative -> sera servie par Django sur le meme domaine
ENV VITE_API_BASE=""
RUN npm run build

# ============================================================================
# Stage 2 : Backend Python + frontend statique servi par Django
# ============================================================================
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=core.settings \
    SERVE_FRONTEND=1

# Dependances natives WeasyPrint + Postgres + Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango-1.0-0 libpangoft2-1.0-0 \
    libcairo2 libffi-dev libjpeg-dev libpq-dev \
    fonts-dejavu fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps en premier (cache layer)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt && pip install gunicorn==22.0.0

# Code backend
COPY backend/ /app/

# Build du frontend depuis le stage 1 -> repertoire que Django sert
COPY --from=frontend-build /frontend/dist /app/frontend_dist

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

# Bootstrap 100% programmatique : detection DB, creation, migrations, seed, statics, gunicorn
CMD ["/app/entrypoint.sh"]

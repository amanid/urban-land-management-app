#!/usr/bin/env sh
# Entrypoint intelligent — 100% programmatique.
#
# 1. Detecte le type de DB (SQLite par defaut, PostgreSQL si DATABASE_URL)
# 2. Cree la base PostgreSQL si elle n'existe pas (CREATE DATABASE)
# 3. Lance les migrations
# 4. Seed les roles + comptes par defaut
# 5. Collecte les fichiers statiques
# 6. Demarre Gunicorn
#
# Aucune action manuelle requise. Le service est pret a l'emploi au boot.

set -e

echo "=================================================="
echo "  Urban Land - Bootstrap automatique"
echo "=================================================="

# -------------------------------------------------------------------
# Etape 1 : Verifier / Creer la base PostgreSQL si necessaire
# -------------------------------------------------------------------
if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -qE '^postgres'; then
    echo ""
    echo "==> PostgreSQL detecte. Verification de la base..."
    python <<PYEOF
import os, sys, time
from urllib.parse import urlparse, unquote

url = urlparse(os.environ["DATABASE_URL"])
db_name = (url.path or "").lstrip("/")
host = url.hostname
port = url.port or 5432
user = unquote(url.username or "")
password = unquote(url.password or "")

try:
    import psycopg
except ImportError:
    import psycopg2 as psycopg

# Reessais (DB peut ne pas etre prete au premier boot)
for attempt in range(12):
    try:
        conn = psycopg.connect(host=host, port=port, user=user,
                               password=password, dbname="postgres",
                               sslmode=os.environ.get("PGSSLMODE", "prefer"),
                               connect_timeout=5)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (db_name,))
        if not cur.fetchone():
            print(f"==> Creation de la base '{db_name}'...")
            cur.execute(f'CREATE DATABASE "{db_name}"')
            print(f"==> Base '{db_name}' creee.")
        else:
            print(f"==> Base '{db_name}' deja presente.")
        cur.close(); conn.close()
        sys.exit(0)
    except Exception as e:
        msg = str(e).lower()
        if "already exists" in msg:
            print(f"==> Base '{db_name}' deja presente.")
            sys.exit(0)
        if "permission denied" in msg or "must be owner" in msg or "not exist" in msg:
            # Sur Render la DB est creee par la plateforme, on n'a pas les droits CREATE DATABASE
            print(f"==> Pas de droit CREATE DATABASE (normal sur Render). On suppose qu'elle existe : {e}")
            sys.exit(0)
        print(f"  Tentative {attempt+1}/12 echouee : {e}")
        time.sleep(2)
print("==> ERREUR : impossible de se connecter a PostgreSQL apres 12 tentatives.")
sys.exit(1)
PYEOF
else
    echo ""
    echo "==> Aucun DATABASE_URL PostgreSQL -> utilisation de SQLite (zero config)"
fi

# -------------------------------------------------------------------
# Etape 2 : Migrations
# -------------------------------------------------------------------
echo ""
echo "==> Application des migrations Django..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# -------------------------------------------------------------------
# Etape 3 : Seed roles + utilisateurs par defaut
# -------------------------------------------------------------------
echo ""
echo "==> Seeding des roles et permissions..."
python manage.py seed_roles

echo ""
echo "==> Seeding des comptes utilisateurs par defaut..."
python manage.py seed_demo_users || echo "  (skip — DEMO_USERS_ENABLED=False ou erreur non bloquante)"

# -------------------------------------------------------------------
# Etape 4 : Collecte des fichiers statiques
# -------------------------------------------------------------------
echo ""
echo "==> Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

# -------------------------------------------------------------------
# Etape 5 : Demarrage de Gunicorn
# -------------------------------------------------------------------
echo ""
echo "=================================================="
echo "  Bootstrap termine. Demarrage de Gunicorn."
echo "  Port : ${PORT:-8000}"
echo "  Workers : ${WEB_CONCURRENCY:-2}"
echo "=================================================="
echo ""

exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${WEB_CONCURRENCY:-2} \
    --threads ${GUNICORN_THREADS:-2} \
    --timeout ${GUNICORN_TIMEOUT:-60} \
    --access-logfile -

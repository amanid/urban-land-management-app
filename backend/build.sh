#!/usr/bin/env bash
# Render build script — executed at every deploy.
set -o errexit

echo "===> Installing Python dependencies"
pip install --upgrade pip
pip install -r requirements.txt

echo "===> Collecting static files"
python manage.py collectstatic --noinput

echo "===> Applying database migrations"
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "===> Seeding roles & permissions"
python manage.py seed_roles

echo "===> Seeding demo users (controlled by DEMO_USERS_ENABLED)"
python manage.py seed_demo_users || echo "Demo users seeding skipped or failed."

echo "===> Build complete."

# Déploiement sur Render

Ce guide vous accompagne pas à pas pour mettre en ligne **Urban Land** sur Render (https://render.com).

## Vue d'ensemble

Render héberge 5 services interconnectés :

| Service | Type | Rôle |
|---|---|---|
| `urban-land-db` | PostgreSQL | Base de données |
| `urban-land-redis` | Redis | Cache + broker Celery |
| `urban-land-api` | Web service Python | API Django + Gunicorn |
| `urban-land-worker` | Background worker | Tâches Celery |
| `urban-land-beat` | Background worker | Planificateur Celery beat |
| `urban-land-web` | Static site | Frontend React (Vite) |

Tout est défini dans le fichier `render.yaml` à la racine du projet.

## Prérequis

1. **Compte Render gratuit** : https://dashboard.render.com (créer un compte avec GitHub)
2. **Compte GitHub** avec le code poussé dans un dépôt (public ou privé)
3. (Optionnel) Un nom de domaine personnalisé

## Étape 1 — Pousser le code sur GitHub

```bash
cd C:\Users\amani\DataspellProjects\urban-land-management-app
git init
git add .
git commit -m "Initial commit Urban Land"
git branch -M main
git remote add origin https://github.com/<votre-user>/urban-land.git
git push -u origin main
```

## Étape 2 — Créer un Blueprint sur Render

1. Allez sur https://dashboard.render.com/blueprints
2. Cliquez **New Blueprint Instance**
3. Connectez votre dépôt GitHub
4. Render lit automatiquement `render.yaml` et propose de créer :
   - 1 base PostgreSQL
   - 1 Redis
   - 1 web service API
   - 2 workers Celery
   - 1 static site Frontend
5. Cliquez **Apply**

## Étape 3 — Configurer les variables d'environnement

Render génère automatiquement :
- `SECRET_KEY` (clé Django aléatoire)
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)
- `DEMO_USERS_PASSWORD` (mot de passe initial des comptes de démo)

Variables **à renseigner manuellement** dans le service `urban-land-api` :

| Variable | Exemple | Description |
|---|---|---|
| `COMPANY_NAME` | `Ma Société Immo SARL` | Nom apparaissant sur les reçus/contrats |
| `COMPANY_ADDRESS` | `Abidjan, Côte d'Ivoire` | Adresse |
| `COMPANY_PHONE` | `+225 27 00 00 00 00` | Téléphone |
| `COMPANY_EMAIL` | `contact@example.ci` | Email |
| `COMPANY_RCCM` | `CI-ABJ-2026-B-00000` | Registre de commerce |
| `CORS_ALLOWED_ORIGINS` | `https://urban-land-web.onrender.com` | URL publique du frontend (à remplir après le 1er déploiement) |

## Étape 4 — Premier déploiement

Render démarre tout automatiquement. Surveillez :

1. **Base de données** (10 sec) → green check
2. **Redis** (10 sec) → green check
3. **API** (~3 min) :
   - Installation des dépendances Python
   - `python manage.py collectstatic`
   - `python manage.py makemigrations` + `migrate`
   - `python manage.py seed_roles`
   - `python manage.py seed_demo_users`
   - Démarrage de Gunicorn
4. **Workers Celery** (~2 min chacun)
5. **Frontend static** (~2 min) : `npm install && npm run build`

## Étape 5 — Récupérer les URLs

Une fois tout déployé :
- **API** : `https://urban-land-api.onrender.com`
- **Frontend** : `https://urban-land-web.onrender.com`
- **Admin Django** : `https://urban-land-api.onrender.com/admin/`
- **Healthcheck** : `https://urban-land-api.onrender.com/api/v1/dashboard/health/`

## Étape 6 — Mettre à jour CORS

1. Récupérez l'URL exacte du frontend depuis le dashboard
2. Dans le service `urban-land-api` → **Environment** → modifiez `CORS_ALLOWED_ORIGINS` :
   ```
   https://urban-land-web.onrender.com
   ```
3. Sauvegardez — Render redéploie l'API automatiquement (~1 min)

## Étape 7 — Première connexion

1. Ouvrez `https://urban-land-web.onrender.com`
2. Récupérez le mot de passe initial dans les **logs** du service API (cherchez "mot de passe initial:")
3. Connectez-vous avec `superadmin@urban-land.local` + ce mot de passe
4. Allez immédiatement sur **Mon profil → Mot de passe** et changez-le
5. Désactivez les comptes de démo si nécessaire :
   - Service `urban-land-api` → variables d'environnement
   - Mettez `DEMO_USERS_ENABLED=False`
   - Redéployez

## Étape 8 — Aller plus loin (production)

### Sécuriser les comptes
- Ajoutez `SECURE_SSL_REDIRECT=True` (déjà dans settings.py via `DEBUG=False`)
- Ajoutez `SECURE_HSTS_SECONDS=2592000` (30 jours)

### Surveillance
- **Logs** : onglet "Logs" de chaque service Render
- **Metrics** : CPU / RAM / Bande passante dans l'onglet "Metrics"
- **Alertes** : configurez des notifications Slack ou email

### Sauvegardes
Render fait des **snapshots quotidiens** de PostgreSQL en plan starter+.
Vous pouvez aussi exporter manuellement :

```bash
# Local
PGPASSWORD=<password> pg_dump -h <render-host> -U <user> -d urban_land > backup.sql
```

### Domaine personnalisé
1. Service `urban-land-web` → **Settings** → **Custom Domains**
2. Ajoutez `app.votre-domaine.com`
3. Configurez votre DNS : `CNAME app urban-land-web.onrender.com`
4. Mettez à jour `CORS_ALLOWED_ORIGINS` avec la nouvelle URL

### Plan payant
Le plan **free** met les services en pause après 15 min d'inactivité (réveil = 30 sec).
Pour une utilisation pro, passez en **Starter ($7/mois par service)**.

## Mise à jour de l'application

Toute modification poussée sur la branche `main` déclenche automatiquement un nouveau déploiement.

```bash
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
```

Render rebuilde et redéploie en 2-5 min.

## Dépannage

### "Service crashed during build"
- Vérifiez que `requirements.txt` est à jour
- Consultez les logs détaillés dans l'onglet "Events"

### "502 Bad Gateway"
- L'API met du temps à démarrer après une période d'inactivité (plan free)
- Patientez 30-60 secondes et rechargez

### "CORS error" dans la console du navigateur
- Vérifiez `CORS_ALLOWED_ORIGINS` dans les variables d'env de `urban-land-api`
- Assurez-vous que l'URL exacte du frontend y figure (avec `https://`)

### "Database connection refused"
- La DB Render free peut tomber pour maintenance. Vérifiez son statut dans le dashboard
- Augmentez le `--timeout` de Gunicorn si nécessaire

### "Frontend ne se charge pas"
- Vérifiez l'onglet "Logs" du service `urban-land-web`
- Confirmez que `npm run build` n'a pas d'erreur TypeScript
- Vérifiez que `staticPublishPath: dist` correspond bien à la sortie de Vite

## Coût estimé

| Plan | Coût/mois | Caractéristiques |
|---|---|---|
| **Free** | $0 | Sleep après 15min, RAM 512MB, idéal pour démo |
| **Starter** | ~$35 ($7 × 5 services) | Always-on, RAM 512MB, recommandé pour pilote |
| **Standard** | ~$125 | Pour production sérieuse, 2GB+ RAM |

---

Pour toute question, consultez la doc officielle Render : https://render.com/docs

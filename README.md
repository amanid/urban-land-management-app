# Urban Land — L'Excellence en Gestion Foncière

> **La plateforme de référence pour piloter votre patrimoine foncier urbain.**
> Catalogue géolocalisé, ventes au comptant ou échelonnées, reçus certifiés, pilotage analytique premium et anti-fraude intégré.

---

## Pourquoi Urban Land

Conçue pour les opérateurs immobiliers exigeants en quête d'excellence, de transparence et de scalabilité.

### Catalogue de lots
- Référencement complet : ville, quartier, surface (m²), prix, statut, viabilisation (eau, électricité, voirie, assainissement)
- Géolocalisation (latitude/longitude + polygone) avec visualisation cartographique
- Statuts dynamiques : disponible · réservé · vendu · en litige
- Photos et plans cadastraux

### Transactions
- **Acquisitions** (alimentation du stock)
- **Ventes** au comptant ou par versements échelonnés
- Renégociation des échéances à tout moment, règlement intégral anticipé en un clic
- **Reçus de versement** et **contrats de vente** au format PDF, certifiés
- Historique exhaustif des paiements et des actions

### Clients & documents
- Fiches détaillées : particuliers et entreprises
- Téléversement de pièces justificatives : CNI, passeport, permis, contrats signés
- Recherche et filtres avancés

### Utilisateurs & permissions
- 5 rôles : **Super administrateur**, **Administrateur**, **Agent commercial**, **Caissier**, **Lecteur**
- Permissions granulaires par module
- Journal d'audit complet (qui, quoi, quand, depuis quelle IP)
- Connexion chiffrée

### Tableau de bord & analytics
- KPIs temps réel : chiffre d'affaires, marge, recouvrement, encours
- Tableau de bord différencié : vue **Commerciale** et vue **Direction**
- Prévision de trésorerie sur 90 jours
- Scoring de risque client, cohortes, funnel de conversion
- Détection d'anomalies, ancienneté des impayés

### Sécurité anti-fraude
- Chaîne d'empreintes SHA-256 sur chaque versement (détection d'altération)
- Verrouillage automatique des ventes soldées
- Alertes en cas de surpaiement, remises anormales, IDs dupliqués
- Endpoint de vérification d'intégrité

### Notifications
- Rappels d'échéances automatiques (e-mail / SMS)
- Confirmations d'opérations
- Alertes administrateurs (retards, dépassements)

---

## Démarrage rapide

### Pré-requis
Docker Desktop **ou** (Python 3.11+, Node.js 20+, PostgreSQL 16+).

### Avec Docker (recommandé)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

**Accès** :
- Application : <http://localhost:5173>
- API : <http://localhost:8010/api/v1/>
- Console d'administration : <http://localhost:8010/admin/>
- État du service : <http://localhost:8010/api/v1/dashboard/health/>

### Comptes par défaut

| Rôle | Identifiant | Mot de passe initial |
|---|---|---|
| Super administrateur | `superadmin@urban-land.local` | `UrbanLand!2026` |
| Administrateur | `admin@urban-land.local` | `UrbanLand!2026` |
| Agent commercial | `agent@urban-land.local` | `UrbanLand!2026` |
| Caissier | `caisse@urban-land.local` | `UrbanLand!2026` |
| Lecteur | `lecteur@urban-land.local` | `UrbanLand!2026` |

> ⚠️ Changez ces mots de passe dès la première connexion. Les administrateurs peuvent créer d'autres utilisateurs depuis la page **Utilisateurs**.

### Installation locale (sans Docker)

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py seed_roles
python manage.py seed_demo_users
python manage.py runserver
```

```bash
cd frontend
npm install
npm run dev
```

---

## Structure

```
urban-land-management-app/
├── backend/         API & moteur métier
├── frontend/        Application web
└── docker-compose.yml
```

---

## Licence

Propriétaire — © 2026 KONAN Amani Dieudonné. Tous droits réservés.

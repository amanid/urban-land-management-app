"""Create one default account per role from the env-driven profile spec.

The exact emails, usernames, names and shared password come from .env (see
.env.example, section "Comptes par defaut"). This keeps deployment-specific
identities out of source code.

Disable demo accounts entirely in production by setting:
    DEMO_USERS_ENABLED=False
"""
from __future__ import annotations

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import Role

User = get_user_model()


# Each entry pulls its config from env using a fixed prefix.
PROFILES = [
    {
        "prefix": "DEMO_SUPER_ADMIN",
        "role": Role.SUPER_ADMIN,
        "default_email": "superadmin@urban-land.local",
        "default_username": "superadmin",
        "default_first": "Super",
        "default_last": "Administrateur",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "prefix": "DEMO_ADMIN",
        "role": Role.ADMIN,
        "default_email": "admin@urban-land.local",
        "default_username": "admin",
        "default_first": "Aline",
        "default_last": "Administratrice",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "prefix": "DEMO_AGENT",
        "role": Role.SALES_AGENT,
        "default_email": "agent@urban-land.local",
        "default_username": "agent",
        "default_first": "Yao",
        "default_last": "Commercial",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "prefix": "DEMO_CASHIER",
        "role": Role.CASHIER,
        "default_email": "caisse@urban-land.local",
        "default_username": "caisse",
        "default_first": "Awa",
        "default_last": "Caisse",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "prefix": "DEMO_VIEWER",
        "role": Role.VIEWER,
        "default_email": "lecteur@urban-land.local",
        "default_username": "lecteur",
        "default_first": "Kofi",
        "default_last": "Lecteur",
        "is_staff": False,
        "is_superuser": False,
    },
]


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


class Command(BaseCommand):
    help = (
        "Cree un utilisateur par defaut pour chaque role, a partir des "
        "variables d'environnement DEMO_*. Voir .env.example pour la liste."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Reinitialise le mot de passe et le profil des comptes existants.",
        )
        parser.add_argument(
            "--password", default=None,
            help="Surcharge le mot de passe partage (sinon DEMO_USERS_PASSWORD).",
        )

    def handle(self, *args, **options):
        enabled = _truthy(os.environ.get("DEMO_USERS_ENABLED", "True"))
        if not enabled:
            self.stdout.write(self.style.WARNING(
                "DEMO_USERS_ENABLED=False -> aucun compte de demonstration cree."
            ))
            return

        password = options["password"] or os.environ.get(
            "DEMO_USERS_PASSWORD", "UrbanLand!2026"
        )
        force = options["force"]

        self.stdout.write(self.style.NOTICE(
            f"\nCreation des comptes par defaut (mot de passe initial: {password})."
            "\nMot de passe a changer apres la premiere connexion.\n"
        ))

        for profile in PROFILES:
            self._provision(profile, password, force)

        self.stdout.write(self.style.SUCCESS(
            "\nComptes prets. Utilisez la page Utilisateurs pour creer d'autres comptes.\n"
        ))

    def _provision(self, profile: dict, password: str, force: bool):
        prefix = profile["prefix"]
        email = os.environ.get(f"{prefix}_EMAIL", profile["default_email"]).strip()
        username = os.environ.get(f"{prefix}_USERNAME", profile["default_username"]).strip()
        first = os.environ.get(f"{prefix}_FIRST_NAME", profile["default_first"]).strip()
        last = os.environ.get(f"{prefix}_LAST_NAME", profile["default_last"]).strip()

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username, "first_name": first, "last_name": last,
                "role": profile["role"],
                "is_staff": profile["is_staff"],
                "is_superuser": profile["is_superuser"],
                "is_active": True,
            },
        )
        if created or force:
            user.username = username
            user.first_name = first
            user.last_name = last
            user.role = profile["role"]
            user.is_staff = profile["is_staff"]
            user.is_superuser = profile["is_superuser"]
            user.is_active = True
            user.set_password(password)
            user.save()

        verb = "Cree" if created else ("Reinitialise" if force else "Existe deja")
        pw_label = password if (created or force) else "*** inchange ***"
        self.stdout.write(self.style.SUCCESS(
            f"  - {verb}: {email}  (role: {profile['role']}, "
            f"identifiant: {username}, mot de passe: {pw_label})"
        ))

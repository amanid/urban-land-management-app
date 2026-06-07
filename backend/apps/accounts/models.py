"""User and role models.

We expose 5 functional roles via Django Groups:
    - super_admin : everything, system level
    - admin       : manages catalogue, users (except super_admin), transactions
    - sales_agent : creates lots, manages clients, opens sales
    - cashier     : registers payments, prints receipts
    - viewer      : read-only

Granular permissions are Django's built-in per-model `add/change/delete/view`
permissions, plus the custom permissions declared on each domain model.
"""
from __future__ import annotations

from django.contrib.auth.models import AbstractUser, Group
from django.db import models
from django.utils.translation import gettext_lazy as _
from phonenumber_field.modelfields import PhoneNumberField


class Role(models.TextChoices):
    SUPER_ADMIN = "super_admin", _("Super administrateur")
    ADMIN = "admin", _("Administrateur")
    SALES_AGENT = "sales_agent", _("Agent commercial")
    CASHIER = "cashier", _("Caissier")
    VIEWER = "viewer", _("Lecteur")


class User(AbstractUser):
    """Custom user keyed by email (username remains as a fallback handle)."""

    email = models.EmailField(_("Adresse e-mail"), unique=True)
    phone = PhoneNumberField(_("Téléphone"), blank=True, null=True)
    role = models.CharField(
        _("Rôle"),
        max_length=32,
        choices=Role.choices,
        default=Role.VIEWER,
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    is_locked = models.BooleanField(default=False, help_text=_("Bloque le compte sans le supprimer."))
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = _("Utilisateur")
        verbose_name_plural = _("Utilisateurs")
        ordering = ("last_name", "first_name")

    def __str__(self) -> str:
        return self.get_full_name() or self.email

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._sync_group_from_role()

    def _sync_group_from_role(self):
        group, _ = Group.objects.get_or_create(name=self.role)
        self.groups.set([group])

    @property
    def is_super_admin(self) -> bool:
        return self.role == Role.SUPER_ADMIN or self.is_superuser

    @property
    def is_admin_level(self) -> bool:
        return self.role in {Role.SUPER_ADMIN, Role.ADMIN} or self.is_superuser

    @property
    def can_manage_sales(self) -> bool:
        return self.role in {Role.SUPER_ADMIN, Role.ADMIN, Role.SALES_AGENT}

    @property
    def can_record_payments(self) -> bool:
        return self.role in {Role.SUPER_ADMIN, Role.ADMIN, Role.CASHIER}

"""Client (acheteurs/vendeurs) and their identity / contract documents."""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from phonenumber_field.modelfields import PhoneNumberField


class ClientKind(models.TextChoices):
    INDIVIDUAL = "individual", _("Particulier")
    COMPANY = "company", _("Entreprise")


class IdDocumentKind(models.TextChoices):
    CNI = "cni", _("CNI")
    PASSPORT = "passport", _("Passeport")
    DRIVER_LICENSE = "driver_license", _("Permis de conduire")
    RESIDENT_CARD = "resident_card", _("Carte de séjour")
    OTHER = "other", _("Autre")


class Client(models.Model):
    code = models.CharField(
        _("Code client"), max_length=32, unique=True, blank=True,
        help_text=_("Format: CLT-ANNEE-XXXXXXXX"),
    )
    kind = models.CharField(
        _("Type"), max_length=16, choices=ClientKind.choices, default=ClientKind.INDIVIDUAL,
    )

    # Individual
    first_name = models.CharField(_("Prénom"), max_length=80, blank=True, default="")
    last_name = models.CharField(_("Nom"), max_length=80, blank=True, default="")

    # Company
    company_name = models.CharField(_("Raison sociale"), max_length=200, blank=True, default="")
    company_rccm = models.CharField(_("RCCM"), max_length=80, blank=True, default="")
    contact_person = models.CharField(_("Personne à contacter"), max_length=120, blank=True, default="")

    # Contact
    email = models.EmailField(blank=True, default="")
    phone = PhoneNumberField(_("Téléphone"), blank=True, null=True)
    phone_secondary = PhoneNumberField(_("Téléphone secondaire"), blank=True, null=True)
    address = models.TextField(_("Adresse"), blank=True, default="")
    city = models.CharField(_("Ville"), max_length=120, blank=True, default="")
    country = models.CharField(_("Pays"), max_length=80, default="Côte d'Ivoire")

    # Identity (primary doc)
    id_kind = models.CharField(
        _("Type de pièce"), max_length=20,
        choices=IdDocumentKind.choices, blank=True, default="",
    )
    id_number = models.CharField(_("N° de pièce"), max_length=80, blank=True, default="")
    id_issued_on = models.DateField(null=True, blank=True)
    id_expires_on = models.DateField(null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    birth_place = models.CharField(max_length=120, blank=True, default="")
    nationality = models.CharField(max_length=80, blank=True, default="Ivoirienne")
    profession = models.CharField(max_length=120, blank=True, default="")

    notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        verbose_name = _("Client")
        verbose_name_plural = _("Clients")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("last_name", "first_name")),
            models.Index(fields=("company_name",)),
        ]

    def __str__(self) -> str:
        return self.display_name

    @property
    def display_name(self) -> str:
        if self.kind == ClientKind.COMPANY and self.company_name:
            return self.company_name
        full = f"{self.last_name} {self.first_name}".strip()
        return full or self.email or self.code

    def save(self, *args, **kwargs):
        if not self.code:
            from apps.common.identifiers import unique_identifier
            self.code = unique_identifier(type(self), "code", "CLT", width=8)
        super().save(*args, **kwargs)


def _client_doc_path(instance, filename):
    return f"clients/{instance.client.code}/{uuid.uuid4().hex}-{filename}"


class ClientDocumentKind(models.TextChoices):
    CNI = "cni", _("CNI")
    PASSPORT = "passport", _("Passeport")
    DRIVER_LICENSE = "driver_license", _("Permis de conduire")
    RESIDENT_CARD = "resident_card", _("Carte de séjour")
    SALE_CONTRACT = "sale_contract", _("Contrat de vente signé")
    PURCHASE_CONTRACT = "purchase_contract", _("Contrat d'achat signé")
    PROOF_OF_ADDRESS = "proof_of_address", _("Justificatif de domicile")
    BANK_STATEMENT = "bank_statement", _("Relevé bancaire")
    POWER_OF_ATTORNEY = "power_of_attorney", _("Procuration")
    OTHER = "other", _("Autre")


class ClientDocument(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="documents")
    kind = models.CharField(_("Type"), max_length=32, choices=ClientDocumentKind.choices)
    label = models.CharField(_("Libellé"), max_length=200, blank=True, default="")
    file = models.FileField(upload_to=_client_doc_path)
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ("-uploaded_at",)

    def __str__(self) -> str:
        return f"{self.client.display_name} — {self.get_kind_display()}"

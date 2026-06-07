"""Lot catalogue: cities, neighborhoods, lots, photos, utility connections."""
from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        abstract = True


class City(TimestampedModel):
    name = models.CharField(_("Ville"), max_length=120, unique=True)
    country = models.CharField(_("Pays"), max_length=80, default="Côte d'Ivoire")
    region = models.CharField(_("Région"), max_length=120, blank=True, default="")

    class Meta:
        verbose_name = _("Ville")
        verbose_name_plural = _("Villes")
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Neighborhood(TimestampedModel):
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="neighborhoods")
    name = models.CharField(_("Quartier"), max_length=120)

    class Meta:
        verbose_name = _("Quartier")
        verbose_name_plural = _("Quartiers")
        unique_together = ("city", "name")
        ordering = ("city__name", "name")

    def __str__(self) -> str:
        return f"{self.name} ({self.city.name})"


class LotStatus(models.TextChoices):
    AVAILABLE = "available", _("Disponible")
    RESERVED = "reserved", _("Réservé")
    SOLD = "sold", _("Vendu")
    LITIGATION = "litigation", _("En litige")
    OFF_MARKET = "off_market", _("Retiré du marché")


class LotType(models.TextChoices):
    RESIDENTIAL = "residential", _("Résidentiel")
    COMMERCIAL = "commercial", _("Commercial")
    INDUSTRIAL = "industrial", _("Industriel")
    AGRICULTURAL = "agricultural", _("Agricole")
    MIXED = "mixed", _("Mixte")


class Lot(TimestampedModel):
    """A parcel of land available for sale."""

    reference = models.CharField(
        _("Référence"), max_length=48, unique=True, blank=True,
        help_text=_("Code unique sémantique, attribué automatiquement si vide. "
                    "Format: LOT-VILLE-ANNEE-XXXXXXXX."),
    )
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="lots")
    neighborhood = models.ForeignKey(
        Neighborhood, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="lots",
    )
    title = models.CharField(_("Désignation"), max_length=200)
    description = models.TextField(_("Description"), blank=True, default="")
    lot_type = models.CharField(
        _("Type"), max_length=24,
        choices=LotType.choices, default=LotType.RESIDENTIAL,
    )
    cadastral_ref = models.CharField(
        _("Référence cadastrale"), max_length=120, blank=True, default="",
    )

    # Decoupage cadastral / lotissement
    ilot = models.CharField(
        _("Ilot"), max_length=32, blank=True, default="",
        help_text=_("Numero / code d'ilot dans le lotissement (ex: A, 12, IL-04)."),
    )
    lot_number = models.CharField(
        _("N° de lot"), max_length=32, blank=True, default="",
        help_text=_("Numero du lot dans son ilot (ex: 5, 12B)."),
    )
    subdivision_name = models.CharField(
        _("Nom du lotissement"), max_length=200, blank=True, default="",
    )
    village = models.CharField(
        _("Village"), max_length=120, blank=True, default="",
        help_text=_("Nom du village si different du quartier."),
    )
    region = models.CharField(
        _("Region"), max_length=120, blank=True, default="",
        help_text=_("Region administrative."),
    )

    # Geometry
    surface_m2 = models.DecimalField(
        _("Surface (m²)"), max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    latitude = models.DecimalField(
        _("Latitude"), max_digits=9, decimal_places=6, null=True, blank=True,
    )
    longitude = models.DecimalField(
        _("Longitude"), max_digits=9, decimal_places=6, null=True, blank=True,
    )
    polygon = models.JSONField(
        _("Polygone (GeoJSON)"), null=True, blank=True,
        help_text=_("Tableau de coordonnées [lng, lat] délimitant le lot."),
    )

    # Pricing
    purchase_price = models.DecimalField(
        _("Prix d'achat"), max_digits=14, decimal_places=2,
        default=Decimal("0"),
        help_text=_("Coût d'acquisition initial."),
    )
    asking_price = models.DecimalField(
        _("Prix de vente affiché"), max_digits=14, decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    currency = models.CharField(_("Devise"), max_length=8, default="XOF")

    # Status
    status = models.CharField(
        _("Statut"), max_length=24,
        choices=LotStatus.choices, default=LotStatus.AVAILABLE, db_index=True,
    )

    # Utilities (denormalised summary; details live in UtilityConnection)
    has_water = models.BooleanField(_("Eau"), default=False)
    has_electricity = models.BooleanField(_("Électricité"), default=False)
    has_road_access = models.BooleanField(_("Voirie"), default=False)
    has_sewage = models.BooleanField(_("Assainissement"), default=False)
    has_internet = models.BooleanField(_("Internet"), default=False)
    has_title_deed = models.BooleanField(_("Titre foncier"), default=False)

    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = _("Lot")
        verbose_name_plural = _("Lots")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("status", "city")),
            models.Index(fields=("city", "neighborhood")),
        ]

    def __str__(self) -> str:
        return f"{self.reference} — {self.title}"

    @property
    def is_serviced(self) -> bool:
        return all([self.has_water, self.has_electricity, self.has_road_access])

    @property
    def price_per_m2(self) -> Decimal:
        if self.surface_m2 and self.surface_m2 > 0:
            return (self.asking_price / self.surface_m2).quantize(Decimal("0.01"))
        return Decimal("0")

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._generate_reference()
        super().save(*args, **kwargs)

    def _generate_reference(self) -> str:
        from apps.common.identifiers import unique_identifier
        city_code = (self.city.name[:3] if self.city_id else "LOT").upper()
        # Format: LOT-CITY-YYYY-XXXXXXXX  (~4B combinations per city/year)
        ident = unique_identifier(type(self), "reference", f"LOT-{city_code}", width=8)
        return ident


def _lot_photo_path(instance, filename):
    return f"lots/{instance.lot.reference}/{uuid.uuid4().hex}-{filename}"


class LotPhoto(TimestampedModel):
    lot = models.ForeignKey(Lot, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to=_lot_photo_path)
    caption = models.CharField(max_length=200, blank=True, default="")
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ("-is_primary", "-created_at")


def _lot_doc_path(instance, filename):
    return f"lots/{instance.lot.reference}/docs/{uuid.uuid4().hex}-{filename}"


class LotDocumentKind(models.TextChoices):
    TITLE_DEED = "title_deed", _("Titre foncier")
    CADASTRAL_PLAN = "cadastral_plan", _("Plan cadastral")
    LAND_SURVEY = "land_survey", _("Levé topographique")
    PURCHASE_DEED = "purchase_deed", _("Acte d'achat")
    EVALUATION = "evaluation", _("Évaluation")
    BUILDING_PERMIT = "building_permit", _("Permis de construire")
    OCCUPANCY_PERMIT = "occupancy_permit", _("Permis d'occupation")
    AERIAL_PHOTO = "aerial_photo", _("Photo aérienne")
    UTILITY_LETTER = "utility_letter", _("Attestation de viabilisation")
    OTHER = "other", _("Autre")


class LotDocument(models.Model):
    """Files attached to a lot (title deed, plans, permits, evaluations)."""

    lot = models.ForeignKey(Lot, on_delete=models.CASCADE, related_name="documents")
    kind = models.CharField(_("Type"), max_length=32, choices=LotDocumentKind.choices)
    label = models.CharField(_("Libellé"), max_length=200, blank=True, default="")
    file = models.FileField(upload_to=_lot_doc_path)
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
        return f"{self.lot.reference} — {self.get_kind_display()}"


class UtilityConnection(TimestampedModel):
    """Detailed status of one utility for a lot (operator, distance, cost…)."""

    class UtilityKind(models.TextChoices):
        WATER = "water", _("Eau")
        ELECTRICITY = "electricity", _("Électricité")
        ROAD = "road", _("Voirie")
        SEWAGE = "sewage", _("Assainissement")
        INTERNET = "internet", _("Internet")
        GAS = "gas", _("Gaz")

    lot = models.ForeignKey(Lot, on_delete=models.CASCADE, related_name="utilities")
    kind = models.CharField(max_length=24, choices=UtilityKind.choices)
    is_connected = models.BooleanField(default=False)
    operator = models.CharField(max_length=120, blank=True, default="")
    distance_m = models.PositiveIntegerField(null=True, blank=True)
    connection_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"),
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        unique_together = ("lot", "kind")
        ordering = ("lot", "kind")

"""Polymorphic notes and tags on any business entity.

Notes give users a way to leave contextual comments on Lots, Clients, Sales,
Payments, etc. Tags allow free-form categorisation. Both work via Django's
contenttype framework so any model can carry them without a migration.
"""
from __future__ import annotations

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _


class Tag(models.Model):
    """Reusable tag — colored badge applied to any entity."""

    name = models.CharField(_("Nom"), max_length=64, unique=True)
    color = models.CharField(
        _("Couleur"), max_length=20, default="brand",
        help_text=_("Une de: brand, emerald, amber, rose, violet, slate"),
    )
    description = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        verbose_name = _("Étiquette")
        verbose_name_plural = _("Étiquettes")
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class TaggedItem(models.Model):
    """Application d'un Tag à un objet."""

    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name="items")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        unique_together = ("tag", "content_type", "object_id")
        indexes = [models.Index(fields=("content_type", "object_id"))]


class Note(models.Model):
    """Commentaire libre attaché à un objet métier (Lot, Client, Sale…)."""

    VISIBILITY = (
        ("internal", _("Interne (équipe)")),
        ("private", _("Privée (auteur seul)")),
    )

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    body = models.TextField(_("Texte"))
    visibility = models.CharField(
        _("Visibilité"), max_length=12,
        choices=VISIBILITY, default="internal",
    )
    pinned = models.BooleanField(_("Épinglée"), default=False)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="authored_notes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-pinned", "-created_at")
        indexes = [models.Index(fields=("content_type", "object_id"))]

    def __str__(self) -> str:
        return f"Note de {self.author} sur {self.content_object}"

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    ACTIONS = (
        ("create", "Création"),
        ("update", "Modification"),
        ("delete", "Suppression"),
        ("login", "Connexion"),
        ("logout", "Déconnexion"),
        ("payment", "Versement"),
        ("status_change", "Changement de statut"),
        ("export", "Export"),
        ("print", "Impression"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="audit_logs",
    )
    action = models.CharField(max_length=32, choices=ACTIONS)
    entity = models.CharField(max_length=64)
    entity_id = models.CharField(max_length=64, blank=True, default="")
    description = models.TextField(blank=True, default="")
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("entity", "entity_id")),
            models.Index(fields=("-created_at",)),
        ]

    def __str__(self) -> str:
        who = self.user.email if self.user else "anonymous"
        return f"{self.created_at:%Y-%m-%d %H:%M} | {who} | {self.action} | {self.entity}#{self.entity_id}"

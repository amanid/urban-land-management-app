from django.conf import settings
from django.db import models


class Notification(models.Model):
    """In-app notification (the React UI polls /unread)."""

    KIND = (
        ("payment_received", "Versement reçu"),
        ("installment_due", "Échéance proche"),
        ("installment_overdue", "Échéance en retard"),
        ("sale_completed", "Vente soldée"),
        ("lot_reserved", "Lot réservé"),
        ("system", "Système"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications",
    )
    kind = models.CharField(max_length=32, choices=KIND, default="system")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True, default="")
    link = models.CharField(max_length=300, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"[{self.kind}] {self.title}"

"""Keep installment & sale status in sync with payments."""
from decimal import Decimal

from django.db.models import Sum
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Installment, Payment


@receiver([post_save, post_delete], sender=Payment)
def update_sale_state(sender, instance: Payment, **kwargs):
    sale = instance.sale
    if instance.installment_id:
        inst = instance.installment
        paid = (inst.payments.filter(is_void=False)
                .aggregate(s=Sum("amount"))["s"]) or Decimal("0")
        inst.amount_paid = paid
        inst.save(update_fields=["amount_paid"])
        inst.refresh_status()
    sale.refresh_status_from_payments()

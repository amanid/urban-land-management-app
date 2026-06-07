"""Celery tasks: reminders + email/SMS dispatch."""
from datetime import timedelta
from decimal import Decimal

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.transactions.models import Installment, InstallmentStatus

from .models import Notification


@shared_task
def scan_overdue_installments():
    """Mark overdue instalments + create notifications for the agent."""
    today = timezone.localdate()
    n = 0
    qs = Installment.objects.filter(
        status__in=[InstallmentStatus.PENDING, InstallmentStatus.PARTIAL],
        due_on__lt=today,
    ).select_related("plan__sale__agent", "plan__sale__client", "plan__sale__lot")
    for inst in qs:
        inst.refresh_status()
        agent = inst.plan.sale.agent
        if not agent:
            continue
        Notification.objects.create(
            user=agent,
            kind="installment_overdue",
            title=f"Échéance en retard — {inst.plan.sale.reference}",
            body=(f"L'échéance n°{inst.position} ({inst.amount_due} {inst.plan.sale.currency}) "
                  f"de {inst.plan.sale.client.display_name} est en retard."),
            link=f"/sales/{inst.plan.sale_id}",
        )
        n += 1
    return n


@shared_task
def scan_upcoming_installments(days=3):
    """Send a reminder J-3 by default for instalments coming due."""
    deadline = timezone.localdate() + timedelta(days=days)
    n = 0
    qs = Installment.objects.filter(
        status__in=[InstallmentStatus.PENDING, InstallmentStatus.PARTIAL],
        due_on__lte=deadline, due_on__gte=timezone.localdate(),
    ).select_related("plan__sale__client", "plan__sale__agent")
    for inst in qs:
        client = inst.plan.sale.client
        if client.email:
            try:
                send_mail(
                    subject=f"Rappel d'échéance — vente {inst.plan.sale.reference}",
                    message=(
                        f"Bonjour {client.display_name},\n\n"
                        f"Nous vous rappelons que l'échéance n°{inst.position} "
                        f"d'un montant de {inst.amount_due} {inst.plan.sale.currency} "
                        f"arrive à échéance le {inst.due_on:%d/%m/%Y}.\n\n"
                        f"Référence vente : {inst.plan.sale.reference}\n"
                        f"Cordialement,\n{settings.COMPANY['name']}"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[client.email],
                    fail_silently=True,
                )
            except Exception:
                pass
        n += 1
    return n


@shared_task
def send_email(subject: str, body: str, to: list[str]):
    return send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, to, fail_silently=True)

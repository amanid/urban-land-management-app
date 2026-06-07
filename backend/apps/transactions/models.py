"""Acquisitions, sales and payments.

Lifecycle of a sale:
    1. Sale is opened by an agent (status=draft) for a lot+client.
    2. When validated the lot moves to "reserved".
    3. A PaymentPlan is attached: either CASH (1 instalment due now)
       or INSTALLMENT (N instalments with due dates).
    4. Payments are recorded against instalments; each one prints a receipt.
    5. When the total paid >= sale price, the sale is "completed" and the lot
       becomes "sold".
"""
from __future__ import annotations

import hashlib
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.clients.models import Client
from apps.common.identifiers import unique_identifier
from apps.lots.models import Lot, LotStatus


# ---------------------------------------------------------------------------
# Acquisitions (achats de terrains pour le stock)
# ---------------------------------------------------------------------------
class AcquisitionStatus(models.TextChoices):
    DRAFT = "draft", _("Brouillon")
    CONFIRMED = "confirmed", _("Confirmée")
    CANCELLED = "cancelled", _("Annulée")


class Acquisition(models.Model):
    reference = models.CharField(max_length=32, unique=True, blank=True,
                                 help_text=_("Format: ACQ-ANNEE-XXXXXXXX"))
    lot = models.ForeignKey(Lot, on_delete=models.PROTECT, related_name="acquisitions")
    seller = models.ForeignKey(
        Client, on_delete=models.PROTECT,
        related_name="acquisitions_as_seller",
        null=True, blank=True,
    )
    seller_name = models.CharField(
        _("Nom du vendeur (si pas client)"),
        max_length=200, blank=True, default="",
    )
    acquired_on = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(_("Montant"), max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=8, default="XOF")
    status = models.CharField(
        max_length=16, choices=AcquisitionStatus.choices,
        default=AcquisitionStatus.DRAFT, db_index=True,
    )
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ("-acquired_on", "-id")

    def __str__(self) -> str:
        return f"{self.reference} — {self.lot.reference}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = unique_identifier(type(self), "reference", "ACQ", width=8)
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Sales
# ---------------------------------------------------------------------------
class PaymentMode(models.TextChoices):
    CASH = "cash", _("Comptant")
    INSTALLMENT = "installment", _("Échelonné")


class SaleStatus(models.TextChoices):
    DRAFT = "draft", _("Brouillon")
    RESERVED = "reserved", _("Réservé")
    IN_PROGRESS = "in_progress", _("En cours de paiement")
    COMPLETED = "completed", _("Soldée")
    CANCELLED = "cancelled", _("Annulée")
    LITIGATION = "litigation", _("En litige")
    WITHDRAWN_BUYER = "withdrawn_buyer", _("Désistement acheteur")
    WITHDRAWN_SELLER = "withdrawn_seller", _("Désistement vendeur")


class Sale(models.Model):
    reference = models.CharField(max_length=32, unique=True, blank=True,
                                 help_text=_("Format: VTE-ANNEE-XXXXXXXX"))
    lot = models.ForeignKey(Lot, on_delete=models.PROTECT, related_name="sales")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="sales")
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="sales_as_agent",
    )

    sold_on = models.DateField(default=timezone.localdate)
    price = models.DecimalField(_("Prix de vente"), max_digits=14, decimal_places=2)
    discount = models.DecimalField(_("Remise"), max_digits=14, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=8, default="XOF")

    payment_mode = models.CharField(
        max_length=16, choices=PaymentMode.choices, default=PaymentMode.CASH,
    )
    down_payment = models.DecimalField(
        _("Apport initial"), max_digits=14, decimal_places=2, default=Decimal("0"),
    )
    installment_count = models.PositiveSmallIntegerField(
        _("Nombre d'échéances"), default=1,
    )
    installment_frequency_days = models.PositiveSmallIntegerField(
        _("Fréquence (jours)"), default=30,
    )

    status = models.CharField(
        max_length=16, choices=SaleStatus.choices,
        default=SaleStatus.DRAFT, db_index=True,
    )

    contract_signed_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ("-sold_on", "-id")
        indexes = [
            models.Index(fields=("status", "sold_on")),
        ]

    def __str__(self) -> str:
        return f"{self.reference} — {self.lot.reference} → {self.client.display_name}"

    @property
    def net_amount(self) -> Decimal:
        return (self.price or Decimal("0")) - (self.discount or Decimal("0"))

    @property
    def total_paid(self) -> Decimal:
        """Somme des versements (paiements) MOINS les remboursements deja effectues.

        Cette grandeur represente l'encaissement net sur la vente. Lors d'un
        desistement, un Payment de remboursement est cree avec is_refund=True,
        ce qui reduit naturellement le total_paid.
        """
        paid = (self.payments.filter(is_void=False, is_refund=False)
                .aggregate(s=models.Sum("amount"))["s"]) or Decimal("0")
        refunded = (self.payments.filter(is_void=False, is_refund=True)
                    .aggregate(s=models.Sum("amount"))["s"]) or Decimal("0")
        return paid - refunded

    @property
    def total_refunded(self) -> Decimal:
        return (self.payments.filter(is_void=False, is_refund=True)
                .aggregate(s=models.Sum("amount"))["s"]) or Decimal("0")

    @property
    def balance_due(self) -> Decimal:
        return self.net_amount - self.total_paid

    @property
    def progress_pct(self) -> float:
        if self.net_amount <= 0:
            return 0.0
        return float((self.total_paid / self.net_amount) * 100)

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = unique_identifier(type(self), "reference", "VTE", width=8)
        super().save(*args, **kwargs)

    def clean(self):
        if self.lot_id and self.lot.status == LotStatus.SOLD and self.pk is None:
            raise ValidationError({"lot": "Ce lot est déjà vendu."})
        if self.payment_mode == PaymentMode.CASH and self.installment_count != 1:
            self.installment_count = 1
        if self.down_payment > self.net_amount:
            raise ValidationError({"down_payment": "L'apport ne peut excéder le montant net."})

    @transaction.atomic
    def confirm(self):
        """Move from DRAFT to RESERVED + create the payment plan + reserve lot."""
        if self.status != SaleStatus.DRAFT:
            raise ValidationError("Seule une vente en brouillon peut être confirmée.")
        self.status = SaleStatus.RESERVED
        self.save(update_fields=["status"])

        plan, _ = PaymentPlan.objects.get_or_create(sale=self)
        plan.generate_installments()

        if self.lot.status not in (LotStatus.RESERVED, LotStatus.SOLD):
            self.lot.status = LotStatus.RESERVED
            self.lot.save(update_fields=["status"])

    @transaction.atomic
    def refresh_status_from_payments(self):
        """Re-evaluate status based on cumulative payments.

        When the cumulative paid amount reaches the net amount, the sale is
        automatically marked as COMPLETED — regardless of whether installments
        were planned. This supports early/full settlement at any time.

        Withdrawn or cancelled sales are immutable here (we won't bring them
        back to IN_PROGRESS just because total_paid > 0).
        """
        # Terminal states are immutable
        if self.status in (
            SaleStatus.CANCELLED,
            SaleStatus.WITHDRAWN_BUYER,
            SaleStatus.WITHDRAWN_SELLER,
        ):
            return

        paid = self.total_paid
        net = self.net_amount
        if paid <= 0 and self.status in (SaleStatus.RESERVED, SaleStatus.IN_PROGRESS):
            return
        if paid >= net:
            self.status = SaleStatus.COMPLETED
            self.lot.status = LotStatus.SOLD
            self.lot.save(update_fields=["status"])
            # Close any still-pending instalments (overpayments collapse to PAID)
            if hasattr(self, "payment_plan"):
                for inst in self.payment_plan.installments.all():
                    if inst.status != InstallmentStatus.PAID:
                        inst.amount_paid = max(inst.amount_paid, inst.amount_due)
                        inst.save(update_fields=["amount_paid"])
                        inst.refresh_status()
        elif paid > 0:
            self.status = SaleStatus.IN_PROGRESS
        self.save(update_fields=["status"])

    @transaction.atomic
    def renegotiate_plan(self, *, payment_mode=None, installment_count=None,
                        installment_frequency_days=None, down_payment=None,
                        late_fee_rate=None):
        """Update the payment terms and regenerate the remaining schedule.

        Allowed only while the sale is not yet COMPLETED or CANCELLED.
        Only future (non-paid) instalments are rebuilt; paid history stands.
        """
        if self.status in (SaleStatus.COMPLETED, SaleStatus.CANCELLED):
            raise ValidationError("Une vente soldée ou annulée ne peut être renégociée.")

        updates = []
        if payment_mode is not None and payment_mode != self.payment_mode:
            self.payment_mode = payment_mode
            updates.append("payment_mode")
        if installment_count is not None:
            self.installment_count = max(1, int(installment_count))
            updates.append("installment_count")
        if installment_frequency_days is not None:
            self.installment_frequency_days = max(1, int(installment_frequency_days))
            updates.append("installment_frequency_days")
        if down_payment is not None:
            self.down_payment = down_payment
            updates.append("down_payment")
        if updates:
            self.save(update_fields=updates)

        plan, _ = PaymentPlan.objects.get_or_create(sale=self)
        if late_fee_rate is not None:
            plan.late_fee_rate = late_fee_rate
            plan.save(update_fields=["late_fee_rate"])
        plan.regenerate_remaining_schedule()

    @transaction.atomic
    def settle_in_full(self, *, paid_on=None, method="cash", reference="",
                      received_by=None) -> "Payment":
        """Create one payment covering the entire outstanding balance.

        Convenience for the cashier to clear the sale in a single click when
        the client wants to pay everything off ahead of schedule.
        """
        balance = self.balance_due
        if balance <= 0:
            raise ValidationError("Aucun solde restant sur cette vente.")
        payment = Payment.objects.create(
            sale=self,
            paid_on=paid_on or timezone.localdate(),
            amount=balance,
            currency=self.currency,
            method=method,
            reference=reference,
            notes="Règlement intégral anticipé.",
            received_by=received_by,
        )
        return payment

    @transaction.atomic
    def withdraw(self, *, by: str, reason: str, penalty_amount=None,
                 declared_by=None) -> "Withdrawal":
        """Record a withdrawal from buyer or seller.

        `by`            : "buyer" or "seller"
        `reason`        : mandatory explanation (anti-fraud)
        `penalty_amount`: amount retained from already-collected payments
                          (default: 10% of total paid).

        Effects:
        - Sale moves to WITHDRAWN_BUYER or WITHDRAWN_SELLER
        - Lot is freed (becomes "available")
        - Open instalments are cancelled
        - A Withdrawal record carries the audit trail + refund computation
        """
        if by not in ("buyer", "seller"):
            raise ValidationError("Partie inconnue (acheteur ou vendeur attendus).")
        if not reason or not reason.strip():
            raise ValidationError("Le motif du désistement est obligatoire.")
        if self.status in (SaleStatus.COMPLETED, SaleStatus.CANCELLED,
                           SaleStatus.WITHDRAWN_BUYER, SaleStatus.WITHDRAWN_SELLER):
            raise ValidationError("Cette vente ne peut plus être désistée.")

        paid = self.total_paid
        penalty = Decimal(penalty_amount) if penalty_amount is not None else (paid * Decimal("0.10"))
        penalty = min(penalty, paid)  # never withhold more than what was paid
        refund = paid - penalty

        # 1) Update sale status
        self.status = (SaleStatus.WITHDRAWN_BUYER if by == "buyer"
                       else SaleStatus.WITHDRAWN_SELLER)
        self.save(update_fields=["status"])

        # 2) Free the lot back to the catalogue (available immediately for resale)
        if self.lot.status in (LotStatus.RESERVED, LotStatus.SOLD):
            self.lot.status = LotStatus.AVAILABLE
            self.lot.save(update_fields=["status"])

        # 3) Record the withdrawal (audit trail with mandatory reason)
        wd, _ = Withdrawal.objects.update_or_create(
            sale=self,
            defaults={
                "by": by,
                "reason": reason,
                "penalty_amount": penalty,
                "refund_amount": refund,
                "declared_by": declared_by,
            },
        )

        # 4) Create the refund Payment so the client is effectively reimbursed.
        # This appears in the integrity chain and reduces `total_paid` naturally.
        if refund > 0:
            Payment.objects.create(
                sale=self,
                paid_on=timezone.localdate(),
                amount=refund,
                currency=self.currency,
                method=PaymentMethod.BANK_TRANSFER,
                reference=f"REMBOURSEMENT {wd.get_by_display()}",
                notes=(f"Remboursement suite au désistement {wd.get_by_display()}. "
                       f"Pénalité retenue : {penalty} {self.currency}. "
                       f"Motif : {reason[:200]}"),
                is_refund=True,
                received_by=declared_by,
            )
        return wd


class Withdrawal(models.Model):
    """Désistement (acheteur ou vendeur) d'une vente echelonnee.

    Trace le motif, calcule la penalite eventuelle et le solde a rembourser.
    """

    BY_CHOICES = (("buyer", _("Acheteur")), ("seller", _("Vendeur")))

    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name="withdrawal")
    by = models.CharField(max_length=10, choices=BY_CHOICES)
    declared_on = models.DateField(default=timezone.localdate)
    reason = models.TextField(_("Motif détaillé"))
    penalty_amount = models.DecimalField(
        _("Pénalité retenue"), max_digits=14, decimal_places=2, default=Decimal("0"),
        help_text=_("Montant retenu sur les versements déjà encaissés."),
    )
    refund_amount = models.DecimalField(
        _("Montant à rembourser"), max_digits=14, decimal_places=2, default=Decimal("0"),
    )
    refund_completed = models.BooleanField(default=False)
    refund_completed_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    declared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Désistement")
        verbose_name_plural = _("Désistements")

    def __str__(self) -> str:
        return f"Désistement {self.get_by_display()} - {self.sale.reference}"


# ---------------------------------------------------------------------------
# Payment plan & instalments
# ---------------------------------------------------------------------------
class PaymentPlan(models.Model):
    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name="payment_plan")
    late_fee_rate = models.DecimalField(
        _("Taux de pénalité (% / mois)"),
        max_digits=5, decimal_places=2, default=Decimal("0"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Plan {self.sale.reference}"

    @transaction.atomic
    def generate_installments(self):
        """(Re)generate the instalment schedule from the sale parameters.

        Fully rebuilds the plan from scratch. Use only when no payment has
        been recorded yet (e.g. when the sale is confirmed). For an existing
        plan with payments, prefer `regenerate_remaining_schedule`.
        """
        sale = self.sale
        self.installments.all().delete()

        if sale.payment_mode == PaymentMode.CASH:
            Installment.objects.create(
                plan=self, position=1, due_on=sale.sold_on,
                amount_due=sale.net_amount,
            )
            return

        net = sale.net_amount
        down = sale.down_payment or Decimal("0")
        remaining = net - down
        count = max(int(sale.installment_count), 1)
        if down > 0:
            Installment.objects.create(
                plan=self, position=0, due_on=sale.sold_on,
                amount_due=down, label="Apport initial",
            )
        if remaining > 0:
            base = (remaining / count).quantize(Decimal("0.01"))
            cumulative = Decimal("0")
            from datetime import timedelta
            for i in range(1, count + 1):
                due = sale.sold_on + timedelta(days=sale.installment_frequency_days * i)
                amount = base if i < count else (remaining - cumulative)
                cumulative += amount
                Installment.objects.create(
                    plan=self, position=i, due_on=due, amount_due=amount,
                )

    @transaction.atomic
    def regenerate_remaining_schedule(self):
        """Re-spread the *outstanding* balance over a fresh future schedule.

        Keeps the history of paid/partial instalments and only rebuilds the
        future ones. Use when the customer asks for a re-negotiation
        (different count, different frequency, switching to cash, etc.).
        """
        from datetime import timedelta
        sale = self.sale
        paid_to_date = sale.total_paid
        remaining = sale.net_amount - paid_to_date
        # Drop only future (unpaid) instalments
        self.installments.filter(amount_paid__lte=0).delete()

        if remaining <= 0:
            sale.refresh_status_from_payments()
            return

        if sale.payment_mode == PaymentMode.CASH:
            Installment.objects.create(
                plan=self,
                position=self._next_position(),
                due_on=timezone.localdate(),
                amount_due=remaining,
                label="Solde - règlement comptant",
            )
            return

        count = max(int(sale.installment_count), 1)
        base = (remaining / count).quantize(Decimal("0.01"))
        cumulative = Decimal("0")
        start = timezone.localdate()
        next_pos = self._next_position()
        for i in range(1, count + 1):
            due = start + timedelta(days=sale.installment_frequency_days * i)
            amount = base if i < count else (remaining - cumulative)
            cumulative += amount
            Installment.objects.create(
                plan=self, position=next_pos + i - 1,
                due_on=due, amount_due=amount,
                label=f"Échéance renégociée #{i}",
            )

    def _next_position(self) -> int:
        last = self.installments.order_by("-position").first()
        return (last.position + 1) if last else 1


class InstallmentStatus(models.TextChoices):
    PENDING = "pending", _("À échoir")
    PARTIAL = "partial", _("Partiellement payée")
    PAID = "paid", _("Soldée")
    OVERDUE = "overdue", _("En retard")


class Installment(models.Model):
    plan = models.ForeignKey(PaymentPlan, on_delete=models.CASCADE, related_name="installments")
    position = models.PositiveSmallIntegerField()
    label = models.CharField(max_length=80, blank=True, default="")
    due_on = models.DateField()
    amount_due = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    status = models.CharField(
        max_length=12, choices=InstallmentStatus.choices,
        default=InstallmentStatus.PENDING,
    )

    class Meta:
        ordering = ("plan", "position")
        unique_together = ("plan", "position")

    @property
    def balance(self) -> Decimal:
        return self.amount_due - self.amount_paid

    @property
    def is_overdue(self) -> bool:
        return self.balance > 0 and self.due_on < timezone.localdate()

    def refresh_status(self):
        if self.amount_paid >= self.amount_due:
            self.status = InstallmentStatus.PAID
        elif self.amount_paid > 0:
            self.status = InstallmentStatus.PARTIAL
        elif self.due_on < timezone.localdate():
            self.status = InstallmentStatus.OVERDUE
        else:
            self.status = InstallmentStatus.PENDING
        self.save(update_fields=["status"])


# ---------------------------------------------------------------------------
# Sale documents (signed contract, buyer ID copy, etc.)
# ---------------------------------------------------------------------------
def _sale_doc_path(instance, filename):
    return f"sales/{instance.sale.reference}/{uuid.uuid4().hex}-{filename}"


class SaleDocumentKind(models.TextChoices):
    SIGNED_CONTRACT = "signed_contract", _("Contrat signé")
    BUYER_ID = "buyer_id", _("Pièce d'identité de l'acheteur")
    BUYER_PROOF_OF_ADDRESS = "buyer_proof_of_address", _("Justificatif de domicile")
    SELLER_DOCUMENT = "seller_document", _("Document du vendeur")
    PAYMENT_PROOF = "payment_proof", _("Preuve de paiement")
    CADASTRAL = "cadastral", _("Plan cadastral / titre")
    POWER_OF_ATTORNEY = "power_of_attorney", _("Procuration")
    OTHER = "other", _("Autre")


class SaleDocument(models.Model):
    """Files attached to a sale: signed contract, ID copies, payment proofs.

    Distinct from ClientDocument: those live with the client and persist
    across transactions; this one is tied to one specific sale.
    """

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="documents")
    kind = models.CharField(_("Type"), max_length=32, choices=SaleDocumentKind.choices)
    label = models.CharField(_("Libellé"), max_length=200, blank=True, default="")
    file = models.FileField(upload_to=_sale_doc_path)
    notes = models.TextField(blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ("-uploaded_at",)

    def __str__(self) -> str:
        return f"{self.sale.reference} — {self.get_kind_display()}"


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------
class PaymentMethod(models.TextChoices):
    CASH = "cash", _("Espèces")
    CHECK = "check", _("Chèque")
    BILL_OF_EXCHANGE = "bill_of_exchange", _("Traite")
    BANK_TRANSFER = "bank_transfer", _("Virement bancaire")
    MOBILE_MONEY = "mobile_money", _("Mobile Money")
    CARD = "card", _("Carte bancaire")
    OTHER = "other", _("Autre")


class Payment(models.Model):
    """A single payment registered against a sale (and optionally an instalment).

    Anti-fraud: each row stores a `integrity_hash` that chains to the previous
    payment of the same sale. Any retroactive edit of an earlier row breaks the
    chain and is flagged by the integrity check endpoint.
    """

    receipt_number = models.CharField(max_length=32, unique=True, blank=True,
                                      help_text=_("Format: REC-AAAAMMJJ-XXXXXXXX"))
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    installment = models.ForeignKey(
        Installment, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="payments",
    )
    paid_on = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(_("Montant"), max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=8, default="XOF")
    method = models.CharField(
        _("Mode"), max_length=20,
        choices=PaymentMethod.choices, default=PaymentMethod.CASH,
    )
    reference = models.CharField(
        _("Réf. transaction"), max_length=120, blank=True, default="",
        help_text=_("N° de chèque, ref Mobile Money, etc."),
    )
    notes = models.TextField(blank=True, default="")
    is_void = models.BooleanField(default=False)
    voided_on = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=200, blank=True, default="")

    # Marque les remboursements (decaissements vers le client lors d'un desistement)
    is_refund = models.BooleanField(
        _("Remboursement"), default=False,
        help_text=_("Mouvement sortant : remboursement au client lors d'un désistement."),
    )

    # Anti-fraud: tamper-evident hash chain (per sale)
    previous_hash = models.CharField(max_length=64, blank=True, default="")
    integrity_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="+", on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ("-paid_on", "-id")
        indexes = [models.Index(fields=("sale", "paid_on"))]

    def __str__(self) -> str:
        return f"{self.receipt_number} — {self.amount} {self.currency}"

    def _compute_hash(self, previous_hash: str) -> str:
        payload = "|".join([
            self.receipt_number or "",
            str(self.sale_id),
            f"{Decimal(self.amount):.2f}",
            self.currency,
            self.method,
            self.paid_on.isoformat() if self.paid_on else "",
            self.reference,
            str(self.received_by_id or ""),
            "REFUND" if self.is_refund else "PAY",
            previous_hash or "GENESIS",
        ])
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def expected_hash(self) -> str:
        prev = (Payment.objects
                .filter(sale_id=self.sale_id)
                .exclude(pk=self.pk)
                .filter(id__lt=self.id if self.id else 0)
                .order_by("-id")
                .values_list("integrity_hash", flat=True)
                .first()) or ""
        return self._compute_hash(prev)

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import secrets
            for _ in range(8):
                candidate = f"REC-{timezone.now():%Y%m%d}-{secrets.token_hex(4).upper()}"
                if not Payment.objects.filter(receipt_number=candidate).exists():
                    self.receipt_number = candidate
                    break
        is_new = self.pk is None
        if is_new:
            prev_hash = (Payment.objects
                         .filter(sale_id=self.sale_id)
                         .order_by("-id")
                         .values_list("integrity_hash", flat=True)
                         .first()) or ""
            self.previous_hash = prev_hash
            self.integrity_hash = self._compute_hash(prev_hash)
        super().save(*args, **kwargs)

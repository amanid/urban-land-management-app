from datetime import timedelta
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import (
    CanManageSales,
    CanRecordPayments,
    IsAdminLevel,
)
from apps.audit.services import log as audit_log
from apps.common.reason import RequireReasonMixin

from .models import (
    Acquisition,
    Installment,
    Payment,
    PaymentPlan,
    Sale,
    SaleDocument,
    SaleStatus,
)
from .serializers import (
    AcquisitionSerializer,
    InstallmentSerializer,
    PaymentPlanSerializer,
    PaymentSerializer,
    SaleDocumentSerializer,
    SaleSerializer,
)


class AcquisitionViewSet(viewsets.ModelViewSet):
    queryset = Acquisition.objects.select_related("lot", "seller").all()
    serializer_class = AcquisitionSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("status", "lot", "seller")
    search_fields = ("reference", "lot__reference", "seller__last_name",
                     "seller__company_name", "seller_name")
    ordering_fields = ("acquired_on", "amount")

    def perform_create(self, serializer):
        acq = serializer.save(created_by=self.request.user)
        audit_log("create", "Acquisition", entity_id=acq.id, description=acq.reference)


class SaleViewSet(RequireReasonMixin, viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("lot", "client", "agent").prefetch_related(
        "payments", "payment_plan__installments",
    )
    serializer_class = SaleSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("status", "payment_mode", "lot", "client", "agent")
    search_fields = ("reference", "lot__reference", "client__last_name",
                     "client__company_name", "client__code")
    ordering_fields = ("sold_on", "price", "created_at")

    def perform_create(self, serializer):
        sale = serializer.save(
            created_by=self.request.user,
            agent=serializer.validated_data.get("agent") or self.request.user,
        )
        audit_log("create", "Sale", entity_id=sale.id, description=sale.reference)

    def perform_update(self, serializer):
        if self.get_object().status == SaleStatus.COMPLETED:
            raise ValidationError("Une vente soldée est verrouillée et ne peut être modifiée.")
        sale = serializer.save()
        audit_log("update", "Sale", entity_id=sale.id, description=sale.reference)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        sale = self.get_object()
        sale.confirm()
        audit_log("status_change", "Sale", entity_id=sale.id,
                  description=f"{sale.reference} -> {sale.status}")
        return Response(SaleSerializer(sale, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="upload-document")
    def upload_document(self, request, pk=None):
        sale = self.get_object()
        data = request.data.copy()
        data["sale"] = sale.id
        serializer = SaleDocumentSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(sale=sale, uploaded_by=request.user)
        audit_log("create", "SaleDocument", entity_id=doc.id,
                  description=f"{sale.reference} - {doc.get_kind_display()}")
        return Response(SaleDocumentSerializer(doc, context={"request": request}).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def settle_in_full(self, request, pk=None):
        """Create one payment covering the entire outstanding balance."""
        sale = self.get_object()
        if not request.user.can_record_payments:
            raise ValidationError("Vous n'avez pas le droit d'enregistrer un versement.")
        method = request.data.get("method", "cash")
        reference = request.data.get("reference", "")
        payment = sale.settle_in_full(
            method=method, reference=reference, received_by=request.user,
        )
        audit_log("payment", "Payment", entity_id=payment.id,
                  description=f"Règlement intégral anticipé - {payment.receipt_number}")
        return Response(
            SaleSerializer(sale, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def renegotiate(self, request, pk=None):
        """Update payment terms (mode, count, frequency) and rebuild the future schedule."""
        sale = self.get_object()
        sale.renegotiate_plan(
            payment_mode=request.data.get("payment_mode"),
            installment_count=request.data.get("installment_count"),
            installment_frequency_days=request.data.get("installment_frequency_days"),
            down_payment=request.data.get("down_payment"),
            late_fee_rate=request.data.get("late_fee_rate"),
        )
        audit_log("update", "Sale", entity_id=sale.id, description="renegotiated payment plan")
        return Response(SaleSerializer(sale, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        """Record a withdrawal (buyer or seller) — mandatory reason."""
        sale = self.get_object()
        by = (request.data.get("by") or "").strip()
        reason = (request.data.get("reason") or "").strip()
        penalty = request.data.get("penalty_amount")
        if not reason:
            raise ValidationError({"reason": "Le motif du désistement est obligatoire."})
        if by not in ("buyer", "seller"):
            raise ValidationError({"by": "Choisissez la partie (buyer ou seller)."})
        sale.withdraw(
            by=by, reason=reason,
            penalty_amount=penalty,
            declared_by=request.user,
        )
        audit_log("status_change", "Sale", entity_id=sale.id,
                  description=f"Désistement {by}: {reason[:120]}")
        # Re-fetch fresh from DB (refund Payment was created after prefetch)
        fresh = Sale.objects.select_related(
            "lot", "client", "agent"
        ).prefetch_related("payments", "payment_plan__installments").get(pk=sale.pk)
        return Response(SaleSerializer(fresh, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        sale = self.get_object()
        if sale.status == SaleStatus.COMPLETED:
            raise ValidationError("Impossible d'annuler une vente soldée.")
        sale.status = SaleStatus.CANCELLED
        sale.save(update_fields=["status"])
        if sale.lot.status == "reserved":
            sale.lot.status = "available"
            sale.lot.save(update_fields=["status"])
        audit_log("status_change", "Sale", entity_id=sale.id, description="cancelled")
        return Response(SaleSerializer(sale, context={"request": request}).data)


class SaleDocumentViewSet(viewsets.ModelViewSet):
    queryset = SaleDocument.objects.select_related("sale").all()
    serializer_class = SaleDocumentSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("sale", "kind")


class PaymentPlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentPlan.objects.prefetch_related("installments").all()
    serializer_class = PaymentPlanSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("sale",)


class InstallmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Installment.objects.select_related("plan__sale").all()
    serializer_class = InstallmentSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("plan", "plan__sale", "status")

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        days = int(request.query_params.get("days", 14))
        end = timezone.localdate() + timedelta(days=days)
        qs = self.get_queryset().filter(
            status__in=["pending", "partial", "overdue"],
            due_on__lte=end,
        ).order_by("due_on")
        return Response(self.get_serializer(qs[:200], many=True).data)


class PaymentViewSet(RequireReasonMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("sale__lot", "sale__client", "installment").all()
    serializer_class = PaymentSerializer
    permission_classes = [CanRecordPayments]
    filterset_fields = ("sale", "installment", "method", "is_void", "paid_on")
    search_fields = ("receipt_number", "reference", "sale__reference",
                     "sale__client__last_name", "sale__client__company_name")
    ordering_fields = ("paid_on", "amount")

    def perform_create(self, serializer):
        sale: Sale = serializer.validated_data["sale"]
        amount: Decimal = serializer.validated_data["amount"]
        if sale.status in (SaleStatus.CANCELLED, SaleStatus.COMPLETED):
            raise ValidationError("Aucun versement ne peut être ajouté à cette vente.")
        if amount <= 0:
            raise ValidationError({"amount": "Le montant doit être strictement positif."})
        outstanding = sale.balance_due
        if amount > outstanding + Decimal("0.01"):
            raise ValidationError({
                "amount": f"Le versement dépasse le solde dû ({outstanding} {sale.currency})."
            })
        payment = serializer.save(received_by=self.request.user)
        audit_log("payment", "Payment", entity_id=payment.id,
                  description=f"{payment.receipt_number} {payment.amount} {payment.currency}")

    @action(detail=True, methods=["post"], permission_classes=[IsAdminLevel])
    def void(self, request, pk=None):
        payment = self.get_object()
        if payment.is_void:
            raise ValidationError("Ce versement est déjà annulé.")
        payment.is_void = True
        payment.voided_on = timezone.now()
        payment.void_reason = request.data.get("reason", "")[:200]
        payment.save(update_fields=["is_void", "voided_on", "void_reason"])
        # Re-trigger sale aggregation
        payment.sale.refresh_status_from_payments()
        audit_log("update", "Payment", entity_id=payment.id,
                  description=f"voided: {payment.void_reason}")
        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=["get"])
    def totals(self, request):
        qs = self.filter_queryset(self.get_queryset()).filter(is_void=False)
        data = qs.aggregate(total=Sum("amount"), count=Sum("id"))
        return Response({
            "total": data["total"] or 0,
            "count": qs.count(),
        })

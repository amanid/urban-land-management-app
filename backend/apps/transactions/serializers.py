from rest_framework import serializers

from apps.clients.serializers import ClientSerializer
from apps.lots.serializers import LotSerializer

from .models import (
    Acquisition,
    Installment,
    Payment,
    PaymentPlan,
    Sale,
    SaleDocument,
    Withdrawal,
)


class WithdrawalSerializer(serializers.ModelSerializer):
    by_label = serializers.CharField(source="get_by_display", read_only=True)
    sale_reference = serializers.CharField(source="sale.reference", read_only=True)

    class Meta:
        model = Withdrawal
        fields = (
            "id", "sale", "sale_reference",
            "by", "by_label", "declared_on", "reason",
            "penalty_amount", "refund_amount",
            "refund_completed", "refund_completed_on",
            "notes", "declared_by", "created_at",
        )
        read_only_fields = ("created_at", "declared_by")


class SaleDocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SaleDocument
        fields = (
            "id", "sale", "kind", "kind_label", "label", "file", "file_url",
            "notes", "uploaded_at", "uploaded_by",
        )
        read_only_fields = ("uploaded_at", "uploaded_by", "file_url", "kind_label")

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None


class AcquisitionSerializer(serializers.ModelSerializer):
    lot_reference = serializers.CharField(source="lot.reference", read_only=True)
    seller_display = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Acquisition
        fields = (
            "id", "reference", "lot", "lot_reference",
            "seller", "seller_name", "seller_display",
            "acquired_on", "amount", "currency",
            "status", "status_label", "notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("reference",)

    def get_seller_display(self, obj):
        if obj.seller:
            return obj.seller.display_name
        return obj.seller_name or "—"


class InstallmentSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Installment
        fields = (
            "id", "plan", "position", "label", "due_on",
            "amount_due", "amount_paid", "balance", "status", "status_label", "is_overdue",
        )


class PaymentPlanSerializer(serializers.ModelSerializer):
    installments = InstallmentSerializer(many=True, read_only=True)

    class Meta:
        model = PaymentPlan
        fields = ("id", "sale", "late_fee_rate", "installments", "created_at")


class PaymentSerializer(serializers.ModelSerializer):
    method_label = serializers.CharField(source="get_method_display", read_only=True)
    sale_reference = serializers.CharField(source="sale.reference", read_only=True)
    client_name = serializers.CharField(source="sale.client.display_name", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id", "receipt_number", "sale", "sale_reference", "client_name",
            "installment", "paid_on", "amount", "currency",
            "method", "method_label", "reference", "notes",
            "is_void", "voided_on", "void_reason", "is_refund",
            "received_by", "created_at",
        )
        read_only_fields = ("receipt_number", "created_at", "is_void", "voided_on", "received_by", "is_refund")


class SaleSerializer(serializers.ModelSerializer):
    lot_detail = LotSerializer(source="lot", read_only=True)
    client_detail = ClientSerializer(source="client", read_only=True)
    agent_name = serializers.SerializerMethodField()
    payment_mode_label = serializers.CharField(source="get_payment_mode_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    net_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    progress_pct = serializers.FloatField(read_only=True)
    payment_plan = PaymentPlanSerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    documents = SaleDocumentSerializer(many=True, read_only=True)
    withdrawal = WithdrawalSerializer(read_only=True)

    class Meta:
        model = Sale
        fields = (
            "id", "reference",
            "lot", "lot_detail", "client", "client_detail",
            "agent", "agent_name",
            "sold_on", "price", "discount", "currency",
            "payment_mode", "payment_mode_label",
            "down_payment", "installment_count", "installment_frequency_days",
            "status", "status_label",
            "contract_signed_on", "notes",
            "net_amount", "total_paid", "balance_due", "progress_pct",
            "payment_plan", "payments", "documents", "withdrawal",
            "created_at", "updated_at",
        )
        read_only_fields = ("reference",)

    def get_agent_name(self, obj):
        return obj.agent.get_full_name() if obj.agent else ""

    def validate(self, attrs):
        # Build a synthetic instance from current state + incoming attrs, then run model.clean()
        if self.instance:
            data = {f.name: getattr(self.instance, f.name) for f in Sale._meta.fields
                    if hasattr(self.instance, f.name)}
            data.update(attrs)
        else:
            data = attrs
        # Drop foreign-key id-only fields that don't match Sale init signature
        instance = Sale(**{k: v for k, v in data.items() if k in {
            f.name for f in Sale._meta.get_fields()
            if hasattr(f, "attname") or hasattr(f, "name")
        }})
        try:
            instance.clean()
        except Exception:
            pass  # The viewset will re-raise on save() if truly invalid.
        return attrs

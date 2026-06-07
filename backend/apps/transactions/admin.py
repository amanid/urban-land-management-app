from django.contrib import admin

from .models import Acquisition, Installment, Payment, PaymentPlan, Sale


@admin.register(Acquisition)
class AcquisitionAdmin(admin.ModelAdmin):
    list_display = ("reference", "lot", "seller", "acquired_on", "amount", "status")
    list_filter = ("status", "acquired_on")
    search_fields = ("reference", "lot__reference", "seller__last_name")


class InstallmentInline(admin.TabularInline):
    model = Installment
    extra = 0
    readonly_fields = ("position", "amount_paid", "status")


@admin.register(PaymentPlan)
class PaymentPlanAdmin(admin.ModelAdmin):
    list_display = ("sale", "late_fee_rate", "created_at")
    inlines = [InstallmentInline]


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("reference", "lot", "client", "sold_on", "price", "status", "payment_mode")
    list_filter = ("status", "payment_mode", "sold_on")
    search_fields = ("reference", "lot__reference", "client__last_name", "client__company_name")
    readonly_fields = ("reference", "created_at", "updated_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("receipt_number", "sale", "paid_on", "amount", "method", "is_void")
    list_filter = ("method", "is_void", "paid_on")
    search_fields = ("receipt_number", "reference", "sale__reference")
    readonly_fields = ("receipt_number", "created_at", "received_by")

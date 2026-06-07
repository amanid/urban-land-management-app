from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcquisitionViewSet,
    InstallmentViewSet,
    PaymentPlanViewSet,
    PaymentViewSet,
    SaleDocumentViewSet,
    SaleViewSet,
)

router = DefaultRouter()
router.register("acquisitions", AcquisitionViewSet, basename="acquisition")
router.register("sale-documents", SaleDocumentViewSet, basename="sale-document")
router.register("sales", SaleViewSet, basename="sale")
router.register("payment-plans", PaymentPlanViewSet, basename="payment-plan")
router.register("installments", InstallmentViewSet, basename="installment")
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = [path("", include(router.urls))]

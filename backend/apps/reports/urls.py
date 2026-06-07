from django.urls import path

from .views import ReceiptPDFView, SaleContractPDFView, SaleStatementPDFView

urlpatterns = [
    path("receipt/<int:payment_id>/", ReceiptPDFView.as_view(), name="receipt-pdf"),
    path("contract/<int:sale_id>/", SaleContractPDFView.as_view(), name="contract-pdf"),
    path("statement/<int:sale_id>/", SaleStatementPDFView.as_view(), name="statement-pdf"),
]

from django.urls import path

from .exports import ClientsExport, LotsExport, PaymentsExport, SalesExport
from .views import (
    ClientHistoryView,
    GlobalAuditView,
    GlobalSearchView,
    IntegrityCheckView,
    LotHistoryView,
)
from .wipe import WipeDataExecute, WipeDataPreview

urlpatterns = [
    path("search/", GlobalSearchView.as_view(), name="global-search"),
    path("integrity/", IntegrityCheckView.as_view(), name="integrity-check"),
    path("clients/<int:client_id>/history/", ClientHistoryView.as_view(), name="client-history"),
    path("lots/<int:lot_id>/history/", LotHistoryView.as_view(), name="lot-history"),
    path("history/", GlobalAuditView.as_view(), name="audit-history"),
    path("export/lots/", LotsExport.as_view(), name="export-lots"),
    path("export/clients/", ClientsExport.as_view(), name="export-clients"),
    path("export/sales/", SalesExport.as_view(), name="export-sales"),
    path("export/payments/", PaymentsExport.as_view(), name="export-payments"),
    path("admin/wipe/", WipeDataPreview.as_view(), name="data-wipe-preview"),
    path("admin/wipe/execute/", WipeDataExecute.as_view(), name="data-wipe-execute"),
]

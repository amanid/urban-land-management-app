from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import CanManageSales
from apps.audit.services import log as audit_log
from apps.common.reason import RequireReasonMixin

from .models import Client, ClientDocument
from .serializers import ClientDocumentSerializer, ClientSerializer


class ClientViewSet(RequireReasonMixin, viewsets.ModelViewSet):
    queryset = Client.objects.prefetch_related("documents").all()
    serializer_class = ClientSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("kind", "is_active", "city", "country", "nationality")
    search_fields = ("code", "first_name", "last_name", "company_name", "email", "phone", "id_number")
    ordering_fields = ("created_at", "last_name", "company_name")

    def perform_create(self, serializer):
        client = serializer.save(created_by=self.request.user)
        audit_log("create", "Client", entity_id=client.id, description=client.display_name)

    # update / destroy are audited by RequireReasonMixin (with motif)

    @action(detail=True, methods=["post"], url_path="upload-document")
    def upload_document(self, request, pk=None):
        client = self.get_object()
        data = request.data.copy()
        data["client"] = client.id
        serializer = ClientDocumentSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(client=client, uploaded_by=request.user)
        audit_log("create", "ClientDocument", entity_id=doc.id,
                  description=f"{client.display_name} - {doc.get_kind_display()}")
        return Response(
            ClientDocumentSerializer(doc, context={"request": request}).data,
            status=201,
        )


class ClientDocumentViewSet(viewsets.ModelViewSet):
    queryset = ClientDocument.objects.select_related("client").all()
    serializer_class = ClientDocumentSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("client", "kind")

from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import CanManageSales, ReadOnlyOrAdmin
from apps.audit.services import log as audit_log
from apps.common.reason import RequireReasonMixin

from .filters import LotFilter
from .models import City, Lot, LotDocument, LotPhoto, Neighborhood, UtilityConnection
from .serializers import (
    CitySerializer,
    LotDocumentSerializer,
    LotPhotoSerializer,
    LotSerializer,
    LotWriteSerializer,
    NeighborhoodSerializer,
    UtilityConnectionSerializer,
)


class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.all().order_by("name")
    serializer_class = CitySerializer
    permission_classes = [ReadOnlyOrAdmin]
    search_fields = ("name", "region", "country")


class NeighborhoodViewSet(viewsets.ModelViewSet):
    queryset = Neighborhood.objects.select_related("city").all()
    serializer_class = NeighborhoodSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filterset_fields = ("city",)
    search_fields = ("name", "city__name")


class LotViewSet(RequireReasonMixin, viewsets.ModelViewSet):
    queryset = Lot.objects.select_related("city", "neighborhood").prefetch_related("photos", "utilities").all()
    permission_classes = [CanManageSales]
    filterset_class = LotFilter
    search_fields = ("reference", "title", "description", "cadastral_ref",
                     "city__name", "neighborhood__name",
                     "region", "village", "subdivision_name", "ilot", "lot_number")
    ordering_fields = ("created_at", "asking_price", "surface_m2", "status")

    def get_serializer_class(self):
        return LotWriteSerializer if self.action in ("create", "update", "partial_update") else LotSerializer

    def perform_create(self, serializer):
        lot = serializer.save(created_by=self.request.user)
        audit_log("create", "Lot", entity_id=lot.id, description=lot.reference)

    # update / destroy are audited by RequireReasonMixin (with motif)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.filter_queryset(self.get_queryset())
        data = qs.aggregate(
            total=Count("id"),
            available=Count("id", filter=Q(status="available")),
            reserved=Count("id", filter=Q(status="reserved")),
            sold=Count("id", filter=Q(status="sold")),
        )
        return Response(data)

    @action(detail=True, methods=["post"], url_path="upload-photo")
    def upload_photo(self, request, pk=None):
        lot = self.get_object()
        serializer = LotPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(lot=lot, created_by=request.user)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=["post"], url_path="upload-document")
    def upload_document(self, request, pk=None):
        lot = self.get_object()
        data = request.data.copy()
        data["lot"] = lot.id
        serializer = LotDocumentSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(lot=lot, uploaded_by=request.user)
        audit_log("create", "LotDocument", entity_id=doc.id,
                  description=f"{lot.reference} - {doc.get_kind_display()}")
        return Response(LotDocumentSerializer(doc, context={"request": request}).data,
                        status=201)


class LotPhotoViewSet(viewsets.ModelViewSet):
    queryset = LotPhoto.objects.select_related("lot").all()
    serializer_class = LotPhotoSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("lot",)


class LotDocumentViewSet(viewsets.ModelViewSet):
    queryset = LotDocument.objects.select_related("lot").all()
    serializer_class = LotDocumentSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("lot", "kind")


class UtilityConnectionViewSet(viewsets.ModelViewSet):
    queryset = UtilityConnection.objects.select_related("lot").all()
    serializer_class = UtilityConnectionSerializer
    permission_classes = [CanManageSales]
    filterset_fields = ("lot", "kind", "is_connected")

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CityViewSet,
    LotDocumentViewSet,
    LotPhotoViewSet,
    LotViewSet,
    NeighborhoodViewSet,
    UtilityConnectionViewSet,
)

router = DefaultRouter()
router.register("cities", CityViewSet, basename="city")
router.register("neighborhoods", NeighborhoodViewSet, basename="neighborhood")
router.register("photos", LotPhotoViewSet, basename="lot-photo")
router.register("documents", LotDocumentViewSet, basename="lot-document")
router.register("utilities", UtilityConnectionViewSet, basename="utility")
router.register("", LotViewSet, basename="lot")

urlpatterns = [path("", include(router.urls))]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClientDocumentViewSet, ClientViewSet

router = DefaultRouter()
router.register("documents", ClientDocumentViewSet, basename="client-document")
router.register("", ClientViewSet, basename="client")

urlpatterns = [path("", include(router.urls))]

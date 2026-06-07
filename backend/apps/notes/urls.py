from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EntityNotesView, NoteViewSet, TagViewSet, TaggedItemViewSet

router = DefaultRouter()
router.register("tags", TagViewSet, basename="tag")
router.register("tagged-items", TaggedItemViewSet, basename="tagged-item")
router.register("notes", NoteViewSet, basename="note")

urlpatterns = [
    path("", include(router.urls)),
    path("entity/<str:entity>/<int:entity_id>/", EntityNotesView.as_view(), name="entity-notes"),
]

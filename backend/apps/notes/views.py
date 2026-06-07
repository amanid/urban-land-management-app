from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Note, Tag, TaggedItem
from .serializers import (
    NoteSerializer,
    TagSerializer,
    TaggedItemSerializer,
    resolve_content_type,
)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all().order_by("name")
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ("name", "description")


class TaggedItemViewSet(viewsets.ModelViewSet):
    queryset = TaggedItem.objects.select_related("tag", "content_type").all()
    serializer_class = TaggedItemSerializer
    permission_classes = [IsAuthenticated]


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Note.objects.select_related("author", "content_type").all()
        user = self.request.user
        # Private notes only visible to the author; internal ones visible to all
        qs = qs.filter(Q(visibility="internal") | Q(author=user))
        return qs.order_by("-pinned", "-created_at")


class EntityNotesView(APIView):
    """List notes + tags for a specific business object."""
    permission_classes = [IsAuthenticated]

    def get(self, request, entity, entity_id):
        ct = resolve_content_type(entity)
        notes = Note.objects.filter(
            content_type=ct, object_id=entity_id,
        ).filter(Q(visibility="internal") | Q(author=request.user)).select_related("author").order_by("-pinned", "-created_at")
        tags = TaggedItem.objects.filter(content_type=ct, object_id=entity_id).select_related("tag")
        return Response({
            "notes": NoteSerializer(notes, many=True).data,
            "tags": TaggedItemSerializer(tags, many=True).data,
        })

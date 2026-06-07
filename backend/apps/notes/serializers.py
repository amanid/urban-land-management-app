from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from .models import Note, Tag, TaggedItem

ALLOWED_ENTITIES = {
    "lot": ("lots", "lot"),
    "client": ("clients", "client"),
    "sale": ("transactions", "sale"),
    "payment": ("transactions", "payment"),
}


def resolve_content_type(entity_key: str) -> ContentType:
    if entity_key not in ALLOWED_ENTITIES:
        raise serializers.ValidationError({"entity": f"Type inconnu: {entity_key}"})
    app_label, model = ALLOWED_ENTITIES[entity_key]
    return ContentType.objects.get(app_label=app_label, model=model)


class TagSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Tag
        fields = ("id", "name", "color", "description", "item_count", "created_at")
        read_only_fields = ("created_at", "item_count")


class NoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    entity = serializers.CharField(write_only=True, required=False)
    entity_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Note
        fields = (
            "id", "body", "visibility", "pinned",
            "author", "author_name",
            "entity", "entity_id",
            "content_type", "object_id",
            "created_at", "updated_at",
        )
        read_only_fields = ("author", "author_name", "content_type", "object_id",
                            "created_at", "updated_at")

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else "—"

    def create(self, validated_data):
        entity = validated_data.pop("entity", None)
        entity_id = validated_data.pop("entity_id", None)
        if not entity or not entity_id:
            raise serializers.ValidationError("entity et entity_id requis.")
        ct = resolve_content_type(entity)
        return Note.objects.create(
            content_type=ct, object_id=entity_id,
            author=self.context["request"].user,
            **validated_data,
        )


class TaggedItemSerializer(serializers.ModelSerializer):
    tag_name = serializers.CharField(source="tag.name", read_only=True)
    tag_color = serializers.CharField(source="tag.color", read_only=True)
    entity = serializers.CharField(write_only=True, required=False)
    entity_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = TaggedItem
        fields = (
            "id", "tag", "tag_name", "tag_color",
            "entity", "entity_id",
            "content_type", "object_id", "created_at",
        )
        read_only_fields = ("content_type", "object_id", "created_at",
                            "tag_name", "tag_color")

    def create(self, validated_data):
        entity = validated_data.pop("entity", None)
        entity_id = validated_data.pop("entity_id", None)
        if not entity or not entity_id:
            raise serializers.ValidationError("entity et entity_id requis.")
        ct = resolve_content_type(entity)
        item, _ = TaggedItem.objects.get_or_create(
            tag=validated_data["tag"],
            content_type=ct, object_id=entity_id,
            defaults={"created_by": self.context["request"].user},
        )
        return item

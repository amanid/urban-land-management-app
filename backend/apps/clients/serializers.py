from rest_framework import serializers

from .models import Client, ClientDocument


class ClientDocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ClientDocument
        fields = (
            "id", "client", "kind", "kind_label", "label",
            "file", "file_url", "issued_on", "expires_on",
            "notes", "uploaded_at",
        )
        read_only_fields = ("uploaded_at", "file_url", "kind_label")

    def get_file_url(self, obj):
        # Return a relative path so the browser hits Vite -> backend through
        # its own proxy, instead of the unreachable Docker hostname.
        return obj.file.url if obj.file else None


class ClientSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    id_kind_label = serializers.CharField(source="get_id_kind_display", read_only=True)
    display_name = serializers.CharField(read_only=True)
    documents = ClientDocumentSerializer(many=True, read_only=True)
    document_count = serializers.IntegerField(source="documents.count", read_only=True)
    sale_count = serializers.IntegerField(source="sales.count", read_only=True)

    class Meta:
        model = Client
        fields = (
            "id", "code", "kind", "kind_label", "display_name",
            "first_name", "last_name",
            "company_name", "company_rccm", "contact_person",
            "email", "phone", "phone_secondary",
            "address", "city", "country",
            "id_kind", "id_kind_label", "id_number", "id_issued_on", "id_expires_on",
            "birth_date", "birth_place", "nationality", "profession",
            "notes", "is_active",
            "documents", "document_count", "sale_count",
            "created_at", "updated_at",
        )
        read_only_fields = ("code",)

from rest_framework import serializers

from .models import City, Lot, LotDocument, LotPhoto, Neighborhood, UtilityConnection


class CitySerializer(serializers.ModelSerializer):
    lot_count = serializers.IntegerField(source="lots.count", read_only=True)

    class Meta:
        model = City
        fields = ("id", "name", "country", "region", "lot_count")


class NeighborhoodSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = Neighborhood
        fields = ("id", "city", "city_name", "name")


class UtilityConnectionSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = UtilityConnection
        fields = (
            "id", "kind", "kind_label", "is_connected", "operator",
            "distance_m", "connection_cost", "notes",
        )


class LotPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LotPhoto
        fields = ("id", "image", "caption", "is_primary", "created_at")


class LotDocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = LotDocument
        fields = (
            "id", "lot", "kind", "kind_label", "label", "file", "file_url",
            "issued_on", "expires_on", "notes", "uploaded_at", "uploaded_by",
        )
        read_only_fields = ("uploaded_at", "uploaded_by", "file_url", "kind_label")

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None


class LotSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)
    neighborhood_name = serializers.CharField(source="neighborhood.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    lot_type_label = serializers.CharField(source="get_lot_type_display", read_only=True)
    is_serviced = serializers.BooleanField(read_only=True)
    price_per_m2 = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    photos = LotPhotoSerializer(many=True, read_only=True)
    utilities = UtilityConnectionSerializer(many=True, read_only=True)
    documents = LotDocumentSerializer(many=True, read_only=True)
    primary_photo = serializers.SerializerMethodField()

    class Meta:
        model = Lot
        fields = (
            "id", "reference", "title", "description",
            "city", "city_name", "neighborhood", "neighborhood_name",
            "region", "village",
            "ilot", "lot_number", "subdivision_name",
            "lot_type", "lot_type_label", "cadastral_ref",
            "surface_m2", "latitude", "longitude", "polygon",
            "purchase_price", "asking_price", "currency", "price_per_m2",
            "status", "status_label",
            "has_water", "has_electricity", "has_road_access",
            "has_sewage", "has_internet", "has_title_deed",
            "is_serviced", "notes",
            "photos", "utilities", "documents", "primary_photo",
            "created_at", "updated_at",
        )
        read_only_fields = ("reference",)

    def get_primary_photo(self, obj):
        photo = obj.photos.filter(is_primary=True).first() or obj.photos.first()
        return photo.image.url if photo else None


class LotWriteSerializer(LotSerializer):
    """Write-side.

    Accepts either:
    - `city` (FK id) when the user picked from an existing list
    - `city_text` (free text) for typing a city/village name. We then look
      up an existing City case-insensitively, or create it on the fly.
    Same logic for `neighborhood_text`.
    """

    reference = serializers.CharField(required=False, allow_blank=True)
    city = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), required=False, allow_null=True,
    )
    city_text = serializers.CharField(write_only=True, required=False, allow_blank=True)
    neighborhood_text = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta(LotSerializer.Meta):
        fields = LotSerializer.Meta.fields + ("city_text", "neighborhood_text")
        read_only_fields = ()

    def _resolve_city(self, validated_data):
        city = validated_data.get("city")
        text = (validated_data.pop("city_text", "") or "").strip()
        if not city and text:
            city = (City.objects.filter(name__iexact=text).first()
                    or City.objects.create(name=text))
            validated_data["city"] = city
        return validated_data

    def _resolve_neighborhood(self, validated_data):
        nb = validated_data.get("neighborhood")
        text = (validated_data.pop("neighborhood_text", "") or "").strip()
        city = validated_data.get("city")
        if not nb and text and city:
            nb = (Neighborhood.objects.filter(city=city, name__iexact=text).first()
                  or Neighborhood.objects.create(city=city, name=text))
            validated_data["neighborhood"] = nb
        return validated_data

    def create(self, validated_data):
        validated_data = self._resolve_neighborhood(self._resolve_city(validated_data))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._resolve_neighborhood(self._resolve_city(validated_data))
        return super().update(instance, validated_data)

import django_filters as df

from .models import Lot


class LotFilter(df.FilterSet):
    min_surface = df.NumberFilter(field_name="surface_m2", lookup_expr="gte")
    max_surface = df.NumberFilter(field_name="surface_m2", lookup_expr="lte")
    min_price = df.NumberFilter(field_name="asking_price", lookup_expr="gte")
    max_price = df.NumberFilter(field_name="asking_price", lookup_expr="lte")
    serviced = df.BooleanFilter(method="filter_serviced")

    region = df.CharFilter(field_name="region", lookup_expr="icontains")
    village = df.CharFilter(field_name="village", lookup_expr="icontains")
    subdivision = df.CharFilter(field_name="subdivision_name", lookup_expr="icontains")
    ilot = df.CharFilter(field_name="ilot", lookup_expr="iexact")

    class Meta:
        model = Lot
        fields = (
            "city", "neighborhood", "status", "lot_type",
            "has_water", "has_electricity", "has_road_access", "has_title_deed",
        )

    def filter_serviced(self, queryset, name, value):
        if value:
            return queryset.filter(has_water=True, has_electricity=True, has_road_access=True)
        return queryset

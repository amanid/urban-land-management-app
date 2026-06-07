from django.contrib import admin

from .models import City, Lot, LotPhoto, Neighborhood, UtilityConnection


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "country")
    search_fields = ("name", "region")


@admin.register(Neighborhood)
class NeighborhoodAdmin(admin.ModelAdmin):
    list_display = ("name", "city")
    list_filter = ("city",)
    search_fields = ("name", "city__name")


class LotPhotoInline(admin.TabularInline):
    model = LotPhoto
    extra = 0


class UtilityInline(admin.TabularInline):
    model = UtilityConnection
    extra = 0


@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display = ("reference", "title", "city", "surface_m2", "asking_price", "status")
    list_filter = ("status", "city", "lot_type", "has_water", "has_electricity", "has_road_access")
    search_fields = ("reference", "title", "cadastral_ref")
    inlines = [LotPhotoInline, UtilityInline]
    readonly_fields = ("created_at", "updated_at")


admin.site.register(LotPhoto)
admin.site.register(UtilityConnection)

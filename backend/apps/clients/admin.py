from django.contrib import admin

from .models import Client, ClientDocument


class ClientDocumentInline(admin.TabularInline):
    model = ClientDocument
    extra = 0
    readonly_fields = ("uploaded_at", "uploaded_by")


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("code", "display_name", "kind", "city", "phone", "is_active")
    list_filter = ("kind", "is_active", "city", "nationality")
    search_fields = ("code", "first_name", "last_name", "company_name", "email", "id_number")
    inlines = [ClientDocumentInline]
    readonly_fields = ("code", "created_at", "updated_at")


@admin.register(ClientDocument)
class ClientDocumentAdmin(admin.ModelAdmin):
    list_display = ("client", "kind", "label", "uploaded_at")
    list_filter = ("kind",)
    search_fields = ("client__code", "client__last_name", "client__company_name", "label")

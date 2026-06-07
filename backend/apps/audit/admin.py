from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "action", "entity", "entity_id", "ip")
    list_filter = ("action", "entity", "created_at")
    search_fields = ("entity", "entity_id", "description", "user__email")
    readonly_fields = [f.name for f in AuditLog._meta.fields]

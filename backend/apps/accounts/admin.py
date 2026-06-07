from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("email", "first_name", "last_name", "role", "is_active", "is_locked")
    list_filter = ("role", "is_active", "is_locked", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("last_name", "first_name")
    fieldsets = (
        (None, {"fields": ("username", "email", "password")}),
        ("Identite", {"fields": ("first_name", "last_name", "phone", "avatar")}),
        ("Role et acces", {"fields": ("role", "is_active", "is_locked", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Connexion", {"fields": ("last_login", "date_joined", "last_login_ip")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "first_name", "last_name", "role", "password1", "password2"),
        }),
    )

"""Custom DRF permission classes mapped to functional roles."""
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Role


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_super_admin)


class IsAdminLevel(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_level)


class CanManageSales(BasePermission):
    """Admin level OR sales agent for write methods; everyone authed for read."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.can_manage_sales


class CanRecordPayments(BasePermission):
    """Admin OR cashier for write methods; everyone authed for read."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.can_record_payments


class ReadOnlyOrAdmin(BasePermission):
    """Everyone authenticated reads; only admins write."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_admin_level


ROLE_LABELS = {r.value: r.label for r in Role}

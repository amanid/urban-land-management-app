"""Helpers to record audit events from anywhere in the codebase."""
from .middleware import current_request
from .models import AuditLog


def _client_ip(request):
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log(action: str, entity: str, *, entity_id="", description="", user=None):
    request = current_request()
    ip = _client_ip(request) if request else None
    ua = request.META.get("HTTP_USER_AGENT", "") if request else ""
    if user is None and request is not None and request.user.is_authenticated:
        user = request.user
    AuditLog.objects.create(
        user=user,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        description=description,
        ip=ip,
        user_agent=ua[:255],
    )

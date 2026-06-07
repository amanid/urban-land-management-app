"""Mixin: require a documented reason for sensitive mutations (anti-fraud).

Apply to any ModelViewSet whose updates/deletes must carry a written
justification. The frontend pops a modal asking for the reason before
sending the request, and includes it in the `X-Change-Reason` header.

The reason is persisted in the AuditLog so it can never be silently rewritten.
Hook: we use `initial()` to extract+validate the reason once per request,
and `perform_update` / `perform_destroy` to log it once per mutation.
"""
from __future__ import annotations

from rest_framework.exceptions import ValidationError

from apps.audit.services import log as audit_log

MIN_LEN = 5


def _reason_from(request) -> str:
    reason = request.headers.get("X-Change-Reason") or ""
    if not reason and hasattr(request, "data"):
        try:
            reason = (request.data.get("change_reason") or "")
        except Exception:
            reason = ""
    return (reason or "").strip()


def _label(obj) -> str:
    for attr in ("reference", "code", "display_name", "receipt_number", "title"):
        val = getattr(obj, attr, None)
        if val:
            return str(val)
    return str(obj)


class RequireReasonMixin:
    """Enforce a `X-Change-Reason` header (>= 5 chars) on PATCH/PUT/DELETE."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method.upper() in ("PATCH", "PUT", "DELETE"):
            reason = _reason_from(request)
            if len(reason) < MIN_LEN:
                raise ValidationError({
                    "change_reason": (
                        "Veuillez justifier cette opération "
                        "(5 caractères minimum, en-tête X-Change-Reason). "
                        "Cette information est conservée à des fins d'audit."
                    )
                })
            request._change_reason = reason

    def perform_update(self, serializer):
        instance = serializer.save()
        reason = getattr(self.request, "_change_reason", "")
        audit_log(
            "update", type(instance).__name__, entity_id=instance.pk,
            description=f"{_label(instance)} | MOTIF: {reason}",
        )

    def perform_destroy(self, instance):
        from django.db.models import ProtectedError
        reason = getattr(self.request, "_change_reason", "")
        entity = type(instance).__name__
        entity_id = instance.pk
        label = _label(instance)
        try:
            instance.delete()
        except ProtectedError as exc:
            protected = list(exc.protected_objects)
            kinds = ", ".join(sorted({type(o).__name__ for o in protected}))
            raise ValidationError({
                "detail": (
                    f"Cet enregistrement ne peut pas être supprimé car il est "
                    f"référencé par {len(protected)} autre(s) opération(s) "
                    f"({kinds}). Annulez ou archivez ces opérations d'abord."
                )
            })
        audit_log(
            "delete", entity, entity_id=entity_id,
            description=f"{label} | MOTIF: {reason}",
        )

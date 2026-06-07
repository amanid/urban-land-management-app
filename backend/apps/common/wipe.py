"""Destructive data purge endpoint — super admin only.

Allows clearing test/demo data with a clear scope choice and a mandatory
confirmation phrase. Operations are atomic and audited.
"""
from __future__ import annotations

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.audit.services import log as audit_log
from apps.clients.models import Client, ClientDocument
from apps.lots.models import City, Lot, LotDocument, LotPhoto, Neighborhood, UtilityConnection
from apps.notes.models import Note, TaggedItem
from apps.transactions.models import (
    Acquisition,
    Installment,
    Payment,
    PaymentPlan,
    Sale,
    SaleDocument,
    Withdrawal,
)

CONFIRM_PHRASE = "SUPPRIMER"

# Scope -> list of (model, label) in the order they should be deleted
SCOPES = {
    "transactions": [
        (Payment, "Versements"),
        (Installment, "Échéances"),
        (PaymentPlan, "Plans de paiement"),
        (Withdrawal, "Désistements"),
        (SaleDocument, "Documents de vente"),
        (Sale, "Ventes"),
        (Acquisition, "Acquisitions"),
    ],
    "business": [
        # transactions
        (Payment, "Versements"),
        (Installment, "Échéances"),
        (PaymentPlan, "Plans de paiement"),
        (Withdrawal, "Désistements"),
        (SaleDocument, "Documents de vente"),
        (Sale, "Ventes"),
        (Acquisition, "Acquisitions"),
        # lots
        (LotDocument, "Documents de lots"),
        (LotPhoto, "Photos de lots"),
        (UtilityConnection, "Connexions viabilisation"),
        (Lot, "Lots"),
        (Neighborhood, "Quartiers"),
        (City, "Villes"),
        # clients
        (ClientDocument, "Documents clients"),
        (Client, "Clients"),
        # notes & tags
        (TaggedItem, "Étiquettes appliquées"),
        (Note, "Notes"),
    ],
    "all_except_users": [
        # same as business + audit
        (Payment, "Versements"),
        (Installment, "Échéances"),
        (PaymentPlan, "Plans de paiement"),
        (Withdrawal, "Désistements"),
        (SaleDocument, "Documents de vente"),
        (Sale, "Ventes"),
        (Acquisition, "Acquisitions"),
        (LotDocument, "Documents de lots"),
        (LotPhoto, "Photos de lots"),
        (UtilityConnection, "Connexions viabilisation"),
        (Lot, "Lots"),
        (Neighborhood, "Quartiers"),
        (City, "Villes"),
        (ClientDocument, "Documents clients"),
        (Client, "Clients"),
        (TaggedItem, "Étiquettes appliquées"),
        (Note, "Notes"),
        (AuditLog, "Journal d'audit"),
    ],
}

SCOPE_LABELS = {
    "transactions": "Transactions uniquement (ventes, versements, désistements, acquisitions)",
    "business": "Données métier (lots, clients, ventes, paiements, documents, notes) — garde utilisateurs",
    "all_except_users": "Tout (sauf utilisateurs et rôles) — y compris journal d'audit",
}


def _is_super_admin(user) -> bool:
    return bool(user and user.is_authenticated
                and (getattr(user, "is_super_admin", False) or user.is_superuser))


class WipeDataPreview(APIView):
    """GET — return current counts per entity, without deleting anything."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_super_admin(request.user):
            raise PermissionDenied("Seul un super administrateur peut accéder à cette section.")
        counts = {}
        seen = set()
        for model, label in SCOPES["all_except_users"]:
            if model.__name__ in seen:
                continue
            seen.add(model.__name__)
            counts[model.__name__] = {
                "label": label,
                "count": model.objects.count(),
            }
        return Response({
            "counts": counts,
            "scopes": SCOPE_LABELS,
            "confirm_phrase": CONFIRM_PHRASE,
        })


class WipeDataExecute(APIView):
    """POST {scope, confirm} — actually purge the chosen scope."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _is_super_admin(request.user):
            raise PermissionDenied(
                "Cette opération est réservée aux super administrateurs."
            )
        scope = (request.data.get("scope") or "").strip()
        confirm = (request.data.get("confirm") or "").strip()
        if scope not in SCOPES:
            raise ValidationError({"scope": f"Périmètre invalide. Choisir parmi : {list(SCOPES)}"})
        if confirm != CONFIRM_PHRASE:
            raise ValidationError({
                "confirm": f'Veuillez taper "{CONFIRM_PHRASE}" pour confirmer la suppression.'
            })

        deleted = {}
        # Use a transaction so a failure rolls everything back
        with transaction.atomic():
            for model, label in SCOPES[scope]:
                if model.__name__ in deleted:
                    continue
                count, _details = model.objects.all().delete()
                deleted[model.__name__] = {"label": label, "deleted": count}

        # Log the wipe (best effort — AuditLog may have been wiped in "all_except_users")
        try:
            audit_log(
                "delete", "DATA_WIPE", entity_id="",
                description=f"Purge {scope} par {request.user.email} — {sum(d['deleted'] for d in deleted.values())} objets",
            )
        except Exception:
            pass

        return Response({
            "scope": scope,
            "scope_label": SCOPE_LABELS[scope],
            "deleted": deleted,
            "total": sum(d["deleted"] for d in deleted.values()),
        })

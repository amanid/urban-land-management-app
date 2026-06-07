"""Cross-cutting endpoints: global search, integrity check, history."""
from collections import OrderedDict

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminLevel
from apps.audit.models import AuditLog
from apps.clients.models import Client
from apps.lots.models import Lot
from apps.transactions.models import Acquisition, Payment, Sale


class GlobalSearchView(APIView):
    """GET /api/v1/search/?q=...  -> lots, clients, sales, payments."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        limit = int(request.query_params.get("limit", 10))
        if len(q) < 2:
            return Response({"results": {}, "query": q})

        lots = Lot.objects.filter(
            Q(reference__icontains=q) | Q(title__icontains=q)
            | Q(description__icontains=q) | Q(cadastral_ref__icontains=q)
            | Q(city__name__icontains=q) | Q(neighborhood__name__icontains=q)
        ).select_related("city")[:limit]

        clients = Client.objects.filter(
            Q(code__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q)
            | Q(company_name__icontains=q) | Q(email__icontains=q)
            | Q(id_number__icontains=q) | Q(phone__icontains=q)
        )[:limit]

        sales = Sale.objects.filter(
            Q(reference__icontains=q)
            | Q(lot__reference__icontains=q)
            | Q(client__last_name__icontains=q)
            | Q(client__company_name__icontains=q)
            | Q(client__code__icontains=q)
        ).select_related("lot", "client")[:limit]

        payments = Payment.objects.filter(
            Q(receipt_number__icontains=q) | Q(reference__icontains=q)
            | Q(sale__reference__icontains=q)
            | Q(sale__client__last_name__icontains=q)
        ).select_related("sale__client")[:limit]

        results = OrderedDict([
            ("lots", [
                {"id": l.id, "label": f"{l.reference} — {l.title}",
                 "sub": f"{l.city.name} · {l.surface_m2} m² · {l.asking_price} {l.currency}",
                 "kind": "lot"} for l in lots
            ]),
            ("clients", [
                {"id": c.id, "label": c.display_name,
                 "sub": f"{c.code} · {c.email or c.phone or ''}",
                 "kind": "client"} for c in clients
            ]),
            ("sales", [
                {"id": s.id, "label": f"{s.reference} — {s.client.display_name}",
                 "sub": f"Lot {s.lot.reference} · {s.price} {s.currency} · {s.get_status_display()}",
                 "kind": "sale"} for s in sales
            ]),
            ("payments", [
                {"id": p.id, "label": f"{p.receipt_number} — {p.amount} {p.currency}",
                 "sub": f"{p.sale.reference} · {p.paid_on:%d/%m/%Y} · {p.get_method_display()}",
                 "kind": "payment"} for p in payments
            ]),
        ])
        total = sum(len(v) for v in results.values())
        return Response({"query": q, "total": total, "results": results})


class IntegrityCheckView(APIView):
    """GET /api/v1/integrity/  -> verify payment hash chain.

    Recomputes the SHA-256 chain over Payments grouped by sale.
    Any row whose stored `integrity_hash` differs from the recomputed one
    is reported as tampered. Admin-only.
    """

    permission_classes = [IsAuthenticated, IsAdminLevel]

    def get(self, request):
        tampered = []
        checked = 0
        previous = {}
        for p in (Payment.objects.order_by("sale_id", "id")
                  .only("id", "sale_id", "receipt_number", "amount", "currency",
                        "method", "paid_on", "reference", "received_by_id",
                        "integrity_hash", "previous_hash")):
            checked += 1
            prev_hash = previous.get(p.sale_id, "")
            expected = p._compute_hash(prev_hash)
            if expected != p.integrity_hash:
                tampered.append({
                    "id": p.id,
                    "receipt_number": p.receipt_number,
                    "sale_id": p.sale_id,
                    "stored": p.integrity_hash,
                    "expected": expected,
                })
            previous[p.sale_id] = p.integrity_hash

        return Response({
            "checked": checked,
            "tampered_count": len(tampered),
            "tampered": tampered,
            "status": "ok" if not tampered else "compromised",
        })


class ClientHistoryView(APIView):
    """GET /api/v1/clients/<id>/history/ → unified chronological timeline."""
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        client = get_object_or_404(Client, pk=client_id)
        events = []
        for s in client.sales.select_related("lot").all():
            events.append({
                "ts": s.created_at, "kind": "sale", "title": f"Vente {s.reference}",
                "detail": f"Lot {s.lot.reference} · {s.price} {s.currency} · {s.get_status_display()}",
                "link": f"/sales/{s.id}",
            })
            for p in s.payments.filter(is_void=False):
                events.append({
                    "ts": p.created_at, "kind": "payment", "title": f"Versement {p.receipt_number}",
                    "detail": f"{p.amount} {p.currency} · {p.get_method_display()} · vente {s.reference}",
                    "link": f"/sales/{s.id}",
                })
        for d in client.documents.all():
            events.append({
                "ts": d.uploaded_at, "kind": "document",
                "title": f"Document : {d.get_kind_display()}",
                "detail": d.label or "", "link": d.file.url if d.file else "",
            })
        for log in AuditLog.objects.filter(entity="Client", entity_id=str(client.id))[:30]:
            events.append({
                "ts": log.created_at, "kind": "audit", "title": log.get_action_display(),
                "detail": log.description, "link": "",
            })
        events.sort(key=lambda e: e["ts"], reverse=True)
        return Response({"client": {"id": client.id, "name": client.display_name, "code": client.code},
                         "events": events})


class LotHistoryView(APIView):
    """GET /api/v1/lots/<id>/history/ → acquisitions + sales + status changes."""
    permission_classes = [IsAuthenticated]

    def get(self, request, lot_id):
        lot = get_object_or_404(Lot, pk=lot_id)
        events = []
        for a in lot.acquisitions.all():
            events.append({
                "ts": a.created_at, "kind": "acquisition",
                "title": f"Acquisition {a.reference}",
                "detail": f"{a.amount} {a.currency} · vendeur {a.seller.display_name if a.seller else a.seller_name}",
                "link": "",
            })
        for s in lot.sales.select_related("client").all():
            events.append({
                "ts": s.created_at, "kind": "sale", "title": f"Vente {s.reference}",
                "detail": f"{s.client.display_name} · {s.price} {s.currency} · {s.get_status_display()}",
                "link": f"/sales/{s.id}",
            })
            for p in s.payments.filter(is_void=False):
                events.append({
                    "ts": p.created_at, "kind": "payment",
                    "title": f"Versement {p.receipt_number}",
                    "detail": f"{p.amount} {p.currency} · {p.get_method_display()}",
                    "link": f"/sales/{s.id}",
                })
        for log in AuditLog.objects.filter(entity="Lot", entity_id=str(lot.id))[:30]:
            events.append({
                "ts": log.created_at, "kind": "audit", "title": log.get_action_display(),
                "detail": log.description, "link": "",
            })
        events.sort(key=lambda e: e["ts"], reverse=True)
        return Response({"lot": {"id": lot.id, "reference": lot.reference, "title": lot.title},
                         "events": events})


class GlobalAuditView(APIView):
    """GET /api/v1/history/?entity=...&action=... → admin-only audit log."""
    permission_classes = [IsAuthenticated, IsAdminLevel]

    def get(self, request):
        qs = AuditLog.objects.select_related("user")
        if entity := request.query_params.get("entity"):
            qs = qs.filter(entity=entity)
        if action := request.query_params.get("action"):
            qs = qs.filter(action=action)
        if user_id := request.query_params.get("user"):
            qs = qs.filter(user_id=user_id)
        limit = min(int(request.query_params.get("limit", 100)), 500)
        items = [{
            "id": l.id, "ts": l.created_at, "action": l.action,
            "action_label": l.get_action_display(),
            "entity": l.entity, "entity_id": l.entity_id,
            "description": l.description, "user": l.user.email if l.user else None,
            "ip": l.ip,
        } for l in qs[:limit]]
        return Response({"count": len(items), "items": items})

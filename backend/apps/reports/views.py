"""PDF generation endpoints (receipts, contracts, invoices)."""
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.audit.services import log as audit_log
from apps.transactions.models import Payment, Sale

try:
    from weasyprint import HTML  # type: ignore
    WEASY_AVAILABLE = True
except Exception:  # pragma: no cover - WeasyPrint optional in dev on Windows
    WEASY_AVAILABLE = False


def _render_pdf(template_name: str, context: dict, filename: str) -> HttpResponse:
    html = render_to_string(template_name, context)
    if WEASY_AVAILABLE:
        try:
            pdf = HTML(string=html, base_url=settings.STATIC_URL).write_pdf()
            response = HttpResponse(pdf, content_type="application/pdf")
            response["Content-Disposition"] = f'inline; filename="{filename}"'
            return response
        except Exception:
            # Fall through to HTML response if WeasyPrint runtime fails
            pass
    # HTML fallback — browser-renderable + printable (Ctrl+P)
    return HttpResponse(html)


class ReceiptPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id):
        payment = get_object_or_404(
            Payment.objects.select_related("sale__lot", "sale__client", "received_by"),
            pk=payment_id,
        )
        audit_log("print", "Payment", entity_id=payment.id,
                  description=f"Reçu {payment.receipt_number}")
        context = {
            "payment": payment, "sale": payment.sale, "lot": payment.sale.lot,
            "client": payment.sale.client, "company": settings.COMPANY,
            "amount_in_words": _amount_to_words_fr(payment.amount, payment.currency),
        }
        return _render_pdf("reports/receipt.html", context,
                           filename=f"recu-{payment.receipt_number}.pdf")


class SaleContractPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sale_id):
        sale = get_object_or_404(
            Sale.objects.select_related("lot__city", "client", "agent")
                .prefetch_related("payment_plan__installments"),
            pk=sale_id,
        )
        audit_log("print", "Sale", entity_id=sale.id,
                  description=f"Contrat {sale.reference}")
        context = {
            "sale": sale, "lot": sale.lot, "client": sale.client,
            "company": settings.COMPANY,
            "installments": (sale.payment_plan.installments.all()
                             if hasattr(sale, "payment_plan") else []),
        }
        return _render_pdf("reports/sale_contract.html", context,
                           filename=f"contrat-{sale.reference}.pdf")


class SaleStatementPDFView(APIView):
    """Releve detaille d'une vente: paiements + echeancier + solde."""

    permission_classes = [IsAuthenticated]

    def get(self, request, sale_id):
        sale = get_object_or_404(
            Sale.objects.select_related("lot", "client")
                .prefetch_related("payments", "payment_plan__installments"),
            pk=sale_id,
        )
        audit_log("print", "Sale", entity_id=sale.id, description="statement")
        context = {
            "sale": sale, "lot": sale.lot, "client": sale.client,
            "company": settings.COMPANY,
            "payments": sale.payments.filter(is_void=False),
            "installments": (sale.payment_plan.installments.all()
                             if hasattr(sale, "payment_plan") else []),
        }
        return _render_pdf("reports/sale_statement.html", context,
                           filename=f"releve-{sale.reference}.pdf")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept",
          "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze",
          "quinze", "seize"]
_TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante",
         "soixante", "quatre-vingt", "quatre-vingt"]


def _under_hundred(n: int) -> str:
    if n < 17:
        return _UNITS[n]
    if n < 20:
        return f"dix-{_UNITS[n - 10]}"
    if n < 70:
        ten, unit = divmod(n, 10)
        if unit == 0:
            return _TENS[ten]
        if unit == 1 and ten in (2, 3, 4, 5, 6):
            return f"{_TENS[ten]} et un"
        return f"{_TENS[ten]}-{_UNITS[unit]}"
    if n < 80:
        return f"soixante-{_under_hundred(n - 60)}"
    if n < 100:
        if n == 80:
            return "quatre-vingts"
        return f"quatre-vingt-{_under_hundred(n - 80)}"
    return ""


def _under_thousand(n: int) -> str:
    if n < 100:
        return _under_hundred(n)
    hundreds, rest = divmod(n, 100)
    head = "cent" if hundreds == 1 else f"{_UNITS[hundreds]} cents" if rest == 0 else f"{_UNITS[hundreds]} cent"
    return head if rest == 0 else f"{head} {_under_hundred(rest)}"


def _amount_to_words_fr(amount, currency: str) -> str:
    try:
        n = int(amount)
    except Exception:
        return ""
    if n == 0:
        return f"zéro {currency}"
    parts = []
    millions, n = divmod(n, 1_000_000)
    thousands, n = divmod(n, 1_000)
    if millions:
        parts.append(f"{_under_thousand(millions)} million{'s' if millions > 1 else ''}")
    if thousands:
        parts.append("mille" if thousands == 1 else f"{_under_thousand(thousands)} mille")
    if n:
        parts.append(_under_thousand(n))
    return " ".join(parts) + f" {currency}"

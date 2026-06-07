"""Dashboard KPIs and analytics endpoints."""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminLevel
from apps.clients.models import Client
from apps.lots.models import Lot
from apps.transactions.models import (
    Installment,
    InstallmentStatus,
    Payment,
    Sale,
    SaleStatus,
)


class DashboardOverview(APIView):
    """High-level KPIs and recent activity for the home page."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        lots_qs = Lot.objects.all()
        sales_qs = Sale.objects.exclude(status=SaleStatus.CANCELLED)
        payments_qs = Payment.objects.filter(is_void=False)

        # Inventory
        lots_total = lots_qs.count()
        lots_status = dict(lots_qs.values_list("status").annotate(c=Count("id")).values_list("status", "c"))
        inventory_value = lots_qs.filter(status="available").aggregate(s=Sum("asking_price"))["s"] or 0

        # Revenue
        revenue_year = payments_qs.filter(paid_on__gte=year_start).aggregate(s=Sum("amount"))["s"] or 0
        revenue_month = payments_qs.filter(paid_on__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0
        revenue_today = payments_qs.filter(paid_on=today).aggregate(s=Sum("amount"))["s"] or 0

        # Pipeline
        outstanding = sales_qs.aggregate(
            net=Sum(F("price") - F("discount")),
            paid=Sum("payments__amount", filter=Q(payments__is_void=False)),
        )
        outstanding_value = (outstanding["net"] or 0) - (outstanding["paid"] or 0)

        # Sales counts
        sales_total = sales_qs.count()
        sales_completed = sales_qs.filter(status=SaleStatus.COMPLETED).count()
        sales_in_progress = sales_qs.filter(status=SaleStatus.IN_PROGRESS).count()

        # Clients
        clients_total = Client.objects.count()
        clients_new_month = Client.objects.filter(created_at__date__gte=month_start).count()

        # Overdue
        overdue = Installment.objects.filter(
            status__in=[InstallmentStatus.PENDING, InstallmentStatus.PARTIAL, InstallmentStatus.OVERDUE],
            due_on__lt=today,
        )
        overdue_count = overdue.count()
        overdue_amount = overdue.aggregate(s=Sum(F("amount_due") - F("amount_paid")))["s"] or 0

        # Recent activity
        recent_sales = sales_qs.order_by("-created_at")[:5].values(
            "id", "reference", "price", "currency", "status", "sold_on",
        )
        recent_payments = payments_qs.order_by("-created_at")[:5].values(
            "id", "receipt_number", "amount", "currency", "paid_on", "sale__reference",
        )

        return Response({
            "inventory": {
                "total": lots_total,
                "available": lots_status.get("available", 0),
                "reserved": lots_status.get("reserved", 0),
                "sold": lots_status.get("sold", 0),
                "off_market": lots_status.get("off_market", 0),
                "value_available": inventory_value,
            },
            "revenue": {
                "today": revenue_today, "month": revenue_month, "year": revenue_year,
            },
            "pipeline": {
                "outstanding_value": outstanding_value,
                "sales_total": sales_total,
                "sales_completed": sales_completed,
                "sales_in_progress": sales_in_progress,
            },
            "clients": {"total": clients_total, "new_this_month": clients_new_month},
            "overdue": {"count": overdue_count, "amount": overdue_amount},
            "recent_sales": list(recent_sales),
            "recent_payments": list(recent_payments),
        })


class SalesByPeriod(APIView):
    """Time series — daily counts and revenue."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        granularity = request.query_params.get("granularity", "day")
        since = timezone.localdate() - timedelta(days=days)
        trunc = TruncMonth if granularity == "month" else TruncDay
        qs = (Payment.objects.filter(is_void=False, paid_on__gte=since)
              .annotate(period=trunc("paid_on"))
              .values("period")
              .annotate(amount=Sum("amount"), count=Count("id"))
              .order_by("period"))
        return Response(list(qs))


class TopMetrics(APIView):
    """Top cities / agents / clients."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        cities = (Sale.objects.exclude(status=SaleStatus.CANCELLED)
                  .values("lot__city__name")
                  .annotate(total=Sum(F("price") - F("discount")), count=Count("id"))
                  .order_by("-total")[:5])
        agents = (Sale.objects.exclude(status=SaleStatus.CANCELLED)
                  .values("agent__id", "agent__first_name", "agent__last_name", "agent__email")
                  .annotate(total=Sum(F("price") - F("discount")), count=Count("id"))
                  .order_by("-total")[:5])
        clients = (Sale.objects.exclude(status=SaleStatus.CANCELLED)
                   .values("client__id", "client__last_name", "client__first_name",
                           "client__company_name", "client__code")
                   .annotate(total=Sum(F("price") - F("discount")), count=Count("id"))
                   .order_by("-total")[:5])
        return Response({"cities": list(cities), "agents": list(agents), "clients": list(clients)})


class ByCityPerformance(APIView):
    """Performance commerciale + disponibilité du stock par ville/village."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = list(
            Lot.objects.values("city__id", "city__name", "city__country")
            .annotate(
                total=Count("id"),
                available=Count("id", filter=Q(status="available")),
                reserved=Count("id", filter=Q(status="reserved")),
                sold=Count("id", filter=Q(status="sold")),
                litigation=Count("id", filter=Q(status="litigation")),
                inventory_value=Sum("asking_price", filter=Q(status="available")),
                sold_value=Sum("asking_price", filter=Q(status="sold")),
            )
            .order_by("-total")
        )

        sales_by_city = {}
        for r in (Sale.objects.exclude(status=SaleStatus.CANCELLED)
                  .values("lot__city__id")
                  .annotate(
                      revenue=Sum(F("price") - F("discount")),
                      collected=Sum("payments__amount",
                                    filter=Q(payments__is_void=False, payments__is_refund=False)),
                      refunds=Sum("payments__amount",
                                  filter=Q(payments__is_void=False, payments__is_refund=True)),
                      cogs=Sum("lot__purchase_price"),
                      deals=Count("id"),
                      completed=Count("id", filter=Q(status=SaleStatus.COMPLETED)),
                  )):
            sales_by_city[r["lot__city__id"]] = r

        for r in rows:
            sb = sales_by_city.get(r["city__id"], {})
            revenue = float(sb.get("revenue") or 0)
            cogs = float(sb.get("cogs") or 0)
            collected = float(sb.get("collected") or 0) - float(sb.get("refunds") or 0)
            r["deals"] = sb.get("deals", 0)
            r["completed_deals"] = sb.get("completed", 0)
            r["revenue"] = revenue
            r["collected"] = collected
            r["outstanding"] = revenue - collected
            r["margin"] = revenue - cogs
            r["margin_pct"] = round((revenue - cogs) / revenue * 100, 1) if revenue else 0

        rows = [r for r in rows if r["city__id"] is not None]
        return Response({"cities": rows})


class MonthlySummary(APIView):
    """Analyse mensuelle des performances (12 mois par défaut)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        months_back = int(request.query_params.get("months", 12))
        today = timezone.localdate()
        start_month = (today.replace(day=1)
                       - timedelta(days=30 * (months_back - 1))).replace(day=1)

        def _key(value):
            """Normalise TruncMonth result (date or datetime) to a date(YYYY,MM,1)."""
            if value is None:
                return None
            if hasattr(value, "date"):
                value = value.date()
            return value.replace(day=1)

        payments = (Payment.objects.filter(is_void=False, paid_on__gte=start_month)
                    .annotate(m=TruncMonth("paid_on"))
                    .values("m")
                    .annotate(
                        cash_in=Sum("amount", filter=Q(is_refund=False)),
                        refunds=Sum("amount", filter=Q(is_refund=True)),
                        receipts=Count("id", filter=Q(is_refund=False)),
                    ))
        pay_by_m = {_key(p["m"]): p for p in payments}

        sales = (Sale.objects.exclude(status=SaleStatus.CANCELLED)
                 .filter(sold_on__gte=start_month)
                 .annotate(m=TruncMonth("sold_on"))
                 .values("m")
                 .annotate(
                     deals=Count("id"),
                     completed=Count("id", filter=Q(status=SaleStatus.COMPLETED)),
                     gross=Sum(F("price") - F("discount")),
                     cogs=Sum("lot__purchase_price",
                              filter=Q(status=SaleStatus.COMPLETED)),
                 ))
        sales_by_m = {_key(s["m"]): s for s in sales}

        clients = (Client.objects.filter(created_at__date__gte=start_month)
                   .annotate(m=TruncMonth("created_at"))
                   .values("m").annotate(c=Count("id")))
        cli_by_m = {_key(c["m"]): c["c"] for c in clients}

        lots = (Lot.objects.filter(created_at__date__gte=start_month)
                .annotate(m=TruncMonth("created_at"))
                .values("m").annotate(c=Count("id")))
        lots_by_m = {_key(l["m"]): l["c"] for l in lots}

        from apps.transactions.models import Withdrawal
        withdrawals = (Withdrawal.objects.filter(declared_on__gte=start_month)
                       .annotate(m=TruncMonth("declared_on"))
                       .values("m").annotate(c=Count("id"),
                                             refund_total=Sum("refund_amount")))
        wd_by_m = {_key(w["m"]): w for w in withdrawals}

        months = []
        cur = start_month
        while cur <= today:
            key = cur  # date(YYYY, MM, 1)
            p = pay_by_m.get(key, {})
            s = sales_by_m.get(key, {})
            wd = wd_by_m.get(key, {})
            cash_in = float(p.get("cash_in") or 0)
            refunds = float(p.get("refunds") or 0)
            gross = float(s.get("gross") or 0)
            cogs = float(s.get("cogs") or 0)
            months.append({
                "month": cur.strftime("%Y-%m"),
                "month_label": cur.strftime("%b %Y"),
                "cash_in": cash_in,
                "refunds": refunds,
                "net_cash_in": cash_in - refunds,
                "receipts": p.get("receipts") or 0,
                "deals": s.get("deals") or 0,
                "completed_deals": s.get("completed") or 0,
                "gross_revenue": gross,
                "gross_margin": gross - cogs if gross else 0,
                "margin_pct": round((gross - cogs) / gross * 100, 1) if gross else 0,
                "new_clients": cli_by_m.get(key, 0),
                "new_lots": lots_by_m.get(key, 0),
                "withdrawals": wd.get("c") or 0,
                "refund_total": float(wd.get("refund_total") or 0),
            })
            if cur.month == 12:
                cur = cur.replace(year=cur.year + 1, month=1)
            else:
                cur = cur.replace(month=cur.month + 1)

        mom_growth = 0
        if len(months) >= 2 and months[-2]["net_cash_in"]:
            mom_growth = round(
                (months[-1]["net_cash_in"] - months[-2]["net_cash_in"])
                / months[-2]["net_cash_in"] * 100, 1
            )
        best = max(months, key=lambda m: m["net_cash_in"]) if months else None
        return Response({
            "months": months,
            "mom_growth_pct": mom_growth,
            "best_month": best,
        })


class HealthView(APIView):
    """Production health-check endpoint."""
    permission_classes = []

    def get(self, request):
        from django.db import connection
        ok = True
        try:
            with connection.cursor() as c:
                c.execute("SELECT 1")
        except Exception:
            ok = False
        return Response({"status": "ok" if ok else "degraded", "service": "urban-land", "version": "1.0.0"})


class UserPerformanceView(APIView):
    """Admin-only: breakdown by user (agents and cashiers).

    Returns one row per user with their sales/payment KPIs so management can
    monitor each commercial's contribution.
    """
    permission_classes = [IsAuthenticated, IsAdminLevel]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        today = timezone.localdate()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        users = User.objects.filter(is_active=True).exclude(role="viewer")
        rows = []
        for u in users:
            agent_sales = Sale.objects.filter(agent=u).exclude(status=SaleStatus.CANCELLED)
            cashier_payments = Payment.objects.filter(received_by=u, is_void=False)
            agg_sales = agent_sales.aggregate(
                total=Count("id"),
                completed=Count("id", filter=Q(status=SaleStatus.COMPLETED)),
                in_progress=Count("id", filter=Q(status=SaleStatus.IN_PROGRESS)),
                gross=Sum(F("price") - F("discount")),
                paid=Sum("payments__amount", filter=Q(payments__is_void=False)),
            )
            outstanding = (agg_sales["gross"] or 0) - (agg_sales["paid"] or 0)
            rev_month = (cashier_payments.filter(paid_on__gte=month_start)
                         .aggregate(s=Sum("amount"))["s"]) or 0
            rev_year = (cashier_payments.filter(paid_on__gte=year_start)
                        .aggregate(s=Sum("amount"))["s"]) or 0
            rows.append({
                "id": u.id, "email": u.email,
                "full_name": u.get_full_name() or u.email,
                "role": u.role, "role_label": u.get_role_display(),
                "is_active": u.is_active, "is_locked": u.is_locked,
                "last_login": u.last_login,
                "sales_count": agg_sales["total"] or 0,
                "sales_completed": agg_sales["completed"] or 0,
                "sales_in_progress": agg_sales["in_progress"] or 0,
                "gross_value": agg_sales["gross"] or 0,
                "paid_value": agg_sales["paid"] or 0,
                "outstanding": outstanding,
                "payments_collected_month": rev_month,
                "payments_collected_year": rev_year,
            })
        rows.sort(key=lambda r: -float(r["gross_value"] or 0))
        return Response({"users": rows})


class AgentDashboard(APIView):
    """Personal performance view for the connected user (agent/cashier).

    Admins can pass `?as_user=<id>` to view another user's perspective.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Admin may impersonate another user's perspective
        as_user_id = request.query_params.get("as_user")
        if as_user_id and (request.user.is_admin_level if hasattr(request.user, "is_admin_level") else False):
            from django.contrib.auth import get_user_model
            try:
                user = get_user_model().objects.get(pk=as_user_id)
            except Exception:
                user = request.user
        today = timezone.localdate()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        my_sales = Sale.objects.filter(agent=user).exclude(status=SaleStatus.CANCELLED)
        my_payments = Payment.objects.filter(received_by=user, is_void=False)

        # My KPIs
        kpis = {
            "sales_total": my_sales.count(),
            "sales_completed": my_sales.filter(status=SaleStatus.COMPLETED).count(),
            "sales_in_progress": my_sales.filter(status=SaleStatus.IN_PROGRESS).count(),
            "revenue_month": (my_payments.filter(paid_on__gte=month_start)
                              .aggregate(s=Sum("amount"))["s"]) or 0,
            "revenue_year": (my_payments.filter(paid_on__gte=year_start)
                             .aggregate(s=Sum("amount"))["s"]) or 0,
            "outstanding": (my_sales.aggregate(
                net=Sum(F("price") - F("discount")),
                paid=Sum("payments__amount", filter=Q(payments__is_void=False)),
            )),
        }
        outstanding = (kpis["outstanding"]["net"] or 0) - (kpis["outstanding"]["paid"] or 0)
        kpis["outstanding_value"] = outstanding

        # Available inventory the agent can offer
        inventory = {
            "available": Lot.objects.filter(status="available").count(),
            "reserved_by_me": Lot.objects.filter(
                sales__agent=user, sales__status__in=[SaleStatus.RESERVED, SaleStatus.IN_PROGRESS]
            ).distinct().count(),
        }

        # My upcoming installments (clients to chase this week)
        soon = Installment.objects.filter(
            plan__sale__agent=user,
            status__in=[InstallmentStatus.PENDING, InstallmentStatus.PARTIAL, InstallmentStatus.OVERDUE],
            due_on__lte=today + timedelta(days=14),
        ).select_related("plan__sale__client").order_by("due_on")[:10]
        upcoming = [{
            "id": i.id, "due_on": i.due_on, "amount_due": i.amount_due,
            "balance": i.amount_due - i.amount_paid,
            "sale_ref": i.plan.sale.reference,
            "client": i.plan.sale.client.display_name,
            "is_overdue": i.is_overdue,
        } for i in soon]

        # Daily revenue last 14 days (for sparkline)
        since = today - timedelta(days=14)
        series = (my_payments.filter(paid_on__gte=since)
                  .annotate(d=TruncDay("paid_on"))
                  .values("d").annotate(amount=Sum("amount"))
                  .order_by("d"))

        # Best performing peers (anonymised) — top 5 agents this month
        ranking = (Sale.objects.exclude(status=SaleStatus.CANCELLED)
                   .filter(sold_on__gte=month_start)
                   .values("agent__id", "agent__first_name", "agent__last_name")
                   .annotate(total=Sum(F("price") - F("discount")))
                   .order_by("-total")[:5])

        return Response({
            "kpis": kpis, "inventory": inventory,
            "upcoming_installments": upcoming,
            "daily_revenue": list(series),
            "ranking": list(ranking),
        })


class AdminDashboard(APIView):
    """Comprehensive business view + fraud signals + advanced analytics."""
    permission_classes = [IsAuthenticated, IsAdminLevel]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        sales_qs = Sale.objects.exclude(status=SaleStatus.CANCELLED)
        payments_qs = Payment.objects.filter(is_void=False)
        lots_qs = Lot.objects.all()

        # Headline KPIs
        revenue_year = payments_qs.filter(paid_on__gte=year_start).aggregate(s=Sum("amount"))["s"] or 0
        revenue_month = payments_qs.filter(paid_on__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0
        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
        prev_month_end = month_start - timedelta(days=1)
        revenue_prev_month = payments_qs.filter(
            paid_on__gte=prev_month_start, paid_on__lte=prev_month_end,
        ).aggregate(s=Sum("amount"))["s"] or 0
        mom_growth = 0
        if revenue_prev_month:
            mom_growth = float((Decimal(revenue_month) - Decimal(revenue_prev_month))
                               / Decimal(revenue_prev_month) * 100)

        # Margins (very rough: sale price - lot purchase price for completed sales)
        margin = sales_qs.filter(status=SaleStatus.COMPLETED).aggregate(
            revenue=Sum(F("price") - F("discount")),
            cogs=Sum("lot__purchase_price"),
        )
        gross_margin = (margin["revenue"] or 0) - (margin["cogs"] or 0)
        margin_pct = float(gross_margin / margin["revenue"] * 100) if margin["revenue"] else 0

        # Outstanding
        outstanding = sales_qs.aggregate(
            net=Sum(F("price") - F("discount")),
            paid=Sum("payments__amount", filter=Q(payments__is_void=False)),
        )
        outstanding_value = (outstanding["net"] or 0) - (outstanding["paid"] or 0)

        # Pipeline by status
        pipeline = list(sales_qs.values("status").annotate(
            count=Count("id"), value=Sum(F("price") - F("discount")),
        ).order_by("status"))

        # Inventory by city
        inventory_by_city = list(
            lots_qs.values("city__name").annotate(
                total=Count("id"),
                available=Count("id", filter=Q(status="available")),
                sold=Count("id", filter=Q(status="sold")),
                value=Sum("asking_price", filter=Q(status="available")),
            ).order_by("-total")[:8]
        )

        # Monthly time series (12 months)
        twelve_months_ago = today.replace(day=1) - timedelta(days=365)
        monthly = list(payments_qs.filter(paid_on__gte=twelve_months_ago)
                       .annotate(m=TruncMonth("paid_on"))
                       .values("m").annotate(amount=Sum("amount"), count=Count("id"))
                       .order_by("m"))

        # Top performers
        top_agents = list(sales_qs.filter(sold_on__gte=year_start)
                          .values("agent__id", "agent__first_name", "agent__last_name", "agent__email")
                          .annotate(revenue=Sum(F("price") - F("discount")),
                                    deals=Count("id"))
                          .order_by("-revenue")[:5])
        top_cities = list(sales_qs.values("lot__city__name")
                          .annotate(revenue=Sum(F("price") - F("discount")),
                                    deals=Count("id"))
                          .order_by("-revenue")[:5])

        # Forecasted cash-in over next 60 days (sum of due instalments)
        forecast = list(Installment.objects.filter(
            status__in=[InstallmentStatus.PENDING, InstallmentStatus.PARTIAL],
            due_on__gte=today, due_on__lte=today + timedelta(days=60),
        ).annotate(week=TruncDay("due_on"))
          .values("week").annotate(amount=Sum(F("amount_due") - F("amount_paid")))
          .order_by("week"))

        # Overdue
        overdue_qs = Installment.objects.filter(
            status__in=[InstallmentStatus.PENDING, InstallmentStatus.PARTIAL, InstallmentStatus.OVERDUE],
            due_on__lt=today,
        )
        overdue_aging = {
            "0_30": overdue_qs.filter(due_on__gte=today - timedelta(days=30)).aggregate(
                s=Sum(F("amount_due") - F("amount_paid")))["s"] or 0,
            "31_60": overdue_qs.filter(due_on__gte=today - timedelta(days=60),
                                        due_on__lt=today - timedelta(days=30)).aggregate(
                s=Sum(F("amount_due") - F("amount_paid")))["s"] or 0,
            "61_90": overdue_qs.filter(due_on__gte=today - timedelta(days=90),
                                        due_on__lt=today - timedelta(days=60)).aggregate(
                s=Sum(F("amount_due") - F("amount_paid")))["s"] or 0,
            "90_plus": overdue_qs.filter(due_on__lt=today - timedelta(days=90)).aggregate(
                s=Sum(F("amount_due") - F("amount_paid")))["s"] or 0,
        }

        # Fraud signals
        fraud_signals = _detect_fraud_signals()

        return Response({
            "headline": {
                "revenue_year": revenue_year, "revenue_month": revenue_month,
                "mom_growth_pct": round(mom_growth, 1),
                "gross_margin": gross_margin, "margin_pct": round(margin_pct, 1),
                "outstanding_value": outstanding_value,
                "lots_available": lots_qs.filter(status="available").count(),
                "lots_sold_ytd": lots_qs.filter(status="sold").count(),
                "clients_total": Client.objects.count(),
            },
            "pipeline": pipeline,
            "inventory_by_city": inventory_by_city,
            "monthly_revenue": monthly,
            "top_agents": top_agents,
            "top_cities": top_cities,
            "cash_forecast": forecast,
            "overdue_aging": overdue_aging,
            "fraud_signals": fraud_signals,
        })


def _detect_fraud_signals():
    """Compute a list of suspicious patterns for the admin dashboard."""
    today = timezone.localdate()
    signals = []

    # 1. Tampered hash chain (most critical)
    try:
        previous = {}
        tampered = 0
        for p in (Payment.objects.order_by("sale_id", "id")
                  .only("id", "sale_id", "receipt_number", "amount", "currency",
                        "method", "paid_on", "reference", "received_by_id",
                        "integrity_hash", "previous_hash")):
            prev_hash = previous.get(p.sale_id, "")
            if p._compute_hash(prev_hash) != p.integrity_hash:
                tampered += 1
            previous[p.sale_id] = p.integrity_hash
        if tampered:
            signals.append({
                "level": "critical", "kind": "hash_mismatch",
                "label": "Empreintes de versements altérées",
                "count": tampered,
                "description": "La chaîne d'intégrité des versements est rompue. Lancez la vérification d'intégrité.",
            })
    except Exception:
        pass

    # 2. Sales modified after completion
    modified_completed = Sale.objects.filter(status=SaleStatus.COMPLETED).extra(
        where=["updated_at - created_at > interval '1 day'"]
    ).count() if Sale.objects.exists() else 0
    if modified_completed:
        signals.append({
            "level": "high", "kind": "completed_sale_modified",
            "label": "Ventes soldées modifiées après finalisation",
            "count": modified_completed,
        })

    # 3. Voided payments > 5% of payments this month
    month_start = today.replace(day=1)
    month_payments = Payment.objects.filter(created_at__date__gte=month_start)
    total = month_payments.count() or 1
    voided = month_payments.filter(is_void=True).count()
    void_pct = voided / total * 100
    if void_pct > 5:
        signals.append({
            "level": "medium", "kind": "high_void_rate",
            "label": "Taux d'annulation de versements élevé",
            "count": voided,
            "description": f"{void_pct:.1f}% des versements de ce mois ont été annulés.",
        })

    # 4. Sales price below 70% of asking price
    suspicious_discount = Sale.objects.filter(
        status__in=[SaleStatus.COMPLETED, SaleStatus.IN_PROGRESS],
        price__lt=F("lot__asking_price") * Decimal("0.7"),
    ).count()
    if suspicious_discount:
        signals.append({
            "level": "medium", "kind": "deep_discount",
            "label": "Ventes très inférieures au prix affiché",
            "count": suspicious_discount,
            "description": "Plus de 30% de remise sur le prix affiché.",
        })

    # 5. Duplicate client IDs (same id_number)
    from django.db.models import Count as _Count
    dup_ids = (Client.objects.exclude(id_number="")
               .values("id_number").annotate(c=_Count("id"))
               .filter(c__gt=1).count())
    if dup_ids:
        signals.append({
            "level": "medium", "kind": "duplicate_id",
            "label": "Numéros de pièce d'identité dupliqués",
            "count": dup_ids,
        })

    # 6. Payment receipts created out-of-order on the same day
    # (proxy: more than 10 payments by one user in a single day)
    heavy_day = (Payment.objects.values("received_by_id", "paid_on")
                 .annotate(c=Count("id")).filter(c__gte=10).count())
    if heavy_day:
        signals.append({
            "level": "low", "kind": "high_volume_day",
            "label": "Forte volumétrie de versements par un seul opérateur",
            "count": heavy_day,
        })

    return signals

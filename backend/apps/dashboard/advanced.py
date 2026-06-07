"""Advanced analytics endpoint: forecasting, cohorts, scoring, anomalies."""
import statistics
from datetime import timedelta
from decimal import Decimal

from django.db.models import (
    Avg,
    Count,
    DurationField,
    ExpressionWrapper,
    F,
    Max,
    Q,
    StdDev,
    Sum,
)
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


class AdvancedAnalytics(APIView):
    """One endpoint to power the admin "deep dive" panel.

    Returns: forecasting, cohorts, customer risk scoring, conversion funnel,
    geographic distribution, anomaly detection signals.
    """

    permission_classes = [IsAuthenticated, IsAdminLevel]

    def get(self, request):
        today = timezone.localdate()
        year_start = today.replace(month=1, day=1)

        return Response({
            "forecast": self._cash_forecast(today),
            "cohorts": self._client_cohorts(),
            "client_risk": self._client_risk_scoring(),
            "conversion_funnel": self._conversion_funnel(),
            "geo_distribution": self._geo_distribution(),
            "anomalies": self._anomalies(today),
            "sale_velocity": self._sale_velocity(),
            "profitability": self._profitability_by_dimension(),
            "performance_vs_target": self._performance_vs_target(year_start, today),
        })

    # -----------------------------------------------------------------
    def _cash_forecast(self, today):
        """Project incoming cash from scheduled instalments + a moving average."""
        # Scheduled cash-in (next 90 days, by week bucket)
        scheduled = list(
            Installment.objects.filter(
                status__in=[InstallmentStatus.PENDING, InstallmentStatus.PARTIAL],
                due_on__gte=today, due_on__lte=today + timedelta(days=90),
            ).annotate(d=TruncDay("due_on"))
            .values("d").annotate(amount=Sum(F("amount_due") - F("amount_paid")))
            .order_by("d")
        )

        # Historical 30-day moving average of daily collection
        last90 = list(
            Payment.objects.filter(is_void=False,
                                   paid_on__gte=today - timedelta(days=90))
            .annotate(d=TruncDay("paid_on"))
            .values("d").annotate(amount=Sum("amount")).order_by("d")
        )
        amounts = [float(r["amount"] or 0) for r in last90]
        moving_avg = round(sum(amounts) / len(amounts), 2) if amounts else 0
        stdev = round(statistics.pstdev(amounts), 2) if len(amounts) > 1 else 0
        return {
            "scheduled": scheduled,
            "history_30d_avg": moving_avg,
            "history_volatility": stdev,
            "next_30d_expected": sum(float(r["amount"] or 0) for r in scheduled[:30]) or moving_avg * 30,
        }

    def _client_cohorts(self):
        """Group clients by acquisition month, show their lifetime value."""
        rows = list(
            Sale.objects.exclude(status=SaleStatus.CANCELLED)
            .annotate(acq_month=TruncMonth("client__created_at"))
            .values("acq_month")
            .annotate(
                clients=Count("client_id", distinct=True),
                revenue=Sum(F("price") - F("discount")),
                deals=Count("id"),
            )
            .order_by("acq_month")
        )
        return rows[-12:]

    def _client_risk_scoring(self):
        """Score each active client: payment punctuality + outstanding."""
        scored = []
        clients = Client.objects.filter(is_active=True).prefetch_related(
            "sales__payment_plan__installments"
        )
        for c in clients[:200]:
            overdue, on_time, total_outstanding = 0, 0, Decimal("0")
            for sale in c.sales.all():
                if not hasattr(sale, "payment_plan"):
                    continue
                for inst in sale.payment_plan.installments.all():
                    if inst.status == InstallmentStatus.OVERDUE:
                        overdue += 1
                    elif inst.status == InstallmentStatus.PAID:
                        on_time += 1
                    total_outstanding += (inst.amount_due - inst.amount_paid)
            total = overdue + on_time
            if total == 0:
                continue
            on_time_pct = on_time / total * 100
            risk = "low"
            if overdue >= 3 or on_time_pct < 60:
                risk = "high"
            elif overdue >= 1 or on_time_pct < 85:
                risk = "medium"
            scored.append({
                "client_id": c.id, "name": c.display_name, "code": c.code,
                "on_time_pct": round(on_time_pct, 1),
                "overdue_count": overdue,
                "outstanding": float(total_outstanding),
                "risk": risk,
            })
        scored.sort(key=lambda r: (r["risk"] == "high", -r["overdue_count"]), reverse=True)
        return scored[:25]

    def _conversion_funnel(self):
        """Lot lifecycle funnel: catalog → reserved → in progress → sold."""
        return {
            "in_catalog": Lot.objects.count(),
            "available": Lot.objects.filter(status="available").count(),
            "reserved": Lot.objects.filter(status="reserved").count(),
            "in_progress": Lot.objects.filter(sales__status=SaleStatus.IN_PROGRESS).distinct().count(),
            "sold": Lot.objects.filter(status="sold").count(),
        }

    def _geo_distribution(self):
        """Sales density by city — feeds a map heatmap."""
        rows = list(Sale.objects.exclude(status=SaleStatus.CANCELLED)
                    .values("lot__city__name",
                            "lot__latitude", "lot__longitude")
                    .annotate(deals=Count("id"),
                              revenue=Sum(F("price") - F("discount")))
                    .order_by("-deals"))
        return rows

    def _anomalies(self, today):
        """Statistical outliers: payment amounts > mean + 2 stdev, etc."""
        amounts = list(Payment.objects.filter(is_void=False, paid_on__gte=today - timedelta(days=180))
                       .values_list("amount", flat=True))
        if len(amounts) < 5:
            return {"outlier_payments": [], "spike_days": []}
        mean = float(sum(amounts) / len(amounts))
        stdev = statistics.pstdev([float(a) for a in amounts]) or 1
        threshold = mean + 2 * stdev
        outliers = list(
            Payment.objects.filter(is_void=False, amount__gt=threshold)
            .order_by("-amount")
            .values("id", "receipt_number", "amount", "currency", "paid_on",
                    "sale__reference", "received_by__email")[:10]
        )

        # Spike days: days where total > 2.5x daily average
        daily = list(Payment.objects.filter(is_void=False, paid_on__gte=today - timedelta(days=60))
                     .annotate(d=TruncDay("paid_on"))
                     .values("d").annotate(amount=Sum("amount")))
        if daily:
            avg_day = sum(float(r["amount"] or 0) for r in daily) / len(daily)
            spikes = [r for r in daily if float(r["amount"] or 0) > 2.5 * avg_day]
        else:
            spikes = []

        return {
            "outlier_payments": outliers,
            "spike_days": spikes,
            "thresholds": {"mean": round(mean, 2), "stdev": round(stdev, 2),
                           "outlier_threshold": round(threshold, 2)},
        }

    def _sale_velocity(self):
        """Average days between lot creation and first sale, and between sale and completion."""
        with_sales = Sale.objects.filter(status=SaleStatus.COMPLETED).annotate(
            days_to_close=ExpressionWrapper(F("updated_at") - F("created_at"),
                                            output_field=DurationField()),
        )
        if not with_sales.exists():
            return {"avg_days_to_close": None, "median_days_to_close": None, "by_city": []}
        durations = [s.days_to_close.days for s in with_sales[:200] if s.days_to_close]
        avg = round(sum(durations) / len(durations), 1) if durations else 0
        med = statistics.median(durations) if durations else 0
        by_city = list(
            Sale.objects.filter(status=SaleStatus.COMPLETED)
            .values("lot__city__name")
            .annotate(avg_days=Avg(F("updated_at") - F("created_at")),
                      deals=Count("id"))
        )
        return {"avg_days_to_close": avg, "median_days_to_close": med, "by_city": by_city}

    def _profitability_by_dimension(self):
        """Gross margin by lot type and by city."""
        by_type = list(
            Sale.objects.filter(status=SaleStatus.COMPLETED)
            .values("lot__lot_type")
            .annotate(
                revenue=Sum(F("price") - F("discount")),
                cogs=Sum("lot__purchase_price"),
                deals=Count("id"),
            )
        )
        for r in by_type:
            rev = float(r["revenue"] or 0)
            r["margin"] = round(rev - float(r["cogs"] or 0), 2)
            r["margin_pct"] = round(((rev - float(r["cogs"] or 0)) / rev * 100), 1) if rev else 0

        by_city = list(
            Sale.objects.filter(status=SaleStatus.COMPLETED)
            .values("lot__city__name")
            .annotate(
                revenue=Sum(F("price") - F("discount")),
                cogs=Sum("lot__purchase_price"),
                deals=Count("id"),
            )
        )
        for r in by_city:
            rev = float(r["revenue"] or 0)
            r["margin"] = round(rev - float(r["cogs"] or 0), 2)
            r["margin_pct"] = round(((rev - float(r["cogs"] or 0)) / rev * 100), 1) if rev else 0

        return {"by_type": by_type, "by_city": by_city}

    def _performance_vs_target(self, year_start, today):
        """Year-to-date revenue vs an implicit target (sum of asking prices of sold lots)."""
        ytd_revenue = Payment.objects.filter(
            is_void=False, paid_on__gte=year_start,
        ).aggregate(s=Sum("amount"))["s"] or 0
        # Annual target = total catalog value at year start (a rough heuristic)
        target = Lot.objects.aggregate(s=Sum("asking_price"))["s"] or 0
        target_annual = float(target) * 0.5  # 50% of catalog as a stretch target
        days_in_year = (today.replace(month=12, day=31) - year_start).days + 1
        days_elapsed = (today - year_start).days + 1
        expected_to_date = target_annual * days_elapsed / days_in_year
        achievement = float(ytd_revenue) / expected_to_date * 100 if expected_to_date else 0
        return {
            "ytd_revenue": float(ytd_revenue),
            "annual_target": target_annual,
            "expected_to_date": expected_to_date,
            "achievement_pct": round(achievement, 1),
        }

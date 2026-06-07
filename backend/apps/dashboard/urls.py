from django.urls import path

from .advanced import AdvancedAnalytics
from .views import (
    AdminDashboard,
    AgentDashboard,
    ByCityPerformance,
    DashboardOverview,
    HealthView,
    MonthlySummary,
    SalesByPeriod,
    TopMetrics,
    UserPerformanceView,
)

urlpatterns = [
    path("overview/", DashboardOverview.as_view(), name="dashboard-overview"),
    path("agent/", AgentDashboard.as_view(), name="dashboard-agent"),
    path("admin/", AdminDashboard.as_view(), name="dashboard-admin"),
    path("user-performance/", UserPerformanceView.as_view(), name="dashboard-user-performance"),
    path("by-city/", ByCityPerformance.as_view(), name="dashboard-by-city"),
    path("monthly/", MonthlySummary.as_view(), name="dashboard-monthly"),
    path("advanced/", AdvancedAnalytics.as_view(), name="dashboard-advanced"),
    path("sales-by-period/", SalesByPeriod.as_view(), name="sales-by-period"),
    path("top/", TopMetrics.as_view(), name="dashboard-top"),
    path("health/", HealthView.as_view(), name="health"),
]

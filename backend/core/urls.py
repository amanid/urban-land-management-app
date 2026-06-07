"""Top-level URL routing."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

# Rebrand the admin site
admin.site.site_header = "Urban Land · Console d'administration"
admin.site.site_title = "Urban Land"
admin.site.index_title = "Tableau de bord administrateur"

api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("lots/", include("apps.lots.urls")),
    path("clients/", include("apps.clients.urls")),
    path("transactions/", include("apps.transactions.urls")),
    path("reports/", include("apps.reports.urls")),
    path("dashboard/", include("apps.dashboard.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("notes/", include("apps.notes.urls")),
    path("", include("apps.common.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

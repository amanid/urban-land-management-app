"""Top-level URL routing.

L'API est servie sous /api/v1/, /api/docs/, /admin/, /media/.
Toute autre route est captee par le SPA catch-all qui sert le frontend React
buildé (frontend_dist/index.html) — seulement si SERVE_FRONTEND=1 et que
le dossier existe (deploiement tout-en-un).
"""
import os
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from apps.common.frontend import SpaCatchAllView, frontend_available

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

# Servir les fichiers media (en debug ou si pas de CDN configure)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# -------------------------------------------------------------------
# SPA catch-all : sert le frontend React pour toute autre route.
# Active uniquement si :
#   1. SERVE_FRONTEND=1 (par defaut active dans le Dockerfile)
#   2. frontend_dist/index.html existe (build present)
# -------------------------------------------------------------------
if os.environ.get("SERVE_FRONTEND", "0") == "1" and frontend_available():
    urlpatterns += [
        re_path(r"^(?P<path>.*)$", SpaCatchAllView.as_view(), name="spa-catchall"),
    ]

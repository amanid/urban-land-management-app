"""Sert le frontend React buildé depuis Django (deploiement tout-en-un).

Active uniquement si SERVE_FRONTEND=1 ET que le repertoire frontend_dist/
existe. Cela permet d'avoir UN seul service Render qui heberge a la fois
l'API et l'interface utilisateur, sans dependances externes.
"""
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseNotFound
from django.views import View


FRONTEND_DIST = Path(settings.BASE_DIR) / "frontend_dist"


def frontend_available() -> bool:
    """True si le build du frontend a ete copie dans le container."""
    return FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists()


class SpaCatchAllView(View):
    """Sert le frontend React pour toute route non-API.

    Pour /assets/* et autres fichiers presents dans dist/, sert le fichier
    directement. Pour toute autre route (ex. /lots, /clients/123), sert
    index.html pour que React Router prenne le relais.
    """

    def get(self, request, path=""):
        if not frontend_available():
            return HttpResponseNotFound(
                "Frontend non disponible. Construisez avec `npm run build` ou "
                "deployez via le Dockerfile racine."
            )

        # Bloc / par defaut, ou route SPA -> index.html
        if not path or path == "" or path == "/":
            return FileResponse(open(FRONTEND_DIST / "index.html", "rb"),
                                content_type="text/html")

        # Tentative de servir un fichier statique du build
        requested = (FRONTEND_DIST / path).resolve()
        try:
            requested.relative_to(FRONTEND_DIST.resolve())
        except ValueError:
            raise Http404()  # tentative de traversal

        if requested.is_file():
            content_type = None
            ext = requested.suffix.lower()
            if ext == ".js":
                content_type = "application/javascript"
            elif ext == ".css":
                content_type = "text/css"
            elif ext == ".html":
                content_type = "text/html"
            elif ext == ".svg":
                content_type = "image/svg+xml"
            elif ext == ".woff2":
                content_type = "font/woff2"
            elif ext == ".json":
                content_type = "application/json"
            return FileResponse(open(requested, "rb"), content_type=content_type)

        # Route SPA inconnue -> retourne index.html (React Router gere)
        return FileResponse(open(FRONTEND_DIST / "index.html", "rb"),
                            content_type="text/html")

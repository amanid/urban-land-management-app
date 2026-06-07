"""Custom DRF exception handler with clean French messages."""
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    # Normalize "detail" to a friendly French message
    if isinstance(response.data, dict) and "detail" in response.data:
        detail = response.data["detail"]
        if response.status_code == 401:
            response.data["detail"] = "Session expirée ou non authentifiée. Veuillez vous reconnecter."
        elif response.status_code == 403:
            response.data["detail"] = "Vous n'avez pas les permissions nécessaires pour cette action."
        elif response.status_code == 404:
            response.data["detail"] = "Ressource introuvable."
        elif response.status_code == 405:
            response.data["detail"] = "Méthode non autorisée sur cette ressource."
        elif response.status_code == 429:
            response.data["detail"] = "Trop de requêtes. Réessayez dans un instant."
    return response

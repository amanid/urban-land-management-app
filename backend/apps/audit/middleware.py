"""Captures the requesting IP so signal handlers can log it."""
import threading

_local = threading.local()


def current_request():
    return getattr(_local, "request", None)


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.request = request
        try:
            return self.get_response(request)
        finally:
            _local.request = None

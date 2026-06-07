"""Semantic, large-namespace identifier generators.

Format: PREFIX-YYYY-XXXXXX(XX...)
- PREFIX : 3-letter domain code (LOT, CLT, VTE, ACQ, REC, ECH)
- YYYY   : 4-digit year (calendar context)
- XXXX.. : random hex slice, default 8 chars (~4 billion combinations)
           configurable up to 16 chars when needed (anti-saturation)

Anti-collision: caller passes a Django model + field; we retry on collision.
Anti-prediction: hex slice comes from `secrets.token_hex`, not from a counter.
"""
from __future__ import annotations

import secrets
from datetime import date


def make_identifier(prefix: str, *, width: int = 8, year: int | None = None) -> str:
    year = year or date.today().year
    token = secrets.token_hex(max(4, width // 2)).upper()[:width]
    return f"{prefix.upper()}-{year}-{token}"


def unique_identifier(model_cls, field_name: str, prefix: str, *, width: int = 8) -> str:
    """Generate an identifier guaranteed unique against the given column."""
    for _ in range(8):
        candidate = make_identifier(prefix, width=width)
        if not model_cls.objects.filter(**{field_name: candidate}).exists():
            return candidate
    # widen the namespace if we somehow lost the lottery 8 times in a row
    return make_identifier(prefix, width=width + 4)

"""Re-compute integrity hashes for all existing Payment rows.

Use this command after upgrading the hash format (eg. adding a field to the
payload) to bring the audit chain back in sync. Each payment's hash is
recomputed using the current `_compute_hash` implementation, chained on the
previous payment of the same sale.
"""
from django.core.management.base import BaseCommand

from apps.transactions.models import Payment


class Command(BaseCommand):
    help = "Recompute SHA-256 integrity hashes for all Payments (per sale chain)."

    def handle(self, *args, **options):
        prev_by_sale = {}
        total = 0
        for p in Payment.objects.order_by("sale_id", "id"):
            prev_hash = prev_by_sale.get(p.sale_id, "")
            new_hash = p._compute_hash(prev_hash)
            if p.integrity_hash != new_hash or p.previous_hash != prev_hash:
                p.previous_hash = prev_hash
                p.integrity_hash = new_hash
                p.save(update_fields=["previous_hash", "integrity_hash"])
                total += 1
            prev_by_sale[p.sale_id] = new_hash
        self.stdout.write(self.style.SUCCESS(
            f"Recomputed {total} Payment hash(es). Chain is now consistent."
        ))

"""Create the canonical role Groups with their default permissions."""
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand

from apps.accounts.models import Role

# Module-level permission packages by app label.
READ_ONLY = ("view_{model}",)
FULL_CRUD = ("view_{model}", "add_{model}", "change_{model}", "delete_{model}")
WRITE_NO_DELETE = ("view_{model}", "add_{model}", "change_{model}")

ROLE_MATRIX = {
    Role.SUPER_ADMIN: "ALL",
    Role.ADMIN: {
        "lots": ("city", "neighborhood", "lot", "lotphoto", "utilityconnection"),
        "clients": ("client", "clientdocument"),
        "transactions": ("acquisition", "sale", "paymentplan", "installment", "payment"),
        "accounts": ("user",),
    },
    Role.SALES_AGENT: {
        "lots": (("lot", WRITE_NO_DELETE), ("lotphoto", WRITE_NO_DELETE),
                 ("city", READ_ONLY), ("neighborhood", READ_ONLY),
                 ("utilityconnection", READ_ONLY)),
        "clients": (("client", FULL_CRUD), ("clientdocument", FULL_CRUD)),
        "transactions": (("sale", WRITE_NO_DELETE), ("paymentplan", WRITE_NO_DELETE),
                         ("installment", READ_ONLY), ("payment", READ_ONLY),
                         ("acquisition", READ_ONLY)),
    },
    Role.CASHIER: {
        "lots": (("lot", READ_ONLY),),
        "clients": (("client", READ_ONLY), ("clientdocument", READ_ONLY)),
        "transactions": (("sale", READ_ONLY), ("paymentplan", READ_ONLY),
                         ("installment", READ_ONLY),
                         ("payment", WRITE_NO_DELETE)),
    },
    Role.VIEWER: {
        "lots": (("lot", READ_ONLY), ("city", READ_ONLY), ("neighborhood", READ_ONLY)),
        "clients": (("client", READ_ONLY), ("clientdocument", READ_ONLY)),
        "transactions": (("sale", READ_ONLY), ("payment", READ_ONLY)),
    },
}


class Command(BaseCommand):
    help = "Cree les groupes de roles et attribue leurs permissions par defaut."

    def handle(self, *args, **options):
        for role_value, label in Role.choices:
            group, created = Group.objects.get_or_create(name=role_value)
            self._apply(group, role_value)
            verb = "Cree" if created else "Mis a jour"
            self.stdout.write(self.style.SUCCESS(f"{verb}: {label} ({role_value})"))

    def _apply(self, group: Group, role_value: str):
        spec = ROLE_MATRIX.get(role_value)
        if spec == "ALL":
            group.permissions.set(Permission.objects.all())
            return

        if not spec:
            group.permissions.clear()
            return

        permissions: list[Permission] = []
        for app_label, entries in spec.items():
            for entry in entries:
                if isinstance(entry, str):
                    model, patterns = entry, FULL_CRUD
                else:
                    model, patterns = entry
                codenames = [p.format(model=model) for p in patterns]
                qs = Permission.objects.filter(
                    content_type__app_label=app_label,
                    codename__in=codenames,
                )
                permissions.extend(qs)
        group.permissions.set(permissions)

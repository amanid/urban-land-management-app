/**
 * Matrice centrale des capacites — modele a CASCADE hierarchique.
 *
 * Hierarchie: super_admin ⊇ admin ⊇ {sales_agent, cashier} ⊇ viewer
 *
 * Chaque role herite des capacites des roles dont il descend.
 * CAPABILITY_BASE indique le role MINIMUM requis pour une capacite — tous
 * les roles superieurs l'obtiennent automatiquement. Aucun risque d'oubli.
 */
import { Role } from "@/store/auth";

export type Capability =
  // Catalogue
  | "view_lots"
  | "manage_lots"
  | "delete_lot"
  | "import_lots"
  // Clients
  | "view_clients"
  | "manage_clients"
  | "upload_client_document"
  | "delete_client_document"
  // Acquisitions
  | "view_acquisitions"
  | "manage_acquisitions"
  // Ventes
  | "view_sales"
  | "create_sale"
  | "edit_sale"
  | "cancel_sale"
  | "renegotiate_sale"
  // Versements
  | "view_payments"
  | "record_payment"
  | "settle_sale_in_full"
  | "void_payment"
  // Documents PDF
  | "print_receipt"
  | "print_contract"
  | "print_statement"
  // Attachements de vente
  | "upload_sale_document"
  | "delete_sale_document"
  // Tableaux de bord
  | "view_dashboard_agent"
  | "view_dashboard_admin"
  | "view_advanced_analytics"
  | "view_user_performance"
  | "impersonate_perspective"
  // Administration
  | "view_users"
  | "manage_users"
  | "promote_to_super_admin"
  | "lock_user"
  | "view_audit_log"
  | "view_integrity_check"
  | "manage_company_settings"
  | "wipe_test_data"
  // Exports
  | "export_csv"
  | "export_pdf"
  | "bulk_actions";

/** Hiérarchie d'héritage entre les rôles. */
const ROLE_INHERITS: Record<Role, Role[]> = {
  viewer: [],
  cashier: ["viewer"],
  sales_agent: ["viewer"],
  admin: ["sales_agent", "cashier"],
  super_admin: ["admin"],
};

/** Capacité → rôle MINIMUM requis. Les rôles supérieurs l'obtiennent. */
const CAPABILITY_BASE: Record<Capability, Role> = {
  // Catalogue
  view_lots: "viewer",
  manage_lots: "sales_agent",
  delete_lot: "admin",
  import_lots: "admin",
  // Clients
  view_clients: "viewer",
  manage_clients: "sales_agent",
  upload_client_document: "sales_agent",
  delete_client_document: "admin",
  // Acquisitions
  view_acquisitions: "sales_agent",
  manage_acquisitions: "admin",
  // Ventes
  view_sales: "viewer",
  create_sale: "sales_agent",
  edit_sale: "sales_agent",
  cancel_sale: "admin",
  renegotiate_sale: "admin",
  // Versements
  view_payments: "viewer",
  record_payment: "cashier",
  settle_sale_in_full: "cashier",
  void_payment: "admin",
  // Documents PDF (tous peuvent imprimer)
  print_receipt: "viewer",
  print_contract: "viewer",
  print_statement: "viewer",
  // Attachements vente
  upload_sale_document: "sales_agent",
  delete_sale_document: "admin",
  // Tableaux de bord
  view_dashboard_agent: "cashier",
  view_dashboard_admin: "admin",
  view_advanced_analytics: "admin",
  view_user_performance: "admin",
  impersonate_perspective: "admin",
  // Administration
  view_users: "admin",
  manage_users: "admin",
  promote_to_super_admin: "super_admin",
  lock_user: "admin",
  view_audit_log: "admin",
  view_integrity_check: "admin",
  manage_company_settings: "super_admin",
  wipe_test_data: "super_admin",
  // Exports
  export_csv: "cashier",
  export_pdf: "viewer",
  bulk_actions: "admin",
};

/** Ensemble des rôles inclus (en remontant la hiérarchie). */
function rolesIncludedIn(role: Role): Set<Role> {
  const visited = new Set<Role>([role]);
  const queue: Role[] = [...ROLE_INHERITS[role]];
  while (queue.length) {
    const r = queue.shift()!;
    if (visited.has(r)) continue;
    visited.add(r);
    queue.push(...(ROLE_INHERITS[r] || []));
  }
  return visited;
}

/** Test pur : `role` peut-il `capability` ? */
export function roleCan(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  const required = CAPABILITY_BASE[capability];
  if (!required) return false;
  return rolesIncludedIn(role).has(required);
}

export const ROLE_FR: Record<Role, string> = {
  super_admin: "Super administrateur",
  admin: "Administrateur",
  sales_agent: "Agent commercial",
  cashier: "Caissier",
  viewer: "Lecteur",
};

export const ROLE_BADGE: Record<Role, string> = {
  super_admin: "pill-danger",
  admin: "pill-info",
  sales_agent: "pill-success",
  cashier: "pill-warning",
  viewer: "pill-muted",
};

/** Liste explicite des rôles inclus dans un rôle donné. */
export function effectiveRoles(role: Role): Role[] {
  return Array.from(rolesIncludedIn(role));
}

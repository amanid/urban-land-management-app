export function formatMoney(value: number | string | undefined | null, currency = "XOF") {
  const n = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal", maximumFractionDigits: 0,
  }).format(n) + " " + currency;
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(d);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function pct(value: number | string | undefined, total: number) {
  if (!total) return "0%";
  return ((Number(value || 0) / total) * 100).toFixed(1) + "%";
}

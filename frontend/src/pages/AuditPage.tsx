import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import toast from "react-hot-toast";
import clsx from "clsx";

const ENTITY_FR: Record<string, string> = {
  Lot: "Lot", Client: "Client", ClientDocument: "Document client",
  Sale: "Vente", Payment: "Versement", Acquisition: "Acquisition",
};

export default function AuditPage() {
  const [filter, setFilter] = useState({ entity: "", action: "" });

  const { data: integrity, isFetching, refetch } = useQuery({
    queryKey: ["integrity"],
    queryFn: async () => (await api.get("/integrity/")).data,
  });
  const { data: log } = useQuery({
    queryKey: ["audit", filter],
    queryFn: async () => (await api.get("/history/", { params: filter })).data,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-display font-bold">Audit & intégrité</h1>

      <div className={clsx("card-glow p-5 border-l-4",
        integrity?.status === "ok" ? "border-emerald-500" : "border-rose-500")}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={clsx("w-12 h-12 rounded-xl grid place-items-center",
            integrity?.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
            {integrity?.status === "ok" ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold">
              {integrity?.status === "ok" ? "Chaîne d'intégrité intacte" : "ALERTE : altération détectée"}
            </div>
            <div className="text-sm text-slate-500">
              {integrity?.checked ?? 0} versements vérifiés · {integrity?.tampered_count ?? 0} anomalie(s)
            </div>
          </div>
          <button onClick={() => refetch()} className="btn-secondary"><RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Revérifier</button>
        </div>
      </div>

      {integrity?.tampered?.length > 0 && (
        <div className="card p-5 border border-rose-200 bg-rose-50/40">
          <h3 className="font-semibold text-rose-700 mb-2">Versements altérés</h3>
          <table className="table-clean">
            <thead><tr><th>Reçu</th><th>Vente</th><th>Empreinte stockée</th><th>Empreinte attendue</th></tr></thead>
            <tbody>
              {integrity.tampered.map((t: any) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.receipt_number}</td>
                  <td className="font-mono text-xs">{t.sale_id}</td>
                  <td className="font-mono text-[10px]">{t.stored?.slice(0, 24)}…</td>
                  <td className="font-mono text-[10px]">{t.expected?.slice(0, 24)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display font-semibold">Journal d'audit</h3>
          <div className="flex gap-2">
            <select className="input !py-1.5 text-xs" value={filter.entity}
                    onChange={(e) => setFilter({ ...filter, entity: e.target.value })}>
              <option value="">Toutes entités</option>
              <option value="Lot">Lots</option>
              <option value="Client">Clients</option>
              <option value="ClientDocument">Documents clients</option>
              <option value="Sale">Ventes</option>
              <option value="Payment">Versements</option>
              <option value="Acquisition">Acquisitions</option>
            </select>
            <select className="input !py-1.5 text-xs" value={filter.action}
                    onChange={(e) => setFilter({ ...filter, action: e.target.value })}>
              <option value="">Toutes actions</option>
              <option value="create">Création</option>
              <option value="update">Modification</option>
              <option value="delete">Suppression</option>
              <option value="payment">Versement</option>
              <option value="status_change">Changement de statut</option>
              <option value="print">Impression</option>
            </select>
          </div>
        </div>
        <table className="table-clean">
          <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Entité</th><th>Description</th><th>IP</th></tr></thead>
          <tbody>
            {(log?.items || []).map((l: any) => (
              <tr key={l.id}>
                <td className="text-xs">{formatDateTime(l.ts)}</td>
                <td className="text-xs">{l.user || "—"}</td>
                <td><span className="pill-info">{l.action_label}</span></td>
                <td className="text-xs"><span className="font-semibold">{ENTITY_FR[l.entity] || l.entity}</span> <span className="font-mono text-slate-400">#{l.entity_id}</span></td>
                <td className="text-xs">{l.description}</td>
                <td className="text-xs text-slate-400">{l.ip || "—"}</td>
              </tr>
            ))}
            {(!log?.items || log.items.length === 0) && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-6">Aucun événement.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

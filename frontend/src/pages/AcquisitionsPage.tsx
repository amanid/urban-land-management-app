import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import { formatMoney, formatDate } from "@/lib/format";
import Can from "@/components/Can";
import clsx from "clsx";

const STATUS_CLS: Record<string, string> = {
  draft: "pill-muted", confirmed: "pill-success", cancelled: "pill-danger",
};

export default function AcquisitionsPage() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["acquisitions"],
    queryFn: async () => (await api.get("/transactions/acquisitions/")).data,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Briefcase size={22} /> Achats fonciers <span className="text-sm font-normal text-slate-500">(Acquisitions)</span>
          </h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} achats enregistrés — alimentent votre catalogue</p>
        </div>
        <Can capability="manage_acquisitions">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Nouvel achat foncier
          </button>
        </Can>
      </div>

      <div className="card p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center shrink-0">
            <Briefcase size={18} />
          </div>
          <div className="flex-1 text-sm">
            <div className="font-display font-bold text-amber-900 mb-1">À quoi servent les Achats fonciers ?</div>
            <p className="text-slate-700 leading-relaxed">
              Les <strong>Acquisitions</strong> sont l'<u>opposé des Ventes</u> : il s'agit de l'<strong>achat</strong>
              d'un terrain par votre société auprès d'un vendeur externe pour alimenter votre stock.
            </p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-white/70 border border-amber-100 p-2">
                🛒 <strong>Achat foncier</strong> : sortie de cash (votre société paie un propriétaire)
              </div>
              <div className="rounded-lg bg-white/70 border border-amber-100 p-2">
                💼 <strong>Vente</strong> : entrée de cash (votre client vous paie)
              </div>
              <div className="rounded-lg bg-white/70 border border-amber-100 p-2">
                📈 <strong>Marge brute</strong> = Ventes − Achats fonciers
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 Avant d'enregistrer un achat, créez d'abord le lot dans le{" "}
              <a href="/lots" className="text-brand-700 underline">Catalogue</a> avec son prix d'achat (coût).
            </p>
          </div>
        </div>
      </div>

      {isLoading ? <div className="h-64 skeleton rounded-2xl" /> : (
        <div className="card overflow-hidden">
          <table className="table-clean">
            <thead><tr>
              <th>Référence</th><th>Date</th><th>Lot</th><th>Vendeur</th>
              <th className="text-right">Montant</th><th>Statut</th>
            </tr></thead>
            <tbody>
              {(data?.results || []).map((a: any) => (
                <tr key={a.id}>
                  <td className="font-mono text-xs font-semibold">{a.reference}</td>
                  <td>{formatDate(a.acquired_on)}</td>
                  <td className="font-mono text-xs">{a.lot_reference}</td>
                  <td>{a.seller_display}</td>
                  <td className="text-right font-semibold">{formatMoney(a.amount, a.currency)}</td>
                  <td><span className={clsx(STATUS_CLS[a.status])}>{a.status_label}</span></td>
                </tr>
              ))}
              {(!data?.results || data.results.length === 0) && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-8">
                  <Briefcase size={28} className="mx-auto mb-2" />
                  Aucune acquisition enregistrée.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <AcquisitionForm onClose={() => setShowForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["acquisitions"] }); setShowForm(false); }} />}
    </div>
  );
}

function AcquisitionForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ lot: "", seller_name: "", amount: "" });
  const { data: lots } = useQuery({
    queryKey: ["lots", "all-for-acq"],
    queryFn: async () => (await api.get("/lots/", { params: { page_size: 200 } })).data,
  });
  const m = useMutation({
    mutationFn: async () => (await api.post("/transactions/acquisitions/", form)).data,
    onSuccess: () => { toast.success("Acquisition enregistrée."); onSaved(); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card-glow w-full max-w-lg p-6">
        <h3 className="font-display font-bold text-xl">Nouvelle acquisition</h3>
        <p className="text-sm text-slate-500 mb-4">Enregistrez un terrain acquis pour alimenter le stock.</p>
        <div className="space-y-3">
          <div>
            <label className="label">Lot concerné</label>
            <select className="input" value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })}>
              <option value="">—</option>
              {(lots?.results || []).map((l: any) => <option key={l.id} value={l.id}>{l.reference} — {l.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vendeur (nom libre)</label>
            <input className="input" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} placeholder="Nom du vendeur ou propriétaire d'origine" />
          </div>
          <div>
            <label className="label">Montant d'acquisition</label>
            <input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Date d'acquisition</label>
            <input className="input" type="date" value={form.acquired_on || ""} onChange={(e) => setForm({ ...form, acquired_on: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={m.isPending} className="btn-primary">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

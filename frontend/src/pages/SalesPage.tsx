import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Plus, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate, formatMoney } from "@/lib/format";
import Can from "@/components/Can";
import ExportButton from "@/components/ExportButton";
import clsx from "clsx";

const STATUS_CLS: Record<string, string> = {
  draft: "pill-muted", reserved: "pill-warning", in_progress: "pill-info",
  completed: "pill-success", cancelled: "pill-muted", litigation: "pill-danger",
};

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sales", { search, status }],
    queryFn: async () => (await api.get("/transactions/sales/", { params: { search, status } })).data,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Ventes</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} dossiers</p>
        </div>
        <div className="flex gap-2">
          <ExportButton path="/export/sales/" filename="urban-land-ventes" />
          <Can capability="create_sale">
            <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Nouvelle vente</button>
          </Can>
        </div>
      </div>

      <div className="card p-3 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Rechercher (référence, client, lot…)"
               value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="draft">Brouillon</option>
          <option value="reserved">Réservé</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Soldée</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>

      {isLoading ? <div className="h-64 skeleton rounded-2xl" /> : (
        <div className="card overflow-hidden">
          <table className="table-clean">
            <thead><tr>
              <th>Référence</th><th>Date</th><th>Lot</th><th>Client</th>
              <th>Mode</th><th>Statut</th>
              <th className="text-right">Prix</th><th className="text-right">Versé</th><th className="text-right">Reste</th>
            </tr></thead>
            <tbody>
              {(data?.results || []).map((s: any) => (
                <tr key={s.id}>
                  <td><Link className="font-mono text-xs text-brand-700 font-semibold" to={`/sales/${s.id}`}>{s.reference}</Link></td>
                  <td>{formatDate(s.sold_on)}</td>
                  <td className="font-mono text-xs">{s.lot_detail?.reference}</td>
                  <td>{s.client_detail?.display_name}</td>
                  <td>{s.payment_mode_label}</td>
                  <td><span className={clsx(STATUS_CLS[s.status])}>{s.status_label}</span></td>
                  <td className="text-right font-semibold">{formatMoney(s.price, s.currency)}</td>
                  <td className="text-right text-emerald-700">{formatMoney(s.total_paid, s.currency)}</td>
                  <td className="text-right text-rose-700 font-semibold">{formatMoney(s.balance_due, s.currency)}</td>
                </tr>
              ))}
              {(!data?.results || data.results.length === 0) && (
                <tr><td colSpan={9} className="text-center text-slate-400 py-6">Aucune vente.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <SaleForm onClose={() => setShowForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["sales"] }); setShowForm(false); }} />}
    </div>
  );
}

function SaleForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    lot: "", client: "", price: "", payment_mode: "cash",
    down_payment: 0, installment_count: 1, installment_frequency_days: 30,
  });
  // Filtres pour la liste des lots disponibles
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [village, setVillage] = useState("");
  const [subdivision, setSubdivision] = useState("");
  // Recherche client
  const [clientSearch, setClientSearch] = useState("");

  const { data: lots } = useQuery({
    queryKey: ["lots", "available", { region, city, village, subdivision }],
    queryFn: async () => (await api.get("/lots/", {
      params: { status: "available", region, village, subdivision,
                search: city, page_size: 200 },
    })).data,
  });
  const { data: clients } = useQuery({
    queryKey: ["clients", "search", clientSearch],
    queryFn: async () => (await api.get("/clients/", {
      params: { search: clientSearch, page_size: 50 },
    })).data,
  });

  // Auto-rempli le prix avec le prix affiché du lot sélectionné
  const selectedLot = (lots?.results || []).find((l: any) => String(l.id) === String(form.lot));
  const setLot = (id: string) => {
    const lot = (lots?.results || []).find((l: any) => String(l.id) === id);
    setForm({ ...form, lot: id, price: lot ? lot.asking_price : "" });
  };

  const m = useMutation({
    mutationFn: async () => (await api.post("/transactions/sales/", form)).data,
    onSuccess: () => { toast.success("Vente créée (brouillon)."); onSaved(); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });

  const availableCount = lots?.count ?? (lots?.results?.length ?? 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="card-glow w-full max-w-3xl p-6 my-4">
        <h3 className="font-display font-bold text-xl flex items-center gap-2">
          <Receipt size={20} /> Nouvelle vente
        </h3>
        <p className="text-sm text-slate-500 mb-4">Filtrez les lots disponibles, sélectionnez le client et le bien, puis créez le dossier.</p>

        {/* FILTRES SUR LES LOTS DISPONIBLES ------------------------- */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Localisation du bien</div>
            <div className="pill-info"><strong>{availableCount}</strong> lot{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input className="input !py-1.5 text-sm" placeholder="Région"
                   value={region} onChange={(e) => setRegion(e.target.value)} />
            <input className="input !py-1.5 text-sm" placeholder="Ville"
                   value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="input !py-1.5 text-sm" placeholder="Village"
                   value={village} onChange={(e) => setVillage(e.target.value)} />
            <input className="input !py-1.5 text-sm" placeholder="Lotissement"
                   value={subdivision} onChange={(e) => setSubdivision(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Lot (Ilot · N° · Référence · Désignation)</label>
            <select className="input" value={form.lot} onChange={(e) => setLot(e.target.value)}>
              <option value="">— Sélectionner un lot disponible —</option>
              {(lots?.results || []).map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.ilot && `Ilot ${l.ilot} · `}{l.lot_number && `Lot ${l.lot_number} · `}
                  {l.reference} — {l.title}{l.subdivision_name && ` (${l.subdivision_name})`}
                </option>
              ))}
            </select>
            {selectedLot && (
              <div className="mt-1.5 text-[11px] text-slate-500">
                📍 {[selectedLot.region, selectedLot.city_name, selectedLot.village, selectedLot.neighborhood_name].filter(Boolean).join(" · ")}
                · {selectedLot.surface_m2} m² · {selectedLot.asking_price ? `Prix affiché : ${selectedLot.asking_price}` : ""}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="label">Client</label>
            <input className="input mb-2" placeholder="🔍 Rechercher un client par nom, email, téléphone, code…"
                   value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
            <select className="input" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}>
              <option value="">— Sélectionner un client existant —</option>
              {(clients?.results || []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.display_name} {c.code && `· ${c.code}`} {c.phone && `· ${c.phone}`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Le client doit déjà être enregistré (page <a href="/clients" className="text-brand-700 underline">Clients</a>).
              Un même client peut acheter plusieurs biens — il sera réutilisé tel quel.
            </p>
          </div>

          <div>
            <label className="label">Prix de vente</label>
            <input className="input" type="number" value={form.price}
                   onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="label">Mode de paiement</label>
            <select className="input" value={form.payment_mode}
                    onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
              <option value="cash">Comptant</option>
              <option value="installment">Échelonné</option>
            </select>
          </div>
          {form.payment_mode === "installment" && (
            <>
              <div><label className="label">Apport initial</label>
                <input className="input" type="number" value={form.down_payment} onChange={(e) => setForm({ ...form, down_payment: e.target.value })} /></div>
              <div><label className="label">Nb échéances</label>
                <input className="input" type="number" value={form.installment_count} onChange={(e) => setForm({ ...form, installment_count: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="label">Fréquence (jours)</label>
                <input className="input" type="number" value={form.installment_frequency_days} onChange={(e) => setForm({ ...form, installment_frequency_days: e.target.value })} /></div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={!form.lot || !form.client || !form.price || m.isPending} className="btn-primary">
            {m.isPending ? "Création…" : "Créer la vente"}
          </button>
        </div>
      </div>
    </div>
  );
}

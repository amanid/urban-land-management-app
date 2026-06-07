import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus, MapPinned, Filter, Building2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import toast from "react-hot-toast";
import { formatMoney } from "@/lib/format";
import Can from "@/components/Can";
import ExportButton from "@/components/ExportButton";
import clsx from "clsx";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  available: { label: "Disponible", cls: "pill-success" },
  reserved: { label: "Réservé", cls: "pill-warning" },
  sold: { label: "Vendu", cls: "pill-info" },
  litigation: { label: "Litige", cls: "pill-danger" },
  off_market: { label: "Retiré", cls: "pill-muted" },
};

export default function LotsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["lots", { search, status }],
    queryFn: async () => (await api.get("/lots/", { params: { search, status, page_size: 100 } })).data,
  });
  const { data: stats } = useQuery({
    queryKey: ["lots-stats"],
    queryFn: async () => (await api.get("/lots/stats/")).data,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Catalogue des lots</h1>
          <p className="text-sm text-slate-500">Vue d'ensemble du patrimoine foncier</p>
        </div>
        <div className="flex gap-2">
          <ExportButton path="/export/lots/" filename="urban-land-lots" />
          <Can capability="manage_lots">
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} /> Nouveau lot
            </button>
          </Can>
        </div>
      </div>

      {/* Compteurs ----------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CounterCard label="Total" value={stats?.total ?? 0} tone="brand" />
        <CounterCard label="Disponibles" value={stats?.available ?? 0} tone="emerald" />
        <CounterCard label="Réservés" value={stats?.reserved ?? 0} tone="amber" />
        <CounterCard label="Vendus" value={stats?.sold ?? 0} tone="info" />
      </div>

      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <input
          className="input max-w-xs"
          placeholder="Rechercher (référence, ville, ilot, lotissement…)"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="ml-auto flex gap-1 p-1 rounded-xl bg-slate-100">
          <button onClick={() => setView("cards")}
                  className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5",
                    view === "cards" ? "bg-white shadow-sm text-brand-700" : "text-slate-500")}>
            <LayoutGrid size={14} /> Cartes
          </button>
          <button onClick={() => setView("table")}
                  className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5",
                    view === "table" ? "bg-white shadow-sm text-brand-700" : "text-slate-500")}>
            <TableIcon size={14} /> Tableau
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 skeleton rounded-2xl" />)}
        </div>
      ) : view === "table" ? (
        <div className="card overflow-hidden">
          <table className="table-clean">
            <thead><tr>
              <th>Référence</th>
              <th>Ilot · Lot</th>
              <th>Désignation</th>
              <th>Lotissement</th>
              <th>Région</th>
              <th>Ville / Village</th>
              <th className="text-right">Surface</th>
              <th className="text-right">Prix</th>
              <th>Statut</th>
              <th>Enregistré le</th>
            </tr></thead>
            <tbody>
              {(data?.results || []).map((lot: any) => (
                <tr key={lot.id} className="hover:bg-brand-50/30">
                  <td><Link to={`/lots/${lot.id}`} className="font-mono text-xs font-semibold text-brand-700">{lot.reference}</Link></td>
                  <td className="text-xs font-mono">
                    {lot.ilot && <span className="pill-info">Ilot {lot.ilot}</span>}{" "}
                    {lot.lot_number && <span className="pill-muted">Lot {lot.lot_number}</span>}
                    {!lot.ilot && !lot.lot_number && <span className="text-slate-400">—</span>}
                  </td>
                  <td className="font-medium">{lot.title}</td>
                  <td className="text-xs">{lot.subdivision_name || "—"}</td>
                  <td className="text-xs">{lot.region || "—"}</td>
                  <td className="text-xs">
                    <div>{lot.city_name}</div>
                    {lot.village && <div className="text-slate-400">{lot.village}</div>}
                  </td>
                  <td className="text-right">{lot.surface_m2} m²</td>
                  <td className="text-right font-semibold text-brand-700">{formatMoney(lot.asking_price, lot.currency)}</td>
                  <td><span className={STATUS_LABEL[lot.status]?.cls}>{STATUS_LABEL[lot.status]?.label || lot.status}</span></td>
                  <td className="text-xs text-slate-500">{formatDate(lot.created_at)}</td>
                </tr>
              ))}
              {(!data?.results || data.results.length === 0) && (
                <tr><td colSpan={10} className="text-center text-slate-400 py-8">Aucun lot trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.results || []).map((lot: any) => (
            <Link key={lot.id} to={`/lots/${lot.id}`} className="card-glow overflow-hidden group hover:shadow-glow transition">
              <div className="aspect-[16/10] bg-gradient-to-br from-brand-100 to-accent-400/20 relative">
                {lot.primary_photo ? (
                  <img src={lot.primary_photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-brand-300">
                    <Building2 size={48} />
                  </div>
                )}
                <span className={clsx("absolute top-3 left-3", STATUS_LABEL[lot.status]?.cls)}>
                  {STATUS_LABEL[lot.status]?.label || lot.status}
                </span>
              </div>
              <div className="p-4">
                <div className="text-xs font-mono text-slate-400">{lot.reference}</div>
                <div className="font-semibold text-slate-900 mt-1 truncate">{lot.title}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPinned size={12} /> {lot.city_name}{lot.neighborhood_name && ` — ${lot.neighborhood_name}`}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="text-slate-500">{lot.surface_m2} m²</div>
                  <div className="font-bold text-brand-700">{formatMoney(lot.asking_price, lot.currency)}</div>
                </div>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {lot.has_water && <span className="pill-muted text-[10px]">Eau</span>}
                  {lot.has_electricity && <span className="pill-muted text-[10px]">Électricité</span>}
                  {lot.has_road_access && <span className="pill-muted text-[10px]">Voirie</span>}
                  {lot.has_title_deed && <span className="pill-info text-[10px]">Titre foncier</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && <LotForm onClose={() => setShowForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["lots"] }); setShowForm(false); }} />}
    </div>
  );
}

function LotForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    title: "", surface_m2: "", asking_price: "", lot_type: "residential",
    ilot: "", lot_number: "", subdivision_name: "", region: "", village: "",
    has_water: false, has_electricity: false, has_road_access: false,
  });
  const [cityInput, setCityInput] = useState("");
  const [neighborhoodInput, setNeighborhoodInput] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docKind, setDocKind] = useState("title_deed");
  const { data: cities } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => (await api.get("/lots/cities/")).data,
  });
  const m = useMutation({
    mutationFn: async () => {
      // 1) Create lot — backend will create the city if it doesn't exist
      const payload: any = { ...form };
      if (cityInput.trim()) payload.city_text = cityInput.trim();
      if (neighborhoodInput.trim()) payload.neighborhood_text = neighborhoodInput.trim();
      const lot = (await api.post("/lots/", payload)).data;
      // 2) Mandatory: upload at least one supporting document
      if (docFile) {
        const fd = new FormData();
        fd.append("file", docFile);
        fd.append("kind", docKind);
        fd.append("label", docFile.name);
        await api.post(`/lots/${lot.id}/upload-document/`, fd,
          { headers: { "Content-Type": "multipart/form-data" } });
      }
      return lot;
    },
    onSuccess: () => { toast.success("Lot créé avec son document justificatif."); onSaved(); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data) || "Erreur"),
  });

  const canSubmit = !!form.title && !!cityInput.trim() && !!form.surface_m2 && !!form.asking_price && !!docFile;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card-glow w-full max-w-2xl p-6">
        <h3 className="font-display font-bold text-xl">Nouveau lot</h3>
        <p className="text-sm text-slate-500 mb-4">La référence est générée automatiquement.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Désignation</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Région</label>
            <input className="input" placeholder="ex: Lagunes, Vallée du Bandama, Savanes…"
                   value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <label className="label">Ville</label>
            <input className="input" list="cities-list"
                   placeholder="Tapez ou choisissez (ex: Abidjan, Bouaké…)"
                   value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
            <datalist id="cities-list">
              {(cities?.results || cities || []).map((c: any) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Village</label>
            <input className="input" placeholder="Nom du village (si applicable)"
                   value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
          </div>
          <div>
            <label className="label">Quartier (optionnel)</label>
            <input className="input" placeholder="ex: Riviera, II-Plateaux…"
                   value={neighborhoodInput} onChange={(e) => setNeighborhoodInput(e.target.value)} />
          </div>
          <div className="md:col-span-2 grid grid-cols-3 gap-2">
            <div>
              <label className="label">Nom du lotissement</label>
              <input className="input" placeholder="ex: Cité des Palmiers"
                     value={form.subdivision_name} onChange={(e) => setForm({ ...form, subdivision_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Ilot</label>
              <input className="input" placeholder="ex: A, 12, IL-04"
                     value={form.ilot} onChange={(e) => setForm({ ...form, ilot: e.target.value })} />
            </div>
            <div>
              <label className="label">N° de lot</label>
              <input className="input" placeholder="ex: 5, 12B"
                     value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.lot_type} onChange={(e) => setForm({ ...form, lot_type: e.target.value })}>
              <option value="residential">Résidentiel</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industriel</option>
              <option value="agricultural">Agricole</option>
              <option value="mixed">Mixte</option>
            </select>
          </div>
          <div>
            <label className="label">Surface (m²)</label>
            <input className="input" type="number" step="0.01" value={form.surface_m2} onChange={(e) => setForm({ ...form, surface_m2: e.target.value })} />
          </div>
          <div>
            <label className="label">Prix affiché</label>
            <input className="input" type="number" value={form.asking_price} onChange={(e) => setForm({ ...form, asking_price: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm">
            {[["has_water", "Eau"], ["has_electricity", "Électricité"], ["has_road_access", "Voirie"], ["has_title_deed", "Titre foncier"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={!!form[k as string]} onChange={(e) => setForm({ ...form, [k as string]: e.target.checked })} />
                {l}
              </label>
            ))}
          </div>
        </div>

        {/* Document justificatif OBLIGATOIRE */}
        <div className="mt-6 p-4 rounded-2xl bg-brand-50/60 border border-brand-200">
          <div className="flex items-center justify-between mb-2">
            <div className="font-display font-semibold text-brand-800 flex items-center gap-2">
              📎 Document justificatif <span className="text-rose-600">*</span>
            </div>
            <select className="input !py-1.5 !px-2 text-xs max-w-[220px]" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
              <option value="title_deed">Titre foncier</option>
              <option value="cadastral_plan">Plan cadastral</option>
              <option value="purchase_deed">Acte d'achat</option>
              <option value="land_survey">Levé topographique</option>
              <option value="other">Autre justificatif</option>
            </select>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            Joindre au moins un document officiel attestant la propriété ou l'identification cadastrale du lot.
          </p>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-dashed border-brand-300 cursor-pointer hover:bg-brand-50/50">
            <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                   onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
            <div className="flex-1 text-sm">
              {docFile ? <><strong>{docFile.name}</strong> · {(docFile.size / 1024).toFixed(1)} Ko</> : "Cliquez pour sélectionner un fichier (PDF, image, Word…)"}
            </div>
            <span className="btn-secondary !py-1 text-xs">Parcourir</span>
          </label>
          {!docFile && <p className="text-xs text-rose-600 mt-2">Un document est requis pour enregistrer le lot.</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={!canSubmit || m.isPending} className="btn-primary">
            {m.isPending ? "Création…" : "Créer le lot"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CounterCard({ label, value, tone = "brand" }: { label: string; value: number | string; tone?: "brand"|"emerald"|"amber"|"info" }) {
  const toneCls = {
    brand: "from-brand-50 to-blue-100/60 text-brand-700",
    emerald: "from-emerald-50 to-teal-100/60 text-emerald-700",
    amber: "from-amber-50 to-orange-100/60 text-amber-700",
    info: "from-blue-50 to-violet-100/60 text-blue-700",
  }[tone];
  return (
    <div className={clsx("card p-4 bg-gradient-to-br", toneCls)}>
      <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">{label}</div>
      <div className="text-3xl font-display font-extrabold mt-1">{value}</div>
    </div>
  );
}

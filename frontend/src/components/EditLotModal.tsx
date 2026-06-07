import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Save, X, Loader2, ShieldAlert } from "lucide-react";

interface Props {
  lot: any;
  onClose: () => void;
}

const LOT_STATUSES = [
  { value: "available", label: "Disponible" },
  { value: "reserved", label: "Réservé" },
  { value: "sold", label: "Vendu" },
  { value: "litigation", label: "En litige" },
  { value: "off_market", label: "Retiré du marché" },
];

const LOT_TYPES = [
  { value: "residential", label: "Résidentiel" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industriel" },
  { value: "agricultural", label: "Agricole" },
  { value: "mixed", label: "Mixte" },
];

export default function EditLotModal({ lot, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: lot.title || "",
    description: lot.description || "",
    lot_type: lot.lot_type || "residential",
    cadastral_ref: lot.cadastral_ref || "",
    surface_m2: lot.surface_m2 || "",
    asking_price: lot.asking_price || "",
    purchase_price: lot.purchase_price || "",
    status: lot.status || "available",
    latitude: lot.latitude || "",
    longitude: lot.longitude || "",
    has_water: !!lot.has_water,
    has_electricity: !!lot.has_electricity,
    has_road_access: !!lot.has_road_access,
    has_sewage: !!lot.has_sewage,
    has_internet: !!lot.has_internet,
    has_title_deed: !!lot.has_title_deed,
    notes: lot.notes || "",
  });
  const [cityInput, setCityInput] = useState(lot.city_name || "");
  const [neighborhoodInput, setNeighborhoodInput] = useState(lot.neighborhood_name || "");
  const [reason, setReason] = useState("");
  const reasonOk = reason.trim().length >= 5;

  const { data: cities } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => (await api.get("/lots/cities/")).data,
  });

  const m = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (cityInput.trim() && cityInput.trim() !== lot.city_name) {
        payload.city_text = cityInput.trim();
      }
      if (neighborhoodInput.trim() && neighborhoodInput.trim() !== lot.neighborhood_name) {
        payload.neighborhood_text = neighborhoodInput.trim();
      }
      if (payload.latitude === "") payload.latitude = null;
      if (payload.longitude === "") payload.longitude = null;
      return (await api.patch(`/lots/${lot.id}/`, payload, {
        headers: { "X-Change-Reason": reason.trim() },
      })).data;
    },
    onSuccess: () => {
      toast.success("Lot mis à jour.");
      qc.invalidateQueries({ queryKey: ["lot", String(lot.id)] });
      qc.invalidateQueries({ queryKey: ["lots"] });
      onClose();
    },
    onError: (e: any) => {
      const data = e.response?.data;
      const msg = data?.change_reason || data?.detail
        || (typeof data === "object" ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(" · ") : "")
        || "Échec de la mise à jour.";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="card-glow w-full max-w-3xl p-6 my-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display font-bold text-xl">Modifier le lot {lot.reference}</h3>
            <p className="text-sm text-slate-500">Toute modification est tracée dans le journal d'audit.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="label">Désignation</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Ville ou village</label>
            <input className="input" list="cities-edit-list"
                   placeholder="Tapez ou choisissez"
                   value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
            <datalist id="cities-edit-list">
              {(cities?.results || cities || []).map((c: any) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Quartier (optionnel)</label>
            <input className="input" placeholder="ex: Riviera, II-Plateaux…"
                   value={neighborhoodInput} onChange={(e) => setNeighborhoodInput(e.target.value)} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.lot_type} onChange={(e) => setForm({ ...form, lot_type: e.target.value })}>
              {LOT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="label">Référence cadastrale</label><input className="input" value={form.cadastral_ref} onChange={(e) => setForm({ ...form, cadastral_ref: e.target.value })} /></div>
          <div><label className="label">Statut</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {LOT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div><label className="label">Surface (m²)</label><input className="input" type="number" step="0.01" value={form.surface_m2} onChange={(e) => setForm({ ...form, surface_m2: e.target.value })} /></div>
          <div><label className="label">Prix de vente affiché</label><input className="input" type="number" value={form.asking_price} onChange={(e) => setForm({ ...form, asking_price: e.target.value })} /></div>
          <div><label className="label">Prix d'achat (coût)</label><input className="input" type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></div>
          <div><label className="label">Latitude</label><input className="input" type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
          <div><label className="label">Longitude</label><input className="input" type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>

          <div className="md:col-span-2">
            <label className="label">Viabilisation</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {[
                ["has_water", "Eau"], ["has_electricity", "Électricité"],
                ["has_road_access", "Voirie"], ["has_sewage", "Assainissement"],
                ["has_internet", "Internet"], ["has_title_deed", "Titre foncier"],
              ].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={!!(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="label">Notes internes</label>
            <textarea className="input min-h-[50px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        {/* Mandatory reason */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold text-sm">
            <ShieldAlert size={16} /> Motif de la modification (obligatoire)
          </div>
          <textarea
            className="input min-h-[70px]" autoFocus
            placeholder="Expliquez la raison de cette modification (ex: correction prix après évaluation, mise à jour adresse…)"
            value={reason} onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Cette justification (5 caractères minimum) est conservée dans le journal d'audit.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={!reasonOk || m.isPending} className="btn-primary">
            {m.isPending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
            Enregistrer la modification
          </button>
        </div>
      </div>
    </div>
  );
}

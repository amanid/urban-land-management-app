import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Save, X, Loader2, ShieldAlert } from "lucide-react";

interface Props {
  client: any;
  onClose: () => void;
}

export default function EditClientModal({ client, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    kind: client.kind || "individual",
    first_name: client.first_name || "",
    last_name: client.last_name || "",
    company_name: client.company_name || "",
    company_rccm: client.company_rccm || "",
    contact_person: client.contact_person || "",
    email: client.email || "",
    phone: client.phone || "",
    phone_secondary: client.phone_secondary || "",
    address: client.address || "",
    city: client.city || "",
    country: client.country || "Côte d'Ivoire",
    id_kind: client.id_kind || "cni",
    id_number: client.id_number || "",
    nationality: client.nationality || "Ivoirienne",
    profession: client.profession || "",
    birth_date: client.birth_date || "",
    birth_place: client.birth_place || "",
    notes: client.notes || "",
    is_active: client.is_active !== false,
  });
  const [reason, setReason] = useState("");
  const reasonOk = reason.trim().length >= 5;

  const m = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (payload.birth_date === "") payload.birth_date = null;
      return (await api.patch(`/clients/${client.id}/`, payload, {
        headers: { "X-Change-Reason": reason.trim() },
      })).data;
    },
    onSuccess: () => {
      toast.success("Fiche client mise à jour.");
      qc.invalidateQueries({ queryKey: ["client", String(client.id)] });
      qc.invalidateQueries({ queryKey: ["clients"] });
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
            <h3 className="font-display font-bold text-xl">Modifier le client {client.code}</h3>
            <p className="text-sm text-slate-500">Toute modification est tracée dans le journal d'audit.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="label">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, kind: "individual" })}
                className={form.kind === "individual" ? "btn-primary" : "btn-secondary"}>Particulier</button>
              <button type="button" onClick={() => setForm({ ...form, kind: "company" })}
                className={form.kind === "company" ? "btn-primary" : "btn-secondary"}>Entreprise</button>
            </div>
          </div>
          {form.kind === "individual" ? (
            <>
              <div><label className="label">Prénom</label><input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><label className="label">Nom</label><input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              <div><label className="label">Date de naissance</label><input className="input" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div><label className="label">Lieu de naissance</label><input className="input" value={form.birth_place} onChange={(e) => setForm({ ...form, birth_place: e.target.value })} /></div>
              <div><label className="label">Nationalité</label><input className="input" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
              <div><label className="label">Profession</label><input className="input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></div>
            </>
          ) : (
            <>
              <div className="md:col-span-2"><label className="label">Raison sociale</label><input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><label className="label">RCCM</label><input className="input" value={form.company_rccm} onChange={(e) => setForm({ ...form, company_rccm: e.target.value })} /></div>
              <div><label className="label">Contact principal</label><input className="input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            </>
          )}
          <div><label className="label">Adresse e-mail (optionnelle)</label><input className="input" type="email" placeholder="prenom.nom@exemple.ci" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Téléphone (optionnel)</label><input className="input" type="tel" placeholder="+225 07 00 00 00 00" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Téléphone secondaire (optionnel)</label><input className="input" type="tel" value={form.phone_secondary} onChange={(e) => setForm({ ...form, phone_secondary: e.target.value })} /></div>
          <div><label className="label">Type de pièce</label>
            <select className="input" value={form.id_kind} onChange={(e) => setForm({ ...form, id_kind: e.target.value })}>
              <option value="cni">CNI</option>
              <option value="passport">Passeport</option>
              <option value="driver_license">Permis de conduire</option>
              <option value="resident_card">Carte de séjour</option>
            </select>
          </div>
          <div><label className="label">N° de pièce</label><input className="input" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="label">Adresse</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Ville</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">Pays</label><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="label">Notes internes</label><textarea className="input min-h-[50px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Client actif
          </label>
        </div>

        <div className="mt-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold text-sm">
            <ShieldAlert size={16} /> Motif de la modification (obligatoire)
          </div>
          <textarea
            className="input min-h-[70px]" autoFocus
            placeholder="Expliquez la raison (ex: changement de domicile, mise à jour pièce d'identité…)"
            value={reason} onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-[11px] text-slate-500 mt-1.5">Conservée dans le journal d'audit (≥ 5 caractères).</p>
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

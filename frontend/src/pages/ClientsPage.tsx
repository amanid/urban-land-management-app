import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Plus, Mail, Phone, User as UserIcon, Building } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/format";
import Can from "@/components/Can";
import ExportButton from "@/components/ExportButton";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: async () => (await api.get("/clients/", { params: { search } })).data,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Clients</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} clients enregistrés</p>
        </div>
        <div className="flex gap-2">
          <ExportButton path="/export/clients/" filename="urban-land-clients" />
          <Can capability="manage_clients">
            <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Nouveau client</button>
          </Can>
        </div>
      </div>

      <div className="card p-3">
        <input className="input" placeholder="Rechercher (nom, code, téléphone, pièce d'identité…)"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="h-72 skeleton rounded-2xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="table-clean">
            <thead><tr>
              <th>Code</th><th>Nom / Raison sociale</th><th>Type</th>
              <th>Contact</th><th>Documents</th><th>Ventes</th><th>Enregistré le</th>
            </tr></thead>
            <tbody>
              {(data?.results || []).map((c: any) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.code}</td>
                  <td>
                    <Link to={`/clients/${c.id}`} className="font-semibold text-brand-700 hover:underline flex items-center gap-2">
                      {c.kind === "company" ? <Building size={14} /> : <UserIcon size={14} />}
                      {c.display_name}
                    </Link>
                  </td>
                  <td>{c.kind_label}</td>
                  <td className="text-xs">
                    {c.email && <div className="flex items-center gap-1 text-slate-600"><Mail size={11} /> {c.email}</div>}
                    {c.phone && <div className="flex items-center gap-1 text-slate-600"><Phone size={11} /> {c.phone}</div>}
                  </td>
                  <td><span className="pill-muted">{c.document_count}</span></td>
                  <td><span className="pill-info">{c.sale_count}</span></td>
                  <td className="text-xs text-slate-500">{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {(!data?.results || data.results.length === 0) && (
                <tr><td colSpan={7} className="text-center text-slate-400 py-6">Aucun client.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <ClientForm onClose={() => setShowForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["clients"] }); setShowForm(false); }} />}
    </div>
  );
}

function ClientForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    kind: "individual", first_name: "", last_name: "", company_name: "",
    email: "", phone: "", id_kind: "cni", id_number: "", address: "", city: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const m = useMutation({
    mutationFn: async () => {
      // 1) Create client
      const client = (await api.post("/clients/", form)).data;
      // 2) Mandatory: upload the ID document used at registration
      if (docFile) {
        const fd = new FormData();
        fd.append("file", docFile);
        fd.append("kind", form.id_kind);
        fd.append("label", `Pièce d'identité — ${form.id_kind.toUpperCase()}`);
        await api.post(`/clients/${client.id}/upload-document/`, fd,
          { headers: { "Content-Type": "multipart/form-data" } });
      }
      return client;
    },
    onSuccess: () => { toast.success("Client créé avec sa pièce d'identité."); onSaved(); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });

  const nameOk = form.kind === "individual"
    ? (form.first_name && form.last_name)
    : form.company_name;
  const canSubmit = !!nameOk && !!docFile;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card-glow w-full max-w-2xl p-6">
        <h3 className="font-display font-bold text-xl">Nouveau client</h3>
        <p className="text-sm text-slate-500 mb-4">Le code client est généré automatiquement.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </>
          ) : (
            <>
              <div className="md:col-span-2">
                <label className="label">Raison sociale <span className="text-rose-600">*</span></label>
                <input className="input" value={form.company_name}
                       onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Registre de commerce (RCCM) <span className="text-rose-600">*</span></label>
                <input className="input" placeholder="ex: CI-ABJ-2024-B-12345"
                       value={form.company_rccm || ""}
                       onChange={(e) => setForm({ ...form, company_rccm: e.target.value })} />
              </div>
              <div>
                <label className="label">Personne à contacter</label>
                <input className="input" placeholder="Nom du référent"
                       value={form.contact_person || ""}
                       onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="label">Adresse e-mail (optionnelle)</label>
            <input className="input" type="email" placeholder="prenom.nom@exemple.ci"
                   value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Téléphone (optionnel)</label>
            <input className="input" type="tel" placeholder="+225 07 00 00 00 00"
                   value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Téléphone secondaire (optionnel)</label>
            <input className="input" type="tel" placeholder="+225 05 00 00 00 00"
                   value={form.phone_secondary || ""} onChange={(e) => setForm({ ...form, phone_secondary: e.target.value })} />
          </div>
          <div>
            <label className="label">Type de pièce</label>
            <select className="input" value={form.id_kind} onChange={(e) => setForm({ ...form, id_kind: e.target.value })}>
              <option value="cni">CNI</option>
              <option value="passport">Passeport</option>
              <option value="driver_license">Permis</option>
              <option value="resident_card">Carte de séjour</option>
            </select>
          </div>
          <div><label className="label">N° de pièce</label><input className="input" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="label">Adresse</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Ville</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        </div>

        {/* Pièce d'identité OBLIGATOIRE */}
        <div className="mt-6 p-4 rounded-2xl bg-brand-50/60 border border-brand-200">
          <div className="font-display font-semibold text-brand-800 flex items-center gap-2 mb-2">
            📎 Copie de la pièce d'identité <span className="text-rose-600">*</span>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            Joindre une copie scannée ou photographiée de la {form.id_kind === "cni" ? "CNI" : form.id_kind === "passport" ? "Passeport" : form.id_kind === "driver_license" ? "Permis de conduire" : "Carte de séjour"} déclarée ci-dessus.
          </p>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-dashed border-brand-300 cursor-pointer hover:bg-brand-50/50">
            <input type="file" accept="image/*,.pdf" className="hidden"
                   onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
            <div className="flex-1 text-sm">
              {docFile ? <><strong>{docFile.name}</strong> · {(docFile.size / 1024).toFixed(1)} Ko</> : "Cliquez pour sélectionner un fichier (image ou PDF)"}
            </div>
            <span className="btn-secondary !py-1 text-xs">Parcourir</span>
          </label>
          {!docFile && <p className="text-xs text-rose-600 mt-2">La pièce d'identité est requise pour enregistrer le client.</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={!canSubmit || m.isPending} className="btn-primary">
            {m.isPending ? "Création…" : "Créer le client"}
          </button>
        </div>
      </div>
    </div>
  );
}

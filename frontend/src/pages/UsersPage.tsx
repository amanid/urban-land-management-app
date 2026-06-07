import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Lock, Unlock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { formatDate } from "@/lib/format";
import Can from "@/components/Can";

const ROLE_CLS: Record<string, string> = {
  super_admin: "pill-danger", admin: "pill-info",
  sales_agent: "pill-success", cashier: "pill-warning", viewer: "pill-muted",
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/auth/users/")).data,
  });

  const lockToggle = useMutation({
    mutationFn: async (id: number) => (await api.post(`/auth/users/${id}/toggle_lock/`)).data,
    onSuccess: () => { toast.success("Statut mis à jour."); qc.invalidateQueries({ queryKey: ["users"] }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Utilisateurs</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} comptes</p>
        </div>
        <Can capability="manage_users">
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Nouvel utilisateur</button>
        </Can>
      </div>

      {isLoading ? <div className="h-64 skeleton rounded-2xl" /> : (
        <div className="card overflow-hidden">
          <table className="table-clean">
            <thead><tr>
              <th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Créé le</th><th>Dernière connexion</th><th></th>
            </tr></thead>
            <tbody>
              {(data?.results || []).map((u: any) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.full_name}</td>
                  <td>{u.email}</td>
                  <td><span className={clsx(ROLE_CLS[u.role])}>{u.role_label}</span></td>
                  <td>{u.is_locked ? <span className="pill-danger">Bloqué</span> : <span className="pill-success">Actif</span>}</td>
                  <td className="text-xs">{formatDate(u.date_joined)}</td>
                  <td className="text-xs">{formatDate(u.last_login)}</td>
                  <td className="text-right">
                    <button onClick={() => lockToggle.mutate(u.id)} className="btn-ghost text-xs">
                      {u.is_locked ? <><Unlock size={14} /> Débloquer</> : <><Lock size={14} /> Bloquer</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <UserForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["users"] }); }} />}
    </div>
  );
}

function UserForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    email: "", username: "", first_name: "", last_name: "",
    phone: "", role: "sales_agent", password: "",
  });
  const m = useMutation({
    mutationFn: async () => (await api.post("/auth/users/", form)).data,
    onSuccess: () => { toast.success("Utilisateur créé."); onSaved(); },
    onError: (e: any) => toast.error(JSON.stringify(e.response?.data)),
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card-glow w-full max-w-xl p-6">
        <h3 className="font-display font-bold text-xl flex items-center gap-2"><ShieldCheck size={20} /> Nouvel utilisateur</h3>
        <p className="text-sm text-slate-500 mb-4">Choisissez le rôle pour configurer les permissions.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label">Prénom</label><input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
          <div><label className="label">Nom</label><input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          <div>
            <label className="label">Adresse e-mail <span className="text-rose-600">*</span></label>
            <input className="input" type="email" required placeholder="prenom.nom@entreprise.ci"
                   value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Identifiant de connexion <span className="text-rose-600">*</span></label>
            <input className="input" required placeholder="prenom.nom"
                   value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="label">Téléphone (optionnel)</label>
            <input className="input" type="tel" placeholder="+225 07 00 00 00 00"
                   value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Administrateur</option>
              <option value="sales_agent">Agent commercial</option>
              <option value="cashier">Caissier</option>
              <option value="viewer">Lecteur</option>
              <option value="super_admin">Super administrateur</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className="label">Mot de passe initial</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Au moins 8 caractères" /></div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => m.mutate()} disabled={m.isPending} className="btn-primary">Créer</button>
        </div>
      </div>
    </div>
  );
}

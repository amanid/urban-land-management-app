import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { ROLE_BADGE, ROLE_FR } from "@/lib/permissions";
import { Lock, User as UserIcon, ShieldCheck, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime } from "@/lib/format";
import clsx from "clsx";

export default function ProfilePage() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "password" ? "password" : "info");
  useEffect(() => {
    if (params.get("tab") === "password") setTab("password");
  }, [params]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <UserIcon size={22} /> Mon profil
        </h1>
        <p className="text-sm text-slate-500">Vos informations et vos préférences de sécurité.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab("info")}
                className={clsx("px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px",
                  tab === "info" ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700")}>
          Informations
        </button>
        <button onClick={() => setTab("password")}
                className={clsx("px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px",
                  tab === "password" ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700")}>
          Mot de passe
        </button>
      </div>

      {tab === "info" ? <ProfileInfo /> : <ChangePassword />}
    </div>
  );
}

function ProfileInfo() {
  const user = useAuthStore((s) => s.user);
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/users/me/")).data,
  });
  if (isLoading || !me) return <div className="h-48 skeleton rounded-2xl" />;
  return (
    <div className="card-glow p-6">
      <div className="flex items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-grad-brand text-white grid place-items-center text-2xl font-bold shadow-glow shrink-0">
          {(me.full_name || me.email)?.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-display font-bold">{me.full_name}</h2>
          <p className="text-sm text-slate-500">{me.email}</p>
          <div className="mt-2"><span className={ROLE_BADGE[me.role as keyof typeof ROLE_BADGE]}>{ROLE_FR[me.role as keyof typeof ROLE_FR]}</span></div>
        </div>
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 mt-6 text-sm">
        <Field label="Identifiant" value={me.username} />
        <Field label="Téléphone" value={me.phone || "—"} />
        <Field label="Compte créé le" value={formatDateTime(me.date_joined)} />
        <Field label="Dernière connexion" value={me.last_login ? formatDateTime(me.last_login) : "Première session"} />
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-slate-400 font-semibold">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      if (form.new_password !== form.confirm) throw new Error("Les deux mots de passe ne correspondent pas.");
      if (form.new_password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
      return (await api.post("/auth/users/change_password/", {
        old_password: form.old_password, new_password: form.new_password,
      })).data;
    },
    onSuccess: () => {
      toast.success("Mot de passe mis à jour.");
      setForm({ old_password: "", new_password: "", confirm: "" });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e.message || e.response?.data?.detail || "Échec du changement."),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="card-glow p-6 max-w-lg space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={18} className="text-emerald-600" />
        <h3 className="font-display font-semibold">Mettre à jour mon mot de passe</h3>
      </div>
      <div>
        <label className="label">Mot de passe actuel</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className="input pl-9" type="password" required
                 value={form.old_password} onChange={(e) => setForm({ ...form, old_password: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Nouveau mot de passe</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className="input pl-9" type="password" required minLength={8}
                 value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
        </div>
        <p className="text-xs text-slate-400 mt-1">Au moins 8 caractères, idéalement avec chiffres et symboles.</p>
      </div>
      <div>
        <label className="label">Confirmer le nouveau mot de passe</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className="input pl-9" type="password" required
                 value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </div>
      </div>
      <button type="submit" disabled={m.isPending} className="btn-primary w-full">
        {m.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Enregistrer le nouveau mot de passe
      </button>
    </form>
  );
}

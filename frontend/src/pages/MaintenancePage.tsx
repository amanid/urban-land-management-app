import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertTriangle, Database, ShieldAlert, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

type Scope = "transactions" | "business" | "all_except_users";

const SCOPE_DETAILS: Record<Scope, { title: string; desc: string; level: "warn" | "danger" | "critical" }> = {
  transactions: {
    title: "Transactions uniquement",
    desc: "Supprime ventes, acquisitions, versements, échéances, désistements, documents de vente. Conserve : lots, clients, utilisateurs.",
    level: "warn",
  },
  business: {
    title: "Toutes les données métier",
    desc: "Supprime lots + clients + ventes + paiements + documents + notes + villes + quartiers. Conserve : utilisateurs et rôles.",
    level: "danger",
  },
  all_except_users: {
    title: "Tout (sauf comptes utilisateurs)",
    desc: "Comme ci-dessus + efface aussi le journal d'audit. Réinitialisation complète, irréversible.",
    level: "critical",
  },
};

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>("transactions");
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["data-wipe-preview"],
    queryFn: async () => (await api.get("/admin/wipe/")).data,
  });

  const wipe = useMutation({
    mutationFn: async () =>
      (await api.post("/admin/wipe/execute/", { scope, confirm })).data,
    onSuccess: (resp) => {
      toast.success(`${resp.total} enregistrement(s) supprimé(s).`);
      setShowConfirm(false);
      setConfirm("");
      qc.invalidateQueries({ queryKey: ["data-wipe-preview"] });
      // Invalidate all cached data so the UI reflects the wipe
      qc.invalidateQueries();
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.confirm || e.response?.data?.scope || e.response?.data?.detail || "Échec de la purge.");
    },
  });

  const SCOPE_COLOR = {
    warn: "border-amber-500 bg-amber-50/40 text-amber-800",
    danger: "border-orange-500 bg-orange-50/40 text-orange-800",
    critical: "border-rose-500 bg-rose-50/40 text-rose-800",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Database size={22} className="text-rose-600" /> Maintenance des données
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Outil de purge réservé aux <strong>super administrateurs</strong>. Utiliser après une phase de test pour repartir d'une base propre.
          Les comptes utilisateurs et les rôles restent intacts.
        </p>
      </div>

      {/* Counts overview */}
      <div className="card-glow p-5">
        <h3 className="font-display font-semibold mb-3">État actuel</h3>
        {isLoading ? <div className="h-32 skeleton rounded-xl" /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {Object.entries(data?.counts || {}).map(([k, v]: any) => (
              <div key={k} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold truncate">{v.label}</div>
                <div className="text-xl font-display font-bold mt-0.5">{v.count.toLocaleString("fr-FR")}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scope selection */}
      <div className="card-glow p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Trash2 size={18} className="text-rose-600" /> Choisir le périmètre de la purge
        </h3>
        <div className="space-y-3">
          {(Object.keys(SCOPE_DETAILS) as Scope[]).map((s) => {
            const d = SCOPE_DETAILS[s];
            const isActive = scope === s;
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={clsx(
                  "w-full text-left p-4 rounded-2xl border-2 transition-all",
                  isActive
                    ? SCOPE_COLOR[d.level]
                    : "border-slate-200 hover:border-slate-300 bg-white",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    "w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
                    isActive ? "border-current" : "border-slate-300",
                  )}>
                    {isActive && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold">{d.title}</div>
                    <div className="text-sm mt-1 opacity-90">{d.desc}</div>
                  </div>
                  {d.level === "critical" && <AlertTriangle size={20} className="text-rose-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setShowConfirm(true)}
            className="btn-danger"
          >
            <ShieldAlert size={16} /> Purger les données sélectionnées
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="card-glow w-full max-w-lg p-6 border-2 border-rose-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 grid place-items-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-rose-700">Confirmation requise</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Vous êtes sur le point de <strong>supprimer définitivement</strong> :
                  <br />
                  <span className="font-semibold">{SCOPE_DETAILS[scope].title}</span>
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-slate-700 mb-4">
              <strong>Cette opération est irréversible.</strong> Aucune restauration possible.
              Assurez-vous d'avoir exporté toutes les données utiles avant de continuer.
            </div>

            <label className="label">Tapez <strong className="text-rose-600">{data?.confirm_phrase || "SUPPRIMER"}</strong> pour confirmer :</label>
            <input
              className="input"
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={data?.confirm_phrase || "SUPPRIMER"}
            />

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setShowConfirm(false); setConfirm(""); }} className="btn-secondary">
                Annuler
              </button>
              <button
                onClick={() => wipe.mutate()}
                disabled={confirm !== (data?.confirm_phrase || "SUPPRIMER") || wipe.isPending}
                className="btn-danger"
              >
                {wipe.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last wipe result */}
      {wipe.data && (
        <div className="card-glow border-l-4 border-emerald-500 p-5 bg-emerald-50/40">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-display font-bold text-emerald-800">Purge effectuée</h3>
              <p className="text-sm text-slate-700">
                {wipe.data.total} enregistrement(s) supprimé(s). Détail :
              </p>
              <ul className="mt-2 text-xs space-y-0.5">
                {Object.entries(wipe.data.deleted || {}).map(([k, v]: any) => v.deleted > 0 && (
                  <li key={k}>• <strong>{v.label}</strong> : {v.deleted}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ROLE_BADGE, ROLE_FR } from "@/lib/permissions";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Award, Users as UsersIcon, Eye, ChevronRight } from "lucide-react";
import clsx from "clsx";

export default function UserPerformancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-performance"],
    queryFn: async () => (await api.get("/dashboard/user-performance/")).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Award size={24} className="text-amber-500" /> Performance des collaborateurs
        </h1>
        <p className="text-sm text-slate-500">Vue détaillée du contribution de chaque utilisateur (hors lecteurs).</p>
      </div>

      {isLoading ? <div className="h-72 skeleton rounded-2xl" /> : (
        <div className="card overflow-hidden">
          <table className="table-clean">
            <thead><tr>
              <th>Collaborateur</th>
              <th>Rôle</th>
              <th className="text-right">Dossiers</th>
              <th className="text-right">Soldés</th>
              <th className="text-right">En cours</th>
              <th className="text-right">CA brut</th>
              <th className="text-right">Encaissé</th>
              <th className="text-right">Solde</th>
              <th className="text-right">Encaissé / mois</th>
              <th className="text-right">Dernière connexion</th>
              <th></th>
            </tr></thead>
            <tbody>
              {(data?.users || []).map((u: any, idx: number) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-8 h-8 rounded-lg grid place-items-center font-bold text-xs",
                        idx === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-glow" :
                        "bg-slate-100 text-slate-700")}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{u.full_name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={ROLE_BADGE[u.role as keyof typeof ROLE_BADGE] || "pill-muted"}>{ROLE_FR[u.role as keyof typeof ROLE_FR] || u.role}</span></td>
                  <td className="text-right font-semibold">{u.sales_count}</td>
                  <td className="text-right text-emerald-700">{u.sales_completed}</td>
                  <td className="text-right text-amber-700">{u.sales_in_progress}</td>
                  <td className="text-right font-bold text-brand-700">{formatMoney(u.gross_value)}</td>
                  <td className="text-right">{formatMoney(u.paid_value)}</td>
                  <td className="text-right text-rose-700 font-semibold">{formatMoney(u.outstanding)}</td>
                  <td className="text-right">{formatMoney(u.payments_collected_month)}</td>
                  <td className="text-right text-xs text-slate-500">{u.last_login ? formatDateTime(u.last_login) : "—"}</td>
                  <td>
                    <Link to={`/?as_user=${u.id}`} className="btn-ghost !py-1.5 text-xs">
                      <Eye size={13} /> Voir son tableau <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!data?.users || data.users.length === 0) && (
                <tr><td colSpan={11} className="text-center text-slate-400 py-8">
                  <UsersIcon size={28} className="mx-auto mb-2" />
                  Aucun collaborateur actif.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

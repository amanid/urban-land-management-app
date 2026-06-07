import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore, isAdminLevel } from "@/store/auth";
import { formatMoney, formatDate } from "@/lib/format";
import { ROLE_FR } from "@/lib/permissions";
import KpiCard from "@/components/KpiCard";
import ActivityFeed from "@/components/ActivityFeed";
import ByCityPanel from "@/components/ByCityPanel";
import MonthlySummaryPanel from "@/components/MonthlySummaryPanel";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import {
  Banknote, ReceiptText, Building2, TrendingUp, TrendingDown,
  TriangleAlert, ShieldAlert, Calendar, Users as UsersIcon,
  Sparkles, Trophy, Target, ArrowUpRight, Activity, Crown, Eye, X, Award,
} from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  available: "#10b981", reserved: "#f59e0b", sold: "#3b82f6",
  litigation: "#ef4444", off_market: "#94a3b8", draft: "#64748b",
  in_progress: "#8b5cf6", completed: "#10b981", cancelled: "#94a3b8",
};

const STATUS_FR: Record<string, string> = {
  available: "Disponibles", reserved: "Réservés", sold: "Vendus",
  litigation: "En litige", off_market: "Retirés", draft: "Brouillon",
  in_progress: "En cours", completed: "Soldées", cancelled: "Annulées",
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const admin = isAdminLevel(user?.role);
  const [params] = useSearchParams();
  const asUserId = params.get("as_user");

  // Admin can use ?as_user=<id> to view another user's perspective
  if (admin && asUserId) {
    return <AgentView impersonatedUserId={asUserId} />;
  }
  return admin ? <AdminView /> : <AgentView />;
}

/* ========================================================================== */
/* AGENT VIEW                                                                 */
/* ========================================================================== */
function AgentView({ impersonatedUserId }: { impersonatedUserId?: string } = {}) {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "agent", impersonatedUserId],
    queryFn: async () => (await api.get("/dashboard/agent/", {
      params: impersonatedUserId ? { as_user: impersonatedUserId } : {},
    })).data,
  });

  if (isLoading || !data) return <SkeletonDashboard />;
  const k = data.kpis;

  return (
    <div className="space-y-7">
      {/* Impersonation banner */}
      {impersonatedUserId && (
        <div className="card border-l-4 border-amber-500 p-4 flex items-center gap-3 bg-amber-50/60">
          <Eye size={18} className="text-amber-700" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Vue commerciale en mode observation</div>
            <div className="text-xs text-slate-600">Vous consultez le tableau de bord d'un autre collaborateur. Aucune action n'est effectuée en son nom.</div>
          </div>
          <Link to="/" className="btn-ghost text-xs"><X size={14} /> Revenir à ma vue</Link>
        </div>
      )}

      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 bg-grad-dark text-white"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08]"
             style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} className="text-amber-300" /> Espace Commercial
            </div>
            <h1 className="mt-3 text-4xl font-display font-extrabold tracking-tight">
              Bonjour {user?.first_name || "à vous"},
            </h1>
            <p className="mt-1.5 text-white/70 max-w-lg">
              Voici votre performance, vos lots disponibles et les échéances à suivre.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <HeroStat label="Mes ventes" value={k.sales_total} />
            <HeroStat label="CA ce mois" value={formatMoney(k.revenue_month).replace(/\s?XOF/, " F")} small />
          </div>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Mes dossiers" value={k.sales_total} hint={`${k.sales_in_progress} en cours · ${k.sales_completed} soldés`} icon={ReceiptText} tone="brand" />
        <KpiCard label="Encaissements du mois" value={formatMoney(k.revenue_month)} hint={`Cumul annuel : ${formatMoney(k.revenue_year)}`} icon={Banknote} tone="emerald" />
        <KpiCard label="Solde à recouvrer" value={formatMoney(k.outstanding_value)} hint="Sur mes dossiers actifs" icon={Target} tone="amber" />
        <KpiCard label="Catalogue ouvert" value={data.inventory.available} hint={`${data.inventory.reserved_by_me} déjà réservés par vous`} icon={Building2} tone="violet" />
      </div>

      {/* Chart + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-glow p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg">Mes encaissements (14 derniers jours)</h3>
              <p className="text-xs text-slate-500">Tendance des règlements reçus sur vos dossiers</p>
            </div>
            <div className="pill-info"><Activity size={12} /> En direct</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={(data.daily_revenue || []).map((r: any) => ({ ...r, d: r.d?.slice(5, 10) }))}>
              <defs>
                <linearGradient id="ag-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="d" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => v / 1000 + " k"} />
              <Tooltip formatter={(v: any) => formatMoney(v as number)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="amount" stroke="#1d4ed8" fill="url(#ag-area)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card-glow p-6">
          <h3 className="font-display font-bold text-lg mb-1 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Classement du mois
          </h3>
          <p className="text-xs text-slate-500 mb-4">Top commerciaux par chiffre d'affaires</p>
          <div className="space-y-3">
            {(data.ranking || []).map((r: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.07 }}
                className={clsx("flex items-center gap-3 p-2.5 rounded-xl",
                  idx === 0 && "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200")}
              >
                <div className={clsx("w-9 h-9 rounded-xl grid place-items-center font-bold text-sm",
                  idx === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-glow" :
                  idx === 1 ? "bg-slate-200 text-slate-700" :
                  idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600")}>
                  {idx === 0 ? <Crown size={16} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {r.agent__first_name} {r.agent__last_name}
                  </div>
                  <div className="text-xs text-slate-500">{formatMoney(r.total)}</div>
                </div>
              </motion.div>
            ))}
            {(!data.ranking || data.ranking.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">Pas encore de classement ce mois-ci.</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="card-glow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <Calendar size={18} className="text-brand-600" /> Vos échéances à venir
            </h3>
            <p className="text-xs text-slate-500">Échéances clients dans les 14 prochains jours</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr>
              <th>Date</th><th>Référence vente</th><th>Client</th>
              <th className="text-right">Reste à régler</th><th></th>
            </tr></thead>
            <tbody>
              {(data.upcoming_installments || []).map((i: any) => (
                <tr key={i.id} className="hover:bg-brand-50/30">
                  <td className={clsx("font-semibold", i.is_overdue && "text-rose-600")}>{formatDate(i.due_on)}</td>
                  <td className="font-mono text-xs">{i.sale_ref}</td>
                  <td className="font-medium">{i.client}</td>
                  <td className="text-right font-bold">{formatMoney(i.balance)}</td>
                  <td className="text-right">
                    {i.is_overdue ? <span className="pill-danger">En retard</span> : <span className="pill-warning">À échoir</span>}
                  </td>
                </tr>
              ))}
              {(!data.upcoming_installments || data.upcoming_installments.length === 0) && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-8">
                  <Sparkles size={24} className="mx-auto mb-2 text-emerald-500" />
                  Aucune échéance imminente. Vous êtes à jour.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* ADMIN VIEW                                                                 */
/* ========================================================================== */
function AdminView() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: async () => (await api.get("/dashboard/admin/")).data,
  });
  const { data: team } = useQuery({
    queryKey: ["user-performance"],
    queryFn: async () => (await api.get("/dashboard/user-performance/")).data,
  });

  if (isLoading || !data) return <SkeletonDashboard />;
  const h = data.headline;

  return (
    <div className="space-y-7">
      {/* HERO -------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 bg-grad-dark text-white"
      >
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-accent-500/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.07]"
             style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider">
              <Crown size={12} className="text-amber-300" /> Espace Direction
            </div>
            <h1 className="mt-3 text-4xl md:text-5xl font-display font-extrabold tracking-tight">
              Centre de pilotage
            </h1>
            <p className="mt-2 text-white/75 text-lg">
              Bienvenue {user?.first_name}. Vue consolidée du business, signaux anti-fraude et analytics premium.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[420px]">
            <HeroStat label="CA Année" value={formatMoney(h.revenue_year).replace(/\s?XOF/, " F")} small />
            <HeroStat label="CA Mois" value={formatMoney(h.revenue_month).replace(/\s?XOF/, " F")} small trend={h.mom_growth_pct} />
            <HeroStat label="Marge" value={`${h.margin_pct}%`} small />
          </div>
        </div>
      </motion.div>

      {/* KPI ROW 1 --------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Chiffre d'affaires annuel" value={formatMoney(h.revenue_year)} trend={h.mom_growth_pct} icon={Banknote} tone="brand" />
        <KpiCard label="Chiffre d'affaires du mois" value={formatMoney(h.revenue_month)} icon={TrendingUp} tone="emerald" />
        <KpiCard label="Marge brute" value={formatMoney(h.gross_margin)} hint={`Taux de marge : ${h.margin_pct}%`} icon={Target} tone="violet" />
        <KpiCard label="Encours à recouvrer" value={formatMoney(h.outstanding_value)} hint="Solde dû par les clients" icon={ReceiptText} tone="amber" />
      </div>

      {/* KPI ROW 2 --------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Lots au catalogue" value={h.lots_available} hint="Actuellement disponibles" icon={Building2} tone="brand" />
        <KpiCard label="Lots vendus" value={h.lots_sold_ytd} hint="Depuis le début de l'année" icon={Building2} tone="emerald" />
        <KpiCard label="Portefeuille client" value={h.clients_total} hint="Comptes enregistrés" icon={UsersIcon} tone="violet" />
        <KpiCard
          label="Signaux de fraude"
          value={data.fraud_signals?.length || 0}
          hint={data.fraud_signals?.length ? "À examiner" : "Aucune anomalie"}
          icon={ShieldAlert}
          tone={data.fraud_signals?.length ? "rose" : "emerald"}
        />
      </div>

      {/* FRAUD SIGNALS ----------------------------------------------------- */}
      {data.fraud_signals?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card-glow border-l-4 border-rose-500 p-6 bg-gradient-to-br from-rose-50/40 to-orange-50/40">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-rose-700">
            <TriangleAlert size={20} /> Alertes anti-fraude
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.fraud_signals.map((s: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-white border border-rose-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={clsx(
                    s.level === "critical" || s.level === "high" ? "pill-danger" :
                    s.level === "medium" ? "pill-warning" : "pill-muted",
                  )}>
                    {s.level === "critical" ? "Critique" :
                     s.level === "high" ? "Élevé" :
                     s.level === "medium" ? "Moyen" : "Faible"}
                  </span>
                  <div className="text-sm font-bold text-slate-900">{s.label}</div>
                </div>
                <div className="text-xs text-slate-600">{s.description || `${s.count} cas détecté${s.count > 1 ? "s" : ""}.`}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CHARTS ROW -------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-glow p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg">Évolution du chiffre d'affaires</h3>
              <p className="text-xs text-slate-500">Encaissements mensuels sur 12 mois</p>
            </div>
            <a href="/analytics" className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
              Voir le détail <ArrowUpRight size={12} />
            </a>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={(data.monthly_revenue || []).map((r: any) => ({ ...r, m: r.m?.slice(0, 7) }))}>
              <defs>
                <linearGradient id="adm-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="m" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => v / 1000 + " k"} />
              <Tooltip formatter={(v: any) => formatMoney(v as number)} contentStyle={{ borderRadius: 12 }} />
              <Area type="monotone" dataKey="amount" stroke="#7c3aed" fill="url(#adm-area)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card-glow p-6">
          <h3 className="font-display font-bold text-lg mb-1">Pipeline des ventes</h3>
          <p className="text-xs text-slate-500 mb-4">Répartition par statut</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={(data.pipeline || []).map((p: any) => ({ ...p, name: STATUS_FR[p.status] || p.status }))}
                   dataKey="count" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {(data.pipeline || []).map((p: any, i: number) => (
                  <Cell key={i} fill={STATUS_COLORS[p.status] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-xs space-y-1.5 mt-2">
            {(data.pipeline || []).map((p: any) => (
              <div key={p.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] }} />
                  <span className="text-slate-600">{STATUS_FR[p.status]}</span>
                </div>
                <span className="font-bold">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW -------------------------------------------------------- */}
      {/* Performance par collaborateur ------------------------------------ */}
      {team?.users?.length > 0 && (
        <div className="card-glow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Award size={18} className="text-amber-500" /> Performance par collaborateur
              </h3>
              <p className="text-xs text-slate-500">Cliquez pour observer le tableau de bord d'un commercial</p>
            </div>
            <Link to="/performance" className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
              Tout afficher <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead><tr>
                <th>Collaborateur</th><th>Rôle</th>
                <th className="text-right">Dossiers</th>
                <th className="text-right">CA brut</th>
                <th className="text-right">Encaissé</th>
                <th className="text-right">À recouvrer</th>
                <th></th>
              </tr></thead>
              <tbody>
                {team.users.slice(0, 6).map((u: any, idx: number) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className={clsx("w-8 h-8 rounded-lg grid place-items-center text-xs font-bold",
                          idx === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-glow" :
                          "bg-slate-100 text-slate-700")}>{idx + 1}</div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{u.full_name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs">{ROLE_FR[u.role as keyof typeof ROLE_FR] || u.role}</td>
                    <td className="text-right font-semibold">{u.sales_count}</td>
                    <td className="text-right font-bold text-brand-700">{formatMoney(u.gross_value)}</td>
                    <td className="text-right text-emerald-700">{formatMoney(u.paid_value)}</td>
                    <td className="text-right text-rose-700">{formatMoney(u.outstanding)}</td>
                    <td className="text-right">
                      <Link to={`/?as_user=${u.id}`} className="btn-ghost text-xs">
                        <Eye size={13} /> Voir sa vue
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MONTHLY SUMMARY -------------------------------------------------- */}
      <MonthlySummaryPanel />

      {/* PERFORMANCE PAR VILLE / VILLAGE ---------------------------------- */}
      <ByCityPanel />

      {/* ACTIVITY FEED ---------------------------------------------------- */}
      <ActivityFeed limit={12} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-glow p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" /> Top commerciaux
              </h3>
              <p className="text-xs text-slate-500">Classement annuel par chiffre d'affaires</p>
            </div>
          </div>
          <div className="space-y-2">
            {(data.top_agents || []).map((a: any, i: number) => (
              <div key={a.agent__id} className={clsx("flex items-center gap-3 p-3 rounded-xl",
                i === 0 ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200" : "hover:bg-slate-50")}>
                <div className={clsx("w-10 h-10 rounded-xl grid place-items-center font-bold",
                  i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-glow" : "bg-slate-100 text-slate-700")}>
                  {i === 0 ? <Crown size={18} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{a.agent__first_name} {a.agent__last_name}</div>
                  <div className="text-xs text-slate-500">{a.deals} dossier{a.deals > 1 ? "s" : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-brand-700">{formatMoney(a.revenue)}</div>
                </div>
              </div>
            ))}
            {(!data.top_agents || data.top_agents.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">Aucune vente cette année.</p>
            )}
          </div>
        </div>

        <div className="card-glow p-6">
          <h3 className="font-display font-bold text-lg mb-1">Ancienneté des impayés</h3>
          <p className="text-xs text-slate-500 mb-4">Répartition par tranche d'âge des retards</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[
              { bucket: "0 à 30 j", v: data.overdue_aging["0_30"] || 0, color: "#10b981" },
              { bucket: "31 à 60 j", v: data.overdue_aging["31_60"] || 0, color: "#f59e0b" },
              { bucket: "61 à 90 j", v: data.overdue_aging["61_90"] || 0, color: "#fb923c" },
              { bucket: "> 90 j", v: data.overdue_aging["90_plus"] || 0, color: "#ef4444" },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="bucket" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => v / 1000 + " k"} />
              <Tooltip formatter={(v: any) => formatMoney(v as number)} contentStyle={{ borderRadius: 12 }} />
              <Bar dataKey="v" radius={[10, 10, 0, 0]}>
                {["#10b981", "#f59e0b", "#fb923c", "#ef4444"].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* SMALL COMPONENTS                                                           */
/* ========================================================================== */
function HeroStat({ label, value, small, trend }: { label: string; value: any; small?: boolean; trend?: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.08] border border-white/[0.12] backdrop-blur-md p-3.5">
      <div className="text-[10px] uppercase tracking-widest font-bold text-white/60">{label}</div>
      <div className={clsx("font-display font-extrabold mt-1 tracking-tight", small ? "text-xl" : "text-3xl")}>{value}</div>
      {typeof trend === "number" && (
        <div className={clsx("text-[11px] font-semibold mt-1 flex items-center gap-1",
          trend >= 0 ? "text-emerald-300" : "text-rose-300")}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend).toFixed(1)}% vs mois N-1
        </div>
      )}
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="h-48 skeleton rounded-3xl" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-28 skeleton rounded-2xl" />))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-28 skeleton rounded-2xl" />))}
      </div>
      <div className="h-80 skeleton rounded-2xl" />
    </div>
  );
}

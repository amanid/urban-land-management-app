import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, ScatterChart, Scatter, Cell, LineChart, Line, Legend,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import { Target, TrendingUp, Users, AlertTriangle, Clock } from "lucide-react";
import clsx from "clsx";

const RISK_CLS: Record<string, string> = {
  high: "pill-danger", medium: "pill-warning", low: "pill-success",
};

export default function AdvancedAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-advanced"],
    queryFn: async () => (await api.get("/dashboard/advanced/")).data,
  });

  if (isLoading || !data) return <div className="h-96 skeleton rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Analytics avancés</h1>
        <p className="text-sm text-slate-500">Prévisions, cohortes, scoring de risque, anomalies.</p>
      </div>

      {/* Performance vs target */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="CA YTD" value={formatMoney(data.performance_vs_target.ytd_revenue)} icon={TrendingUp} tone="brand" />
        <KpiCard label="Attendu à date" value={formatMoney(data.performance_vs_target.expected_to_date)} icon={Target} tone="violet" />
        <KpiCard label="Réalisation"
          value={data.performance_vs_target.achievement_pct + "%"}
          tone={data.performance_vs_target.achievement_pct >= 90 ? "emerald" : data.performance_vs_target.achievement_pct >= 70 ? "amber" : "rose"}
          icon={Target} />
      </div>

      {/* Cash forecast */}
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-2">Prévision de trésorerie (90 jours)</h3>
        <p className="text-xs text-slate-500 mb-3">Encaissements attendus = {formatMoney(data.forecast.next_30d_expected)} sur 30j · moyenne mobile 30j : {formatMoney(data.forecast.history_30d_avg)} · volatilité ±{formatMoney(data.forecast.history_volatility)}</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={(data.forecast.scheduled || []).map((r: any) => ({ ...r, d: r.d?.slice(5, 10) }))}>
            <defs>
              <linearGradient id="fc-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="d" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => v / 1000 + "k"} />
            <Tooltip formatter={(v: any) => formatMoney(v as number)} />
            <Area type="monotone" dataKey="amount" stroke="#059669" fill="url(#fc-area)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3">Funnel de conversion</h3>
          <div className="space-y-2">
            {[
              { k: "in_catalog", l: "Au catalogue", c: "from-slate-400 to-slate-500" },
              { k: "available", l: "Disponibles", c: "from-brand-400 to-brand-600" },
              { k: "reserved", l: "Réservés", c: "from-amber-400 to-amber-600" },
              { k: "in_progress", l: "En cours", c: "from-violet-400 to-violet-600" },
              { k: "sold", l: "Vendus", c: "from-emerald-400 to-emerald-600" },
            ].map((row, i, all) => {
              const v = data.conversion_funnel[row.k] || 0;
              const max = data.conversion_funnel[all[0].k] || 1;
              const pct = (v / max) * 100;
              return (
                <div key={row.k}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>{row.l}</span><span className="font-semibold">{v}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className={clsx("h-full bg-gradient-to-r", row.c)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cohorts */}
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3">Cohortes clients (CA / mois d'acquisition)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(data.cohorts || []).map((r: any) => ({ ...r, acq_month: r.acq_month?.slice(0, 7) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="acq_month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => v / 1000 + "k"} />
              <Tooltip formatter={(v: any) => formatMoney(v as number)} />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Client risk */}
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Users size={16} /> Scoring de risque client (top 25)
        </h3>
        <table className="table-clean">
          <thead><tr><th>Client</th><th>Code</th><th>Régularité</th><th>Retards</th><th className="text-right">Encours</th><th>Risque</th></tr></thead>
          <tbody>
            {(data.client_risk || []).map((c: any) => (
              <tr key={c.client_id}>
                <td className="font-semibold">{c.name}</td>
                <td className="font-mono text-xs">{c.code}</td>
                <td>{c.on_time_pct}%</td>
                <td>{c.overdue_count}</td>
                <td className="text-right">{formatMoney(c.outstanding)}</td>
                <td><span className={RISK_CLS[c.risk]}>{c.risk}</span></td>
              </tr>
            ))}
            {(!data.client_risk || data.client_risk.length === 0) && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-4">Pas encore de signal de risque.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profitability */}
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3">Marge par ville</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.profitability.by_city}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="lot__city__name" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => v / 1000 + "k"} />
              <Tooltip formatter={(v: any) => formatMoney(v as number)} />
              <Bar dataKey="margin" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Anomalies */}
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Anomalies & outliers
          </h3>
          <div className="text-xs text-slate-500 mb-3">
            Seuil de détection : <strong>{formatMoney(data.anomalies.thresholds?.outlier_threshold || 0)}</strong>
            (moyenne {formatMoney(data.anomalies.thresholds?.mean || 0)} ± 2σ)
          </div>
          <table className="table-clean">
            <thead><tr><th>Reçu</th><th>Vente</th><th className="text-right">Montant</th></tr></thead>
            <tbody>
              {(data.anomalies.outlier_payments || []).map((o: any) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs">{o.receipt_number}</td>
                  <td className="font-mono text-xs">{o.sale__reference}</td>
                  <td className="text-right font-semibold">{formatMoney(o.amount, o.currency)}</td>
                </tr>
              ))}
              {(!data.anomalies.outlier_payments || data.anomalies.outlier_payments.length === 0) && (
                <tr><td colSpan={3} className="text-center text-slate-400 py-4">Aucune anomalie détectée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale velocity */}
      {data.sale_velocity?.avg_days_to_close && (
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Clock size={16} /> Vélocité des ventes</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-slate-500">Délai moyen :</span> <strong>{data.sale_velocity.avg_days_to_close} jours</strong></div>
            <div><span className="text-slate-500">Médiane :</span> <strong>{data.sale_velocity.median_days_to_close} jours</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

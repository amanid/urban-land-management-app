import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Calendar, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { formatMoney } from "@/lib/format";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import clsx from "clsx";

export default function MonthlySummaryPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-monthly"],
    queryFn: async () => (await api.get("/dashboard/monthly/")).data,
  });

  if (isLoading || !data) return <div className="h-72 skeleton rounded-2xl" />;

  const mom = data.mom_growth_pct || 0;
  const best = data.best_month;

  return (
    <div className="card-glow p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Calendar size={18} className="text-violet-600" /> Analyse mensuelle (12 derniers mois)
          </h3>
          <p className="text-xs text-slate-500">Encaissements, marge, nouveaux clients, désistements par mois</p>
        </div>
        <div className="flex gap-3">
          <div className={clsx("px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1.5",
            mom >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
            {mom >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(mom).toFixed(1)}% MoM
          </div>
          {best && (
            <div className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 flex items-center gap-1.5">
              <Crown size={14} /> Meilleur mois : {best.month_label}
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data.months}>
          <defs>
            <linearGradient id="ms-cash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month_label" fontSize={11} stroke="#94a3b8" />
          <YAxis yAxisId="left" fontSize={11} stroke="#94a3b8" tickFormatter={(v) => v / 1000 + " k"} />
          <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#94a3b8" />
          <Tooltip formatter={(v: any, n) => (typeof v === "number" && n !== "deals" && n !== "new_clients") ? formatMoney(v) : v}
                   contentStyle={{ borderRadius: 12 }} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Bar yAxisId="left" dataKey="net_cash_in" name="Encaissé (net)" fill="url(#ms-cash)" radius={[6, 6, 0, 0]} />
          <Line yAxisId="left" type="monotone" dataKey="gross_revenue" name="CA généré" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="deals" name="Ventes" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-5 overflow-x-auto">
        <table className="table-clean">
          <thead><tr>
            <th>Mois</th>
            <th className="text-right">Encaissé net</th>
            <th className="text-right">Ventes</th>
            <th className="text-right">Soldées</th>
            <th className="text-right">CA généré</th>
            <th className="text-right">Marge</th>
            <th className="text-right">Nouv. clients</th>
            <th className="text-right">Nouv. lots</th>
            <th className="text-right">Désistements</th>
          </tr></thead>
          <tbody>
            {data.months.slice().reverse().map((m: any) => (
              <tr key={m.month}>
                <td className="font-semibold">{m.month_label}</td>
                <td className="text-right font-bold text-brand-700">{formatMoney(m.net_cash_in)}</td>
                <td className="text-right">{m.deals}</td>
                <td className="text-right text-emerald-700">{m.completed_deals}</td>
                <td className="text-right">{formatMoney(m.gross_revenue)}</td>
                <td className="text-right">
                  <div>{formatMoney(m.gross_margin)}</div>
                  {m.margin_pct > 0 && <div className="text-[10px] text-slate-500">{m.margin_pct}%</div>}
                </td>
                <td className="text-right text-violet-700">{m.new_clients}</td>
                <td className="text-right text-emerald-700">{m.new_lots}</td>
                <td className="text-right text-rose-700">{m.withdrawals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

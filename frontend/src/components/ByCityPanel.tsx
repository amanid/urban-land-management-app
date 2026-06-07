import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MapPinned } from "lucide-react";
import { formatMoney } from "@/lib/format";
import clsx from "clsx";

export default function ByCityPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-by-city"],
    queryFn: async () => (await api.get("/dashboard/by-city/")).data,
  });

  return (
    <div className="card-glow p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <MapPinned size={18} className="text-emerald-600" /> Performance par ville / village
          </h3>
          <p className="text-xs text-slate-500">Disponibilité du stock + chiffre d'affaires + marge pour chaque localité</p>
        </div>
      </div>

      {isLoading ? <div className="h-48 skeleton rounded-xl" /> : (
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Ville / Village</th>
                <th className="text-right">Total</th>
                <th className="text-right">Dispo.</th>
                <th className="text-right">Réservés</th>
                <th className="text-right">Vendus</th>
                <th className="text-right">Stock dispo.</th>
                <th className="text-right">Deals</th>
                <th className="text-right">CA</th>
                <th className="text-right">Encaissé</th>
                <th className="text-right">À recouvrer</th>
                <th className="text-right">Marge</th>
              </tr>
            </thead>
            <tbody>
              {(data?.cities || []).map((c: any) => (
                <tr key={c.city__id}>
                  <td>
                    <div className="font-semibold">{c.city__name}</div>
                    <div className="text-[10px] text-slate-400">{c.city__country}</div>
                  </td>
                  <td className="text-right font-semibold">{c.total}</td>
                  <td className="text-right text-emerald-700">{c.available}</td>
                  <td className="text-right text-amber-700">{c.reserved}</td>
                  <td className="text-right text-brand-700">{c.sold}</td>
                  <td className="text-right text-xs">{formatMoney(c.inventory_value || 0)}</td>
                  <td className="text-right">{c.deals}</td>
                  <td className="text-right font-bold text-brand-700">{formatMoney(c.revenue)}</td>
                  <td className="text-right text-emerald-700">{formatMoney(c.collected)}</td>
                  <td className="text-right text-rose-700">{formatMoney(c.outstanding)}</td>
                  <td className="text-right">
                    <div className="font-semibold">{formatMoney(c.margin)}</div>
                    <div className={clsx("text-[10px]",
                      c.margin_pct >= 30 ? "text-emerald-600" :
                      c.margin_pct >= 15 ? "text-amber-600" : "text-rose-600")}>
                      {c.margin_pct}% marge
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.cities || data.cities.length === 0) && (
                <tr><td colSpan={11} className="text-center text-slate-400 py-6">
                  Aucune donnée par ville pour le moment.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

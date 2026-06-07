import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  Activity, MapPinned, Users as UsersIcon, Receipt,
  Banknote, FileText, ShieldAlert,
} from "lucide-react";
import clsx from "clsx";

const ENTITY_ICON: Record<string, any> = {
  Lot: MapPinned, Client: UsersIcon, Sale: Receipt, Payment: Banknote,
  LotDocument: FileText, ClientDocument: FileText, SaleDocument: FileText,
};
const ENTITY_FR: Record<string, string> = {
  Lot: "Lot", Client: "Client", Sale: "Vente", Payment: "Versement",
  LotDocument: "Document lot", ClientDocument: "Document client",
  SaleDocument: "Document vente", Acquisition: "Acquisition",
};
const ENTITY_COLOR: Record<string, string> = {
  Lot: "text-emerald-600 bg-emerald-100",
  Client: "text-violet-600 bg-violet-100",
  Sale: "text-brand-600 bg-brand-100",
  Payment: "text-amber-600 bg-amber-100",
};

export default function ActivityFeed({ limit = 12 }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-feed", limit],
    queryFn: async () => (await api.get(`/history/?limit=${limit}`)).data,
    refetchInterval: 30_000,
  });

  return (
    <div className="card-glow p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" /> Fil d'activité
          </h3>
          <p className="text-xs text-slate-500">Actions récentes de votre équipe — mis à jour automatiquement</p>
        </div>
        <span className="pill-success animate-pulse">En direct</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
        </div>
      ) : (
        <ul className="space-y-2">
          {(data?.items || []).slice(0, limit).map((ev: any) => {
            const Icon = ENTITY_ICON[ev.entity] || Activity;
            const isAlert = ev.action === "delete" || ev.action === "void";
            const colorCls = ENTITY_COLOR[ev.entity] || "text-slate-600 bg-slate-100";
            return (
              <li key={ev.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className={clsx("w-9 h-9 rounded-xl grid place-items-center shrink-0",
                  isAlert ? "bg-rose-100 text-rose-600" : colorCls)}>
                  {isAlert ? <ShieldAlert size={16} /> : <Icon size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold">{ev.user || "Système"}</span>
                    <span className="text-slate-500"> · {ev.action_label?.toLowerCase()}</span>
                    <span className="text-slate-500"> · </span>
                    <span className="font-semibold">{ENTITY_FR[ev.entity] || ev.entity}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{ev.description}</div>
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">{formatDateTime(ev.ts)}</div>
              </li>
            );
          })}
          {(!data?.items || data.items.length === 0) && (
            <li className="text-sm text-slate-400 text-center py-6">Aucune activité récente.</li>
          )}
        </ul>
      )}
    </div>
  );
}

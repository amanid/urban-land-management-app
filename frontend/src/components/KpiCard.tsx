import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: number; // percentage change
  tone?: "brand" | "emerald" | "amber" | "rose" | "violet";
}

const toneMap = {
  brand: { bg: "from-brand-50 to-blue-100/60", icon: "bg-brand-100 text-brand-700" },
  emerald: { bg: "from-emerald-50 to-teal-100/60", icon: "bg-emerald-100 text-emerald-700" },
  amber: { bg: "from-amber-50 to-orange-100/60", icon: "bg-amber-100 text-amber-700" },
  rose: { bg: "from-rose-50 to-pink-100/60", icon: "bg-rose-100 text-rose-700" },
  violet: { bg: "from-violet-50 to-fuchsia-100/60", icon: "bg-violet-100 text-violet-700" },
};

export default function KpiCard({ label, value, hint, icon: Icon, trend, tone = "brand" }: Props) {
  const t = toneMap[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={clsx("card p-5 bg-gradient-to-br", t.bg, "relative overflow-hidden")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">{label}</div>
          <div className="mt-1.5 text-2xl font-display font-bold tracking-tight text-slate-900">{value}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
          {typeof trend === "number" && (
            <div className={clsx(
              "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
              trend >= 0 ? "text-emerald-700" : "text-rose-700",
            )}>
              {trend >= 0 ? "↗" : "↘"} {Math.abs(trend).toFixed(1)}% vs mois précédent
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx("w-10 h-10 rounded-xl grid place-items-center shrink-0", t.icon)}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Search, X, MapPinned, Users, Receipt, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const iconFor = {
  lot: MapPinned, client: Users, sale: Receipt, payment: Banknote,
} as const;

const linkFor = (kind: string, id: number) =>
  kind === "lot" ? `/lots/${id}` :
  kind === "client" ? `/clients/${id}` :
  kind === "sale" ? `/sales/${id}` :
  kind === "payment" ? `/payments?focus=${id}` : "/";

interface Result {
  id: number; label: string; sub: string; kind: keyof typeof iconFor;
}

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Record<string, Result[]>>({});
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (q.length < 2) { setData({}); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get("/search/", { params: { q, limit: 6 } });
        setData(r.data.results || {});
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-start justify-center pt-24 bg-slate-900/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          className="w-full max-w-2xl card-glow overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Search size={18} className="text-slate-400" />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher partout dans l'application…"
              className="flex-1 outline-none text-base bg-transparent"
            />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && <div className="p-6 text-sm text-slate-500">Recherche en cours…</div>}
            {!loading && q.length >= 2 && Object.values(data).every((v) => v.length === 0) && (
              <div className="p-6 text-sm text-slate-500">Aucun résultat pour « {q} ».</div>
            )}
            {Object.entries(data).map(([section, items]) =>
              items.length === 0 ? null : (
                <div key={section} className="py-1">
                  <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    {section}
                  </div>
                  {items.map((r) => {
                    const Icon = iconFor[r.kind];
                    return (
                      <button
                        key={`${r.kind}-${r.id}`}
                        onClick={() => { nav(linkFor(r.kind, r.id)); onClose(); }}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition"
                      >
                        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.label}</div>
                          <div className="text-xs text-slate-500 truncate">{r.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ),
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

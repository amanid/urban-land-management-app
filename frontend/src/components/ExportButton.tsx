import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Download, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

/** Bouton d'export avec menu CSV / XLSX (authentifie + telechargement direct). */
export default function ExportButton({ path, filename }: {
  path: string;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function download(format: "csv" | "xlsx") {
    setOpen(false);
    const id = toast.loading(`Préparation de l'export ${format.toUpperCase()}…`);
    try {
      const r = await api.get(path, { params: { type: format }, responseType: "blob" });
      const ct = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv;charset=utf-8";
      const blob = new Blob([r.data], { type: ct });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success(`Téléchargé en ${format.toUpperCase()}.`, { id });
    } catch (e: any) {
      toast.error("Échec de l'export.", { id });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn-secondary">
        <Download size={15} /> Exporter
        <ChevronDown size={13} className="opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-56 card-glow p-1.5 z-20"
          >
            <button onClick={() => download("xlsx")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-emerald-50 text-left">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              <div>
                <div className="font-semibold">Excel (.xlsx)</div>
                <div className="text-[10px] text-slate-400">Recommandé · entêtes en couleur</div>
              </div>
            </button>
            <button onClick={() => download("csv")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 text-left">
              <FileText size={18} className="text-blue-600" />
              <div>
                <div className="font-semibold">CSV (.csv)</div>
                <div className="text-[10px] text-slate-400">Universel, brut</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

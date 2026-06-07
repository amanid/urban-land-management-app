import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "warning" | "info";
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

/** Demande une justification ecrite obligatoire avant une action sensible. */
export default function ReasonModal({
  title, description, confirmLabel = "Confirmer",
  tone = "warning", onClose, onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const trimmed = reason.trim();
  const ok = trimmed.length >= 5;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="card-glow w-full max-w-md p-6"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
            tone === "danger" ? "bg-rose-100 text-rose-700" :
            tone === "warning" ? "bg-amber-100 text-amber-700" :
            "bg-brand-100 text-brand-700"
          }`}>
            <ShieldAlert size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>

        <div className="mt-5">
          <label className="label">Motif (obligatoire pour traçabilité)</label>
          <textarea
            className="input min-h-[110px]" autoFocus
            placeholder="Expliquez précisément la raison de cette opération…"
            value={reason} onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Cette justification est enregistrée dans le journal d'audit et ne peut pas être effacée.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={async () => {
              if (!ok || pending) return;
              setPending(true);
              try { await onConfirm(trimmed); } finally { setPending(false); }
            }}
            disabled={!ok || pending}
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
          >
            {pending ? "En cours…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

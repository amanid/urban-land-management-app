import { motion } from "framer-motion";

export default function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <motion.svg
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        width={size} height={size} viewBox="0 0 64 64" fill="none"
        aria-label="Urban Land logo"
      >
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="55%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="lg2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#lg1)" />
        <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="rgba(255,255,255,0.2)" />
        <path d="M6 50 L58 50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeDasharray="2 3" />
        <path d="M10 50 L10 38 L24 38 L24 50 Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.4" />
        <path d="M26 50 L26 30 L42 30 L42 50 Z" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="1.4" />
        <path d="M44 50 L44 34 L54 34 L54 50 Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.4" />
        <circle cx="34" cy="20" r="6.5" fill="url(#lg2)" />
        <circle cx="34" cy="20" r="2.5" fill="#1d4ed8" />
        <path d="M34 26.5 L34 30" stroke="url(#lg2)" strokeWidth="2" strokeLinecap="round" />
      </motion.svg>
      {withText && (
        <div className="leading-tight">
          <div className="font-display font-extrabold text-[16px] tracking-tight gradient-text">Urban Land</div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400 font-bold">Solutions Patrimoniales</div>
        </div>
      )}
    </div>
  );
}

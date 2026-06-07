import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Loader2, Mail, Lock, ArrowRight, ShieldCheck, MapPinned,
  Banknote, BarChart3, Sparkles, Globe2,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
      const r = await axios.post(`${apiBase}/api/v1/auth/login/`, { email, password });
      setSession(r.data.user, r.data.access, r.data.refresh);
      toast.success(`Bienvenue ${r.data.user.full_name || r.data.user.email}`);
      nav("/");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Identifiants invalides. Veuillez réessayer.");
    } finally { setLoading(false); }
  }

  const features = [
    { icon: MapPinned, label: "Cartographie & géolocalisation" },
    { icon: Banknote, label: "Paiements comptant ou échelonnés" },
    { icon: ShieldCheck, label: "Anti-fraude par chaîne d'empreintes" },
    { icon: BarChart3, label: "Pilotage analytique en temps réel" },
    { icon: Sparkles, label: "Reçus & contrats certifiés" },
    { icon: Globe2, label: "Accès multi-utilisateurs sécurisé" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* HERO ----------------------------------------------------------- */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-grad-dark text-white relative overflow-hidden">
        {/* Animated blobs */}
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent-500/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand-500/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.06]"
             style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Suite professionnelle · Opérateurs fonciers
            </div>
            <h1 className="mt-5 text-5xl font-display font-extrabold leading-[1.05] tracking-tight">
              Maîtrisez votre patrimoine.<br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-400">Accélérez votre croissance.</span>
            </h1>
            <p className="mt-5 text-lg text-white/75 leading-relaxed">
              L'écosystème métier complet pour structurer votre offre foncière,
              piloter vos transactions et sécuriser vos opérations.
              La solution adoptée par les opérateurs de référence.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.06] border border-white/[0.08] backdrop-blur"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500/60 to-accent-500/60 grid place-items-center shrink-0">
                  <f.icon size={16} className="text-white" />
                </div>
                <div className="text-sm font-medium text-white/90 leading-tight">{f.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/40">
          <div>© 2026 Urban Land · Tous droits réservés</div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} /> Conforme RGPD · ISO 27001
          </div>
        </div>
      </div>

      {/* FORM ----------------------------------------------------------- */}
      <div className="flex-1 flex items-center justify-center p-6 bg-grad-soft relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent-200/40 blur-3xl" />

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md card-glow p-8 relative z-10"
        >
          <div className="lg:hidden mb-6"><Logo /></div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
            Espace sécurisé
          </div>
          <h2 className="text-3xl font-display font-extrabold tracking-tight">Bienvenue</h2>
          <p className="text-sm text-slate-500 mt-1.5">Identifiez-vous pour accéder à votre tableau de bord.</p>

          <div className="mt-7 space-y-4">
            <div>
              <label className="label">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="input pl-10" type="email" required autoComplete="email"
                  placeholder="prenom.nom@entreprise.ci"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="label !mb-0">Mot de passe</span>
                <button type="button" className="text-xs text-brand-700 font-semibold hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="input pl-10" type="password" required autoComplete="current-password"
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-7 !py-3 text-base">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            Se connecter
          </button>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={12} className="text-emerald-600" />
            Connexion chiffrée · Sessions surveillées · Conformité bancaire
          </div>
        </motion.form>
      </div>
    </div>
  );
}

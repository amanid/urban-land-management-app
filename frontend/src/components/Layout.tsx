import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MapPinned, Users, Receipt, Banknote,
  ShieldCheck, BarChart3, LogOut, Bell, Search, ChevronDown,
  KeyRound, User as UserIcon, Briefcase, Crown, Award, Sun, Moon, Database, BookOpen,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/hooks/useTheme";
import { Capability, ROLE_BADGE, ROLE_FR } from "@/lib/permissions";
import { useCapability } from "@/hooks/useCan";
import GlobalSearch from "@/components/GlobalSearch";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  capability: Capability;
  exact?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, capability: "view_sales", exact: true },
  { to: "/lots", label: "Catalogue de lots", icon: MapPinned, capability: "view_lots" },
  { to: "/clients", label: "Clients", icon: Users, capability: "view_clients" },
  { to: "/sales", label: "Ventes", icon: Receipt, capability: "view_sales" },
  { to: "/payments", label: "Versements", icon: Banknote, capability: "view_payments" },
  { to: "/acquisitions", label: "Achats fonciers", icon: Briefcase, capability: "view_acquisitions" },
  { to: "/guide", label: "Guide d'utilisation", icon: BookOpen, capability: "view_lots" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/analytics", label: "Analytics avancés", icon: BarChart3, capability: "view_advanced_analytics" },
  { to: "/performance", label: "Performance équipe", icon: Award, capability: "view_user_performance" },
  { to: "/users", label: "Utilisateurs", icon: Users, capability: "view_users" },
  { to: "/audit", label: "Audit & intégrité", icon: ShieldCheck, capability: "view_audit_log" },
  { to: "/maintenance", label: "Maintenance", icon: Database, capability: "wipe_test_data" },
];

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  // Keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: notif } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => (await api.get("/notifications/unread/")).data,
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-grad-soft">
      <div className="flex">
        {/* SIDEBAR -------------------------------------------------------- */}
        <aside className="w-64 shrink-0 min-h-screen border-r border-slate-200/70 bg-white/70 backdrop-blur-xl sticky top-0 h-screen p-4 flex flex-col">
          <div className="px-2 py-2 mb-4"><Logo /></div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            <NavSection title="Activité">
              {MAIN_NAV.map((item) => <FilteredNavLink key={item.to} item={item} />)}
            </NavSection>

            <NavSection title="Administration" hideIfEmpty>
              {ADMIN_NAV.map((item) => <FilteredNavLink key={item.to} item={item} />)}
            </NavSection>
          </nav>

          {/* User card sticky bottom */}
          <UserCard />
        </aside>

        {/* MAIN ---------------------------------------------------------- */}
        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-slate-200/70">
            <div className="flex items-center gap-3 px-6 h-16">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex-1 max-w-xl flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-sm text-slate-500 transition group"
              >
                <Search size={16} className="group-hover:text-brand-600" />
                Rechercher partout : lots, clients, ventes, reçus…
                <kbd className="ml-auto text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono">Ctrl + K</kbd>
              </button>

              <ThemeToggle />
              <NotificationBell count={notif?.count || 0} />
              <ProfileDropdown />
            </div>
          </header>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function NavSection({ title, hideIfEmpty, children }: { title: string; hideIfEmpty?: boolean; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : [children];
  const hasVisible = arr.some((c: any) => c && c.props?.visible !== false);
  if (hideIfEmpty && !hasVisible) return null;
  return (
    <div>
      <div className="px-3 mb-2 mt-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold">{title}</div>
      {children}
    </div>
  );
}

function FilteredNavLink({ item }: { item: NavItem }) {
  const allowed = useCapability(item.capability);
  if (!allowed) return null;
  return (
    <NavLink
      to={item.to} end={item.exact}
      className={({ isActive }) => isActive ? "nav-item-active" : "nav-item"}
    >
      <item.icon size={18} />
      {item.label}
    </NavLink>
  );
}

function UserCard() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 rounded-xl bg-grad-brand text-white grid place-items-center font-bold shadow-glow">
          {user.full_name?.slice(0, 1).toUpperCase() || "U"}
          {user.role === "super_admin" && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 grid place-items-center shadow-md">
              <Crown size={11} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{user.full_name || user.email}</div>
          <div className="text-[11px] text-slate-500 truncate">{ROLE_FR[user.role]}</div>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} className="relative p-2.5 rounded-xl hover:bg-slate-100 transition"
            title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}>
      {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
    </button>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <button className="relative p-2.5 rounded-xl hover:bg-slate-100 transition" title="Notifications">
      <Bell size={18} className="text-slate-600" />
      {count > 0 && (
        <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] grid place-items-center ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

function ProfileDropdown() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;
  const initial = user.full_name?.slice(0, 1).toUpperCase() || "U";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition"
      >
        <div className="w-8 h-8 rounded-lg bg-grad-brand text-white grid place-items-center font-bold text-sm shadow-glow">{initial}</div>
        <div className="hidden md:block text-left leading-tight">
          <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{user.full_name}</div>
          <div className="text-[10px] text-slate-500">{ROLE_FR[user.role]}</div>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-64 card-glow p-2 z-30"
          >
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="text-sm font-semibold">{user.full_name || user.email}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
              <span className={clsx("mt-1.5 inline-block", ROLE_BADGE[user.role])}>{ROLE_FR[user.role]}</span>
            </div>
            <button onClick={() => { nav("/profile"); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
              <UserIcon size={15} /> Mon profil
            </button>
            <button onClick={() => { nav("/profile?tab=password"); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
              <KeyRound size={15} /> Changer le mot de passe
            </button>
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button onClick={() => { logout(); nav("/login"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50">
                <LogOut size={15} /> Déconnexion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

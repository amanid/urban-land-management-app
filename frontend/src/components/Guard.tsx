import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCapability } from "@/hooks/useCan";
import { Capability } from "@/lib/permissions";
import { Lock } from "lucide-react";

interface GuardProps {
  capability: Capability;
  children: ReactNode;
}

/** Bloque l'acces a une route si la capacite n'est pas detenue. */
export default function Guard({ capability, children }: GuardProps) {
  const allowed = useCapability(capability);
  if (allowed) return <>{children}</>;
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="card-glow p-8 max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 grid place-items-center mb-4">
          <Lock size={24} />
        </div>
        <h2 className="text-xl font-display font-bold">Accès restreint</h2>
        <p className="text-sm text-slate-500 mt-2">
          Votre profil n'a pas les privilèges nécessaires pour consulter cette section.
          Contactez un administrateur si vous pensez que c'est une erreur.
        </p>
        <Navigate to="/" replace />
      </div>
    </div>
  );
}

import { ReactNode } from "react";
import { useCapability } from "@/hooks/useCan";
import { Capability } from "@/lib/permissions";

interface CanProps {
  capability: Capability;
  fallback?: ReactNode;
  children: ReactNode;
}

/** Affiche `children` uniquement si l'utilisateur connecte detient `capability`. */
export default function Can({ capability, fallback = null, children }: CanProps) {
  const allowed = useCapability(capability);
  return <>{allowed ? children : fallback}</>;
}

import { useAuthStore } from "@/store/auth";
import { Capability, roleCan } from "@/lib/permissions";

/** Hook ergonomique : `const can = useCan(); can("manage_lots")`. */
export function useCan() {
  const role = useAuthStore((s) => s.user?.role);
  return (capability: Capability) => roleCan(role, capability);
}

/** Helper one-shot : `useCapability("manage_lots") -> boolean`. */
export function useCapability(capability: Capability): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return roleCan(role, capability);
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { queryKeys } from "./queries/query-keys";

type AppRole = Database["public"]["Enums"]["app_role"];

const STAFF_ROLES: AppRole[] = ["admin", "manager", "analyste_senior", "analyste"];

function useSessionUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, loading };
}

/** Rôles de l'utilisateur courant, lus depuis user_roles (policy: chacun lit les siens). */
export function useUserRoles() {
  const { userId, loading: sessionLoading } = useSessionUserId();
  const query = useQuery({
    queryKey: queryKeys.userRoles(userId),
    queryFn: async () => {
      if (!userId) return [] as AppRole[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
    enabled: !sessionLoading,
    staleTime: 60_000,
  });

  return {
    roles: query.data ?? [],
    isLoading: sessionLoading || query.isLoading,
    error: query.error,
  };
}

export function useIsAdmin() {
  const { roles, isLoading } = useUserRoles();
  return { isAdmin: roles.includes("admin"), isLoading };
}

/** staff = admin | manager | analyste_senior | analyste (miroir de is_staff() côté DB). */
export function useIsStaff() {
  const { roles, isLoading } = useUserRoles();
  return { isStaff: roles.some((r) => STAFF_ROLES.includes(r)), isLoading };
}

export function useHasRole(role: AppRole) {
  const { roles, isLoading } = useUserRoles();
  return { hasRole: roles.includes(role), isLoading };
}

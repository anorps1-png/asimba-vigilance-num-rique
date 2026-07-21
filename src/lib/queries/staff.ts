import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { queryKeys } from "./query-keys";

type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// === NOTIFICATIONS ===
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(undefined),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("destinataire_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 10_000,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: [...queryKeys.notifications(undefined), "unread"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("destinataire_id", user.id)
        .eq("lu", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ lu: true, lu_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(undefined) });
    },
  });
}

// === INSTITUTIONS ===
export function useInstitutions() {
  return useQuery({
    queryKey: queryKeys.institutions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("statut", "actif")
        .order("nom");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"institutions">) => {
      const { data, error } = await supabase
        .from("institutions")
        .insert([values])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions() });
    },
  });
}

// === ARTICLES ===
export function useArticles(published = true) {
  return useQuery({
    queryKey: queryKeys.articles({ published }),
    queryFn: async () => {
      let query = supabase.from("articles").select("*");
      if (published) query = query.eq("publie", true);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

// === CATEGORIES ===
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

// === IA CONFIG ===
// Table singleton (id=1) : aucune migration ne garantit la présence de la ligne,
// maybeSingle() évite un crash tant qu'elle n'a pas été créée (voir seed.sql).
export function useIaConfig() {
  return useQuery({
    queryKey: queryKeys.iaConfig(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 120_000,
  });
}

// Pas de policy INSERT sur ia_config (update admin uniquement) : la ligne id=1
// doit exister au préalable (voir seed.sql / migration dédiée), sinon 0 ligne affectée.
export function useUpdateIaConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesUpdate<"ia_config">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("ia_config")
        .update({ ...values, updated_by: user.id })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.iaConfig() });
    },
  });
}

export function useIaModeles() {
  return useQuery({
    queryKey: queryKeys.iaModeles(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_modeles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 120_000,
  });
}

// === PREFERENCES ===
export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences(undefined),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("preferences_utilisateur")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

// Pas de trigger d'auto-création à l'inscription : upsert pour créer la ligne au premier enregistrement.
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesUpdate<"preferences_utilisateur">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("preferences_utilisateur")
        .upsert({ user_id: user.id, ...values }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences(undefined) });
    },
  });
}

// === PROFILE ===
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(undefined),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, telephone, fonction, langue, avatar_url, institution_id, institutions(nom)")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return { ...data, email: user.email ?? null };
    },
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesUpdate<"profiles">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("profiles").update(values).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(undefined) });
    },
  });
}

// === AUDIT LOGS ===
export function useAuditLogs(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: async () => {
      let query = supabase.from("audit_logs").select("*");

      // Apply filters if provided
      if (filters.action)
        query = query.eq("action", filters.action as Database["public"]["Enums"]["audit_action"]);
      if (filters.niveau)
        query = query.eq("niveau", filters.niveau as Database["public"]["Enums"]["audit_niveau"]);
      if (filters.acteur_id) query = query.eq("acteur_id", filters.acteur_id as string);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5_000,
  });
}

// === UTILISATEURS (PROFILES + USER_ROLES) ===
export function useUtilisateurs() {
  return useQuery({
    queryKey: queryKeys.utilisateurs(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, institution_id, institutions(nom, sigle)")
        .returns<
          Array<{
            id: string;
            full_name: string | null;
            institution_id: string | null;
            institutions: { nom: string; sigle: string } | null;
          }>
        >();

      if (error) throw error;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesByUser = new Map<string, AppRole[]>();
      (roles || []).forEach((r) => {
        const list = rolesByUser.get(r.user_id) || [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });

      const highestRole = (userId: string): AppRole => {
        const userRoles = rolesByUser.get(userId) || [];
        return ROLE_PRIORITY.find((r) => userRoles.includes(r)) ?? "citoyen";
      };

      return (data || []).map((p) => ({
        ...p,
        user_id: p.id,
        role: highestRole(p.id),
      }));
    },
    staleTime: 30_000,
  });
}

// === FACT CHECKS ===
export function useFactChecks(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.factChecks(filters),
    queryFn: async () => {
      let query = supabase.from("fact_checks").select("*");

      if (filters.publie) query = query.eq("publie", filters.publie as boolean);
      if (filters.verdict)
        query = query.eq(
          "verdict",
          filters.verdict as Database["public"]["Enums"]["factcheck_verdict"],
        );

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 10_000,
  });
}

export function useCreateFactCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"fact_checks">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("fact_checks")
        .insert([{ ...values, auteur_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factChecks({}) });
    },
  });
}

export function useUpdateFactCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & TablesUpdate<"fact_checks">) => {
      const { error } = await supabase.from("fact_checks").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factChecks({}) });
    },
  });
}

// === ROLES ===
export type AppRole = Database["public"]["Enums"]["app_role"];

// Ordre de priorité décroissant, doit rester cohérent avec is_staff()/is_admin() en base.
export const ROLE_PRIORITY: AppRole[] = [
  "admin",
  "manager",
  "analyste_senior",
  "analyste",
  "institution",
  "citoyen",
];
const STAFF_ROLES: AppRole[] = ["admin", "manager", "analyste_senior", "analyste"];

export function useUserRoles() {
  return useQuery({
    queryKey: queryKeys.userRoles(undefined),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.role);
    },
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const { data } = useUserRoles();
  return !!data?.includes("admin");
}

export function useIsStaff() {
  const { data } = useUserRoles();
  return !!data?.some((r) => STAFF_ROLES.includes(r));
}

// === USER ROLES COUNT ===
export function useUserRolesCount() {
  return useQuery({
    queryKey: queryKeys.userRoles("count"),
    queryFn: async () => {
      const { data: allRoles, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;

      const counts: Record<AppRole, number> = {
        admin: 0,
        manager: 0,
        analyste_senior: 0,
        analyste: 0,
        institution: 0,
        citoyen: 0,
      };
      (allRoles || []).forEach((r) => {
        counts[r.role]++;
      });
      return counts;
    },
    staleTime: 60_000,
  });
}

// === API KEYS ===
export function useApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, nom, cle_apercu, created_at, revoked_at")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

async function sha256Hex(text: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nom: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const randomBytes = crypto.getRandomValues(new Uint8Array(24));
      const secret = Array.from(randomBytes, (b) => b.toString(16).padStart(2, "0")).join("");
      const plaintext = `asmb_live_${secret}`;
      const cle_hash = await sha256Hex(plaintext);
      const cle_apercu = `${plaintext.slice(0, 14)}_••••••••••••${plaintext.slice(-4)}`;

      const { data, error } = await supabase
        .from("api_keys")
        .insert([{ nom, cle_hash, cle_apercu, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      return { ...data, plaintext };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() });
    },
  });
}

// === INTEGRATIONS ===
export function useIntegrations() {
  return useQuery({
    queryKey: queryKeys.integrations(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .order("nom");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase
        .from("integrations")
        .update({ actif })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations() });
    },
  });
}

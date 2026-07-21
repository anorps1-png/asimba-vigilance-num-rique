import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { queryKeys } from "./query-keys";

type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type AlertesFilters = {
  region?: string;
  categorie?: Database["public"]["Enums"]["signalement_categorie"];
  severite?: Database["public"]["Enums"]["alerte_severite"];
  statut?: Database["public"]["Enums"]["alerte_statut"];
  search?: string;
  limit?: number;
};

/** Liste dénormalisée alertes+signalements+fact_checks, pour dashboard/liste/carte/statistiques. */
export function useAlertesDashboard(filters: AlertesFilters = {}) {
  return useQuery({
    queryKey: queryKeys.alertesDashboard(filters),
    queryFn: async () => {
      let query = supabase
        .from("v_alertes_dashboard")
        .select("*")
        .order("detecte", { ascending: false });
      if (filters.region) query = query.eq("region", filters.region);
      if (filters.categorie) query = query.eq("categorie", filters.categorie);
      if (filters.severite) query = query.eq("severite", filters.severite);
      if (filters.statut) query = query.eq("statut", filters.statut);
      if (filters.search) query = query.ilike("titre", `%${filters.search}%`);
      if (filters.limit) query = query.limit(filters.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: queryKeys.dashboardKpis(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_kpis");
      if (error) throw error;
      return data?.[0] ?? null;
    },
    staleTime: 30_000,
  });
}

/** Évolution quotidienne des alertes par sévérité (graphique dashboard). */
export function useAlertesEvolution(jours = 7) {
  return useQuery({
    queryKey: queryKeys.alertesEvolution(jours),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_alertes_evolution", { jours });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useRegionsStats() {
  return useQuery({
    queryKey: queryKeys.regionsStats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_regions_stats")
        .select("*")
        .order("total", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCategoriesStats() {
  return useQuery({
    queryKey: queryKeys.categoriesStats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_categories_stats")
        .select("*")
        .order("total", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useSourcesStats() {
  return useQuery({
    queryKey: queryKeys.sourcesStats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_sources_stats")
        .select("*")
        .order("total", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useTopAnalystes() {
  return useQuery({
    queryKey: queryKeys.topAnalystes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_top_analystes")
        .select("*")
        .order("total_traites", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

/** Alerte détaillée par ID. */
export function useGetAlert(id: string) {
  return useQuery({
    queryKey: ["alertes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

/** Assigne l'alerte à l'utilisateur actuellement connecté. */
export function useAssignAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("alertes")
        .update({ assignee_id: user.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertesDashboard({}) });
    },
  });
}

export function useCloseAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alertes")
        .update({ statut: "resolu" as const, resolue_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertesDashboard({}) });
    },
  });
}

export function usePublishAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fact_checks")
        .update({ publie: true, publie_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.factChecks({}) });
    },
  });
}

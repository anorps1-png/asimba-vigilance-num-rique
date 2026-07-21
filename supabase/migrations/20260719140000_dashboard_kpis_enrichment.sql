-- Enrichit get_dashboard_kpis() (deltas semaine/semaine, temps moyen réel, confiance IA réelle)
-- et ajoute get_alertes_evolution() pour le graphique d'évolution du dashboard.
-- Aucune métrique fabriquée : les champs sans source de vérité restent NULL.

CREATE OR REPLACE FUNCTION public.pct_delta(courant bigint, precedent bigint)
RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN precedent IS NULL OR precedent = 0 THEN NULL
    ELSE round(((courant - precedent)::numeric / precedent) * 100, 1)
  END;
$$;

DROP FUNCTION IF EXISTS public.get_dashboard_kpis();

CREATE FUNCTION public.get_dashboard_kpis()
RETURNS TABLE (
  alertes_totales bigint,
  alertes_totales_delta_pct numeric,
  critiques bigint,
  critiques_delta_pct numeric,
  en_cours bigint,
  en_cours_delta_pct numeric,
  resolues bigint,
  resolues_delta_pct numeric,
  temps_moyen_secondes numeric,
  confiance_ia_moyenne numeric,
  signalements_jour bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH courante AS (
    SELECT * FROM public.alertes WHERE created_at >= now() - interval '7 days'
  ), precedente AS (
    SELECT * FROM public.alertes
    WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days'
  )
  SELECT
    (SELECT count(*) FROM public.alertes),
    public.pct_delta((SELECT count(*) FROM courante), (SELECT count(*) FROM precedente)),
    (SELECT count(*) FROM public.alertes WHERE severite = 'critique'),
    public.pct_delta(
      (SELECT count(*) FROM courante WHERE severite = 'critique'),
      (SELECT count(*) FROM precedente WHERE severite = 'critique')
    ),
    (SELECT count(*) FROM public.alertes WHERE statut = 'en_cours'),
    public.pct_delta(
      (SELECT count(*) FROM courante WHERE statut = 'en_cours'),
      (SELECT count(*) FROM precedente WHERE statut = 'en_cours')
    ),
    (SELECT count(*) FROM public.alertes WHERE statut IN ('resolu','clos')),
    public.pct_delta(
      (SELECT count(*) FROM courante WHERE statut IN ('resolu','clos')),
      (SELECT count(*) FROM precedente WHERE statut IN ('resolu','clos'))
    ),
    (SELECT avg(extract(epoch FROM resolue_at - created_at)) FROM public.alertes WHERE resolue_at IS NOT NULL),
    (SELECT avg(confiance) FROM public.fact_checks WHERE confiance IS NOT NULL),
    (SELECT count(*) FROM public.signalements WHERE created_at >= now() - interval '1 day');
$$;

-- Évolution quotidienne des alertes par sévérité, pour le graphique du dashboard.
CREATE OR REPLACE FUNCTION public.get_alertes_evolution(jours integer DEFAULT 7)
RETURNS TABLE (
  jour date,
  critiques bigint,
  elevees bigint,
  moyennes bigint,
  faibles bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    d::date AS jour,
    count(*) FILTER (WHERE a.severite = 'critique'),
    count(*) FILTER (WHERE a.severite = 'elevee'),
    count(*) FILTER (WHERE a.severite = 'moyenne'),
    count(*) FILTER (WHERE a.severite = 'faible')
  FROM generate_series(
    (now() - (greatest(jours, 1) - 1) * interval '1 day')::date,
    now()::date,
    interval '1 day'
  ) AS d
  LEFT JOIN public.alertes a ON a.created_at::date = d::date
  GROUP BY d
  ORDER BY d;
$$;

GRANT EXECUTE ON FUNCTION public.pct_delta(bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_alertes_evolution(integer) TO authenticated;

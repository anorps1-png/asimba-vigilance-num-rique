-- ============================================================================
-- Phase 1a-1e (chantier "app entièrement fonctionnelle, sans mock") :
--
-- Constats de l'introspection (lecture seule) de fnopojzqbpicldxemhho :
--  - signalements/alertes/fact_checks/profiles/user_roles sont TOUTES VIDES
--    (0 ligne) : aucune conversion de données à risque dans cette migration.
--  - `anon` avait DELETE/UPDATE/TRUNCATE/REFERENCES/TRIGGER sur les 5 tables
--    (héritage du schéma d'origine). RLS masque l'essentiel en pratique,
--    mais TRUNCATE contourne totalement la RLS : durci ci-dessous.
--  - La policy INSERT actuelle sur signalements ("citoyen cree signalement",
--    WITH CHECK auth.uid() = auteur_id) rend TOUTE soumission anonyme
--    impossible : ni anon (auth.uid() est NULL), ni un citoyen connecté qui
--    choisit "anonyme" (auteur_id NULL) ne peuvent jamais passer ce check.
--  - alertes et fact_checks n'ont AUCUNE policy INSERT : personne ne peut
--    créer de dossier ni de fact-check actuellement.
--  - alertes.statut/signalements.statut sont du texte libre non contraint
--    (défauts 'ouverte'/'nouveau' sans rapport avec le vocabulaire attendu
--    par l'UI) : converti en enum, table vide donc sans risque.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Durcissement des GRANTs
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.signalements, public.alertes, public.fact_checks,
             public.profiles, public.user_roles
  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signalements TO authenticated;
GRANT INSERT ON public.signalements TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fact_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- ---------------------------------------------------------------------------
-- 1) Fonction utilitaire updated_at (aucun trigger n'existe encore en prod
--    malgré ce que suggéraient les migrations fantômes du 14/07)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------------------------------------------------------------------------
-- 2) profiles : colonnes manquantes pour Paramètres (profil complet)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fonction text,
  ADD COLUMN IF NOT EXISTS langue text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) signalements : combler l'écart avec l'UI riche
-- ---------------------------------------------------------------------------
CREATE TYPE public.signalement_type AS ENUM ('lien','image','video','audio','texte','document');
CREATE TYPE public.signalement_categorie AS ENUM (
  'violence','desinformation','harcelement','escroquerie','enfance',
  'haine','atteintes_sexuelles','cybercriminalite','autre'
);
CREATE TYPE public.signalement_confidentialite AS ENUM ('anonyme','restreint','identifie');
CREATE TYPE public.signalement_statut AS ENUM ('nouveau','en_analyse','verifie','rejete','cloture');

ALTER TABLE public.signalements
  ADD COLUMN IF NOT EXISTS type public.signalement_type,
  ADD COLUMN IF NOT EXISTS categorie public.signalement_categorie,
  ADD COLUMN IF NOT EXISTS titre text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS ville text,
  ADD COLUMN IF NOT EXISTS pays text NOT NULL DEFAULT 'Cameroun',
  ADD COLUMN IF NOT EXISTS gps_lat double precision,
  ADD COLUMN IF NOT EXISTS gps_lng double precision,
  ADD COLUMN IF NOT EXISTS confidentialite public.signalement_confidentialite NOT NULL DEFAULT 'anonyme',
  ADD COLUMN IF NOT EXISTS suivi_email text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS preuves jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- statut : texte libre -> enum (table vide, conversion directe). Une
-- CHECK constraint préexistante (signalements_statut_check, vocabulaire
-- nouveau/en_analyse/traite/archive) doit être retirée avant la conversion.
ALTER TABLE public.signalements DROP CONSTRAINT IF EXISTS signalements_statut_check;
ALTER TABLE public.signalements ALTER COLUMN statut DROP DEFAULT;
ALTER TABLE public.signalements
  ALTER COLUMN statut TYPE public.signalement_statut
  USING (
    CASE statut
      WHEN 'nouveau' THEN 'nouveau'
      WHEN 'en_analyse' THEN 'en_analyse'
      WHEN 'traite' THEN 'verifie'
      WHEN 'archive' THEN 'cloture'
      WHEN 'verifie' THEN 'verifie'
      WHEN 'rejete' THEN 'rejete'
      WHEN 'cloture' THEN 'cloture'
      ELSE 'nouveau'
    END::public.signalement_statut
  );
ALTER TABLE public.signalements ALTER COLUMN statut SET DEFAULT 'nouveau';

-- référence lisible générée automatiquement, ex. S-2026-000123
CREATE SEQUENCE IF NOT EXISTS public.signalement_reference_seq;
CREATE OR REPLACE FUNCTION public.generate_signalement_reference()
RETURNS text LANGUAGE sql AS $$
  SELECT 'S-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('public.signalement_reference_seq')::text, 6, '0');
$$;
GRANT USAGE ON SEQUENCE public.signalement_reference_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_signalement_reference() TO anon, authenticated;

ALTER TABLE public.signalements ALTER COLUMN reference SET DEFAULT public.generate_signalement_reference();
UPDATE public.signalements SET reference = public.generate_signalement_reference() WHERE reference IS NULL;
ALTER TABLE public.signalements ALTER COLUMN reference SET NOT NULL;
ALTER TABLE public.signalements DROP CONSTRAINT IF EXISTS signalements_reference_key;
ALTER TABLE public.signalements ADD CONSTRAINT signalements_reference_key UNIQUE (reference);

DROP TRIGGER IF EXISTS trg_signalements_updated ON public.signalements;
CREATE TRIGGER trg_signalements_updated BEFORE UPDATE ON public.signalements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policies INSERT : remplace le check cassé (auth.uid() = auteur_id, qui
-- interdisait toute soumission anonyme) par anon/authenticated séparés,
-- permettant auteur_id NULL dans les deux cas (choix "anonyme").
DROP POLICY IF EXISTS "citoyen cree signalement" ON public.signalements;
CREATE POLICY "signalements_insert_anon" ON public.signalements
  FOR INSERT TO anon
  WITH CHECK (auteur_id IS NULL);
CREATE POLICY "signalements_insert_auth" ON public.signalements
  FOR INSERT TO authenticated
  WITH CHECK (auteur_id IS NULL OR auteur_id = auth.uid());

-- Consolide la policy legacy "admin lit tous signalements" (dépendait de
-- profiles.role en dur) dans signalements_select_staff (is_staff/is_admin
-- via user_roles), + parité avec alertes_select_staff (accès institution).
DROP POLICY IF EXISTS "admin lit tous signalements" ON public.signalements;
DROP POLICY IF EXISTS "signalements_select_staff" ON public.signalements;
CREATE POLICY "signalements_select_staff" ON public.signalements
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) OR has_role(auth.uid(), 'institution'));

-- ---------------------------------------------------------------------------
-- 4) alertes : dossier opérationnel du personnel
-- ---------------------------------------------------------------------------
CREATE TYPE public.alerte_severite AS ENUM ('info','faible','moyenne','elevee','critique');
CREATE TYPE public.alerte_propagation AS ENUM ('tres_rapide','rapide','moderee','lente');
CREATE TYPE public.alerte_statut AS ENUM ('nouveau','en_cours','assigne','resolu','clos');

ALTER TABLE public.alertes
  ADD COLUMN IF NOT EXISTS titre text,
  ADD COLUMN IF NOT EXISTS severite public.alerte_severite NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS categorie public.signalement_categorie,
  ADD COLUMN IF NOT EXISTS resume text,
  ADD COLUMN IF NOT EXISTS recommandation text,
  ADD COLUMN IF NOT EXISTS propagation public.alerte_propagation,
  ADD COLUMN IF NOT EXISTS mots_cles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resolue_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- backfill sévérité depuis l'ancienne colonne texte "niveau" (table vide
-- actuellement, mapping conservé pour toute donnée future importée)
UPDATE public.alertes SET severite = (
  CASE lower(coalesce(niveau, ''))
    WHEN 'critique' THEN 'critique'
    WHEN 'critical' THEN 'critique'
    WHEN 'elevee' THEN 'elevee'
    WHEN 'eleve' THEN 'elevee'
    WHEN 'high' THEN 'elevee'
    WHEN 'moyenne' THEN 'moyenne'
    WHEN 'moyen' THEN 'moyenne'
    WHEN 'medium' THEN 'moyenne'
    WHEN 'faible' THEN 'faible'
    WHEN 'low' THEN 'faible'
    ELSE 'info'
  END
)::public.alerte_severite
WHERE niveau IS NOT NULL;

ALTER TABLE public.alertes DROP CONSTRAINT IF EXISTS alertes_statut_check;
ALTER TABLE public.alertes DROP CONSTRAINT IF EXISTS alertes_niveau_check;
ALTER TABLE public.alertes ALTER COLUMN statut DROP DEFAULT;
ALTER TABLE public.alertes
  ALTER COLUMN statut TYPE public.alerte_statut
  USING (
    CASE statut
      WHEN 'ouverte' THEN 'nouveau'
      WHEN 'nouveau' THEN 'nouveau'
      WHEN 'en_cours' THEN 'en_cours'
      WHEN 'assigne' THEN 'assigne'
      WHEN 'assignee' THEN 'assigne'
      WHEN 'resolu' THEN 'resolu'
      WHEN 'resolue' THEN 'resolu'
      WHEN 'clos' THEN 'clos'
      WHEN 'cloturee' THEN 'clos'
      ELSE 'nouveau'
    END::public.alerte_statut
  );
ALTER TABLE public.alertes ALTER COLUMN statut SET DEFAULT 'nouveau';

DROP TRIGGER IF EXISTS trg_alertes_updated ON public.alertes;
CREATE TRIGGER trg_alertes_updated BEFORE UPDATE ON public.alertes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aucune policy INSERT n'existait : personne ne pouvait créer d'alerte.
CREATE POLICY "alertes_insert_staff" ON public.alertes
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND (created_by IS NULL OR created_by = auth.uid()));

-- ---------------------------------------------------------------------------
-- 5) fact_checks : scoring/verdict
-- ---------------------------------------------------------------------------
CREATE TYPE public.factcheck_verdict AS ENUM ('vrai','faux','trompeur','non_verifiable','en_cours');

ALTER TABLE public.fact_checks
  ADD COLUMN IF NOT EXISTS titre text,
  ADD COLUMN IF NOT EXISTS affirmation text,
  ADD COLUMN IF NOT EXISTS verdict public.factcheck_verdict NOT NULL DEFAULT 'en_cours',
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confiance numeric,
  ADD COLUMN IF NOT EXISTS auteur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS publie boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publie_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_factchecks_updated ON public.fact_checks;
CREATE TRIGGER trg_factchecks_updated BEFORE UPDATE ON public.fact_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aucune policy INSERT n'existait : personne ne pouvait créer de fact-check.
CREATE POLICY "factchecks_insert_staff" ON public.fact_checks
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND (auteur_id IS NULL OR auteur_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 6) Vues dénormalisées (security_invoker : respectent la RLS de l'appelant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_alertes_dashboard
WITH (security_invoker = true) AS
SELECT
  a.id,
  s.reference,
  COALESCE(a.titre, s.titre, left(s.contenu, 80)) AS titre,
  COALESCE(s.description, s.contenu) AS extrait,
  COALESCE(a.categorie, s.categorie) AS categorie,
  a.severite,
  COALESCE(fc.score_risque_global, 0) AS score,
  COALESCE(fc.confiance, 0) AS confiance,
  a.statut,
  s.plateforme AS source,
  s.langue,
  COALESCE(a.mots_cles, '{}'::text[]) AS mots_cles,
  s.ville,
  s.region,
  a.propagation,
  p.full_name AS analyste,
  a.resume,
  a.recommandation,
  a.created_at AS detecte,
  a.resolue_at,
  a.signalement_id,
  a.assignee_id
FROM public.alertes a
LEFT JOIN public.signalements s ON s.id = a.signalement_id
LEFT JOIN public.fact_checks fc ON fc.signalement_id = s.id
LEFT JOIN public.profiles p ON p.id = a.assignee_id;

CREATE OR REPLACE VIEW public.v_regions_stats
WITH (security_invoker = true) AS
SELECT region, count(*) AS total,
       count(*) FILTER (WHERE severite = 'critique') AS critiques
FROM public.v_alertes_dashboard
WHERE region IS NOT NULL
GROUP BY region;

CREATE OR REPLACE VIEW public.v_categories_stats
WITH (security_invoker = true) AS
SELECT categorie, count(*) AS total
FROM public.v_alertes_dashboard
WHERE categorie IS NOT NULL
GROUP BY categorie;

CREATE OR REPLACE VIEW public.v_sources_stats
WITH (security_invoker = true) AS
SELECT source, count(*) AS total
FROM public.v_alertes_dashboard
WHERE source IS NOT NULL
GROUP BY source;

-- Métrique "score" par analyste omise : aucune source de vérité réelle.
CREATE OR REPLACE VIEW public.v_top_analystes
WITH (security_invoker = true) AS
SELECT
  a.assignee_id,
  p.full_name AS analyste,
  count(*) AS total_traites,
  count(*) FILTER (WHERE a.statut IN ('resolu','clos')) AS total_resolus,
  avg(a.resolue_at - a.created_at) FILTER (WHERE a.resolue_at IS NOT NULL) AS duree_moyenne_resolution
FROM public.alertes a
JOIN public.profiles p ON p.id = a.assignee_id
WHERE a.assignee_id IS NOT NULL
GROUP BY a.assignee_id, p.full_name;

GRANT SELECT ON public.v_alertes_dashboard, public.v_regions_stats,
  public.v_categories_stats, public.v_sources_stats, public.v_top_analystes
  TO authenticated;

-- KPIs dashboard en un seul aller-retour (SECURITY INVOKER : respecte la RLS)
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS TABLE (
  alertes_totales bigint,
  critiques bigint,
  en_cours bigint,
  resolues bigint,
  signalements_jour bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.alertes),
    (SELECT count(*) FROM public.alertes WHERE severite = 'critique'),
    (SELECT count(*) FROM public.alertes WHERE statut = 'en_cours'),
    (SELECT count(*) FROM public.alertes WHERE statut IN ('resolu','clos')),
    (SELECT count(*) FROM public.signalements WHERE created_at >= now() - interval '1 day');
$$;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis() TO authenticated;

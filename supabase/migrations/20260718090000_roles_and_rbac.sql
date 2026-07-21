-- ============================================================================
-- RBAC : rôles utilisateurs + politiques RLS pour le personnel (analystes, etc.)
--
-- Contexte : jusqu'ici aucun rôle n'existait en base. Conséquence, personne ne
-- pouvait lire les signalements à part leur auteur : le workflow analyste était
-- impossible. Cette migration introduit un modèle de rôles et ouvre les accès
-- au personnel, sans jamais exposer les données aux simples citoyens.
-- ============================================================================

-- 1) Enum des rôles (miroir des rôles de la console d'administration)
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'manager',
  'analyste_senior',
  'analyste',
  'institution',
  'citoyen'
);

-- 2) Table d'affectation des rôles (un utilisateur peut cumuler plusieurs rôles)
CREATE TABLE public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Fonctions d'autorisation.
-- SECURITY DEFINER : elles lisent user_roles en contournant la RLS, ce qui évite
-- la récursion infinie (une policy sur user_roles qui interrogerait user_roles).
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- « Personnel » = accès opérationnel aux signalements et au renseignement.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','manager','analyste_senior','analyste')
  );
$$;

-- Ces fonctions sont appelées DANS les policies : le rôle authenticated doit
-- pouvoir les exécuter. On révoque juste l'accès anonyme/public par prudence.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;

-- 4) Policies sur user_roles
--    - chacun lit ses propres rôles (utile côté app pour afficher les droits)
--    - seuls les admins gèrent les rôles (empêche toute auto-élévation)
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_select_admin" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "user_roles_write_admin" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5) Attribution automatique du rôle 'citoyen' à l'inscription.
--    On complète handle_new_user (qui crée déjà le profil).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom_complet)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citoyen')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

-- 6) Ouverture des accès métier au personnel -------------------------------------

-- SIGNALEMENTS : le personnel lit et met à jour tous les signalements.
-- (La policy existante "signalements_select_own" reste : un citoyen identifié
--  continue de voir les siens.)
CREATE POLICY "signalements_select_staff" ON public.signalements
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "signalements_update_staff" ON public.signalements
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "signalements_delete_admin" ON public.signalements
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- PROFILES : les admins peuvent lister tous les profils (gestion utilisateurs).
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ALERTES : on remplace la lecture « tout authentifié » par personnel + institution.
-- Un simple citoyen n'a pas à lire l'ensemble des alertes opérationnelles.
DROP POLICY IF EXISTS "alertes_select_auth" ON public.alertes;
CREATE POLICY "alertes_select_staff" ON public.alertes
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'institution'));
-- Le personnel peut mettre à jour / supprimer n'importe quelle alerte.
CREATE POLICY "alertes_update_staff" ON public.alertes
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "alertes_delete_staff" ON public.alertes
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- FACT_CHECKS : le personnel gère tous les fact-checks (brouillons compris).
CREATE POLICY "factchecks_select_staff" ON public.fact_checks
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "factchecks_update_staff" ON public.fact_checks
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "factchecks_delete_staff" ON public.fact_checks
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- ============================================================================
-- APRÈS MIGRATION : désigner le premier administrateur (aucun admin n'existe
-- encore, donc à faire manuellement via l'éditeur SQL Supabase / service_role) :
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'votre.email@exemple.cm'
--   ON CONFLICT (user_id, role) DO NOTHING;
-- ============================================================================

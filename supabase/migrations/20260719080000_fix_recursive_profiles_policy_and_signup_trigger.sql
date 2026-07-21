-- ============================================================================
-- Correctifs découverts en production sur fnopojzqbpicldxemhho :
--
-- 1) La policy "admin lit tous profils" sur public.profiles se référence
--    elle-même (sous-requête SELECT ... FROM profiles WITHIN a policy ON
--    profiles), ce qui provoque une récursion infinie Postgres (42P17) sur
--    TOUTE requête touchant profiles (et donc signalements, qui en dépend).
--    On la remplace par une fonction SECURITY DEFINER (contourne la RLS en
--    interne, casse la récursion), même sémantique (admin ou
--    institution_partenaire lisent tous les profils).
--
-- 2) handle_new_user() (recréée par la migration RBAC du 2026-07-18)
--    insérait dans des colonnes qui n'existent pas sur ce projet
--    (profiles.email, profiles.nom_complet) : le schéma réel utilise
--    full_name (pas de colonne email sur profiles). Corrigé pour matcher
--    le schéma réel.
--
-- 3) Le trigger on_auth_user_created n'existe pas sur auth.users sur ce
--    projet (jamais créé) : handle_new_user() n'était donc jamais appelée,
--    et aucun nouvel inscrit ne recevait de ligne profiles ni le rôle
--    'citoyen'. On (re)crée le trigger.
-- ============================================================================

-- 1) Policy profiles non-récursive
CREATE OR REPLACE FUNCTION public.is_profile_admin_or_partner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = ANY (ARRAY['admin', 'institution_partenaire'])
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_profile_admin_or_partner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_profile_admin_or_partner(UUID) TO authenticated;

DROP POLICY IF EXISTS "admin lit tous profils" ON public.profiles;
CREATE POLICY "admin lit tous profils" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_profile_admin_or_partner(auth.uid()));

-- 2) handle_new_user() alignée sur le schéma réel de profiles
--    (id, full_name, telephone, ville, role, created_at — pas de colonne email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citoyen')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

-- 3) Trigger manquant sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) handle_new_user() est une fonction trigger (lit NEW/TG_OP), pas une action
--    à exposer via l'API REST. Sans REVOKE explicite, Postgres l'accorde à
--    PUBLIC par défaut, ce que l'auditeur Supabase (db advisors) a signalé :
--    /rest/v1/rpc/handle_new_user était appelable par anon/authenticated.
--    Un trigger n'a pas besoin d'EXECUTE accordé à un rôle pour se déclencher.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

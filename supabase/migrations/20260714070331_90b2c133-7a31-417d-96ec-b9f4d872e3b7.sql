
-- Enums
CREATE TYPE public.signalement_type AS ENUM ('lien','image','video','audio','texte','document');
CREATE TYPE public.signalement_categorie AS ENUM ('violence','desinformation','harcelement','escroquerie','enfance','haine','autre');
CREATE TYPE public.signalement_statut AS ENUM ('nouveau','en_analyse','verifie','rejete','cloture');
CREATE TYPE public.signalement_confidentialite AS ENUM ('anonyme','restreint','identifie');
CREATE TYPE public.alerte_severite AS ENUM ('info','faible','moyenne','elevee','critique');
CREATE TYPE public.factcheck_verdict AS ENUM ('vrai','faux','trompeur','non_verifiable','en_cours');

-- Utility trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_complet TEXT,
  email TEXT,
  telephone TEXT,
  fonction TEXT,
  institution TEXT,
  langue TEXT DEFAULT 'fr-CM',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom_complet)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- signalements
CREATE TABLE public.signalements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('S-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*900000)+100000)::text,6,'0')),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.signalement_type NOT NULL,
  categorie public.signalement_categorie,
  url TEXT,
  description TEXT,
  pays TEXT DEFAULT 'Cameroun',
  region TEXT,
  ville TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  confidentialite public.signalement_confidentialite NOT NULL DEFAULT 'anonyme',
  suivi_email TEXT,
  preuves JSONB NOT NULL DEFAULT '[]'::jsonb,
  statut public.signalement_statut NOT NULL DEFAULT 'nouveau',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signalements TO authenticated;
GRANT INSERT ON public.signalements TO anon;
GRANT ALL ON public.signalements TO service_role;
ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;
-- Anyone (even anonymous) can submit a signalement
CREATE POLICY "signalements_insert_public" ON public.signalements FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Reporter can view their own signalements (when identified)
CREATE POLICY "signalements_select_own" ON public.signalements FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE TRIGGER trg_signalements_updated BEFORE UPDATE ON public.signalements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_signalements_created_at ON public.signalements (created_at DESC);
CREATE INDEX idx_signalements_statut ON public.signalements (statut);
CREATE INDEX idx_signalements_region ON public.signalements (region);

-- alertes
CREATE TABLE public.alertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  severite public.alerte_severite NOT NULL DEFAULT 'info',
  region TEXT,
  ville TEXT,
  categorie public.signalement_categorie,
  source TEXT,
  signalement_id UUID REFERENCES public.signalements(id) ON DELETE SET NULL,
  resolue BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertes TO authenticated;
GRANT ALL ON public.alertes TO service_role;
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertes_select_auth" ON public.alertes FOR SELECT TO authenticated USING (true);
CREATE POLICY "alertes_insert_auth" ON public.alertes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "alertes_update_own" ON public.alertes FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE TRIGGER trg_alertes_updated BEFORE UPDATE ON public.alertes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- fact_checks
CREATE TABLE public.fact_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  affirmation TEXT NOT NULL,
  verdict public.factcheck_verdict NOT NULL DEFAULT 'en_cours',
  resume TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  signalement_id UUID REFERENCES public.signalements(id) ON DELETE SET NULL,
  auteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  publie BOOLEAN NOT NULL DEFAULT false,
  publie_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fact_checks TO authenticated;
GRANT SELECT ON public.fact_checks TO anon;
GRANT ALL ON public.fact_checks TO service_role;
ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;
-- Published fact-checks are public
CREATE POLICY "factchecks_select_public" ON public.fact_checks FOR SELECT TO anon, authenticated USING (publie = true);
-- Authors see their own drafts
CREATE POLICY "factchecks_select_own" ON public.fact_checks FOR SELECT TO authenticated USING (auteur_id = auth.uid());
CREATE POLICY "factchecks_insert_own" ON public.fact_checks FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());
CREATE POLICY "factchecks_update_own" ON public.fact_checks FOR UPDATE TO authenticated USING (auteur_id = auth.uid()) WITH CHECK (auteur_id = auth.uid());
CREATE TRIGGER trg_factchecks_updated BEFORE UPDATE ON public.fact_checks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

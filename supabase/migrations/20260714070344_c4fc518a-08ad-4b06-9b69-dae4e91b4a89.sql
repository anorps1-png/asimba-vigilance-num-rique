
-- Tighten anonymous insert policy on signalements
DROP POLICY IF EXISTS "signalements_insert_public" ON public.signalements;
CREATE POLICY "signalements_insert_anon" ON public.signalements
  FOR INSERT TO anon
  WITH CHECK (reporter_id IS NULL AND confidentialite = 'anonyme');
CREATE POLICY "signalements_insert_auth" ON public.signalements
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id IS NULL OR reporter_id = auth.uid());

-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- Phase 4 : bucket Storage pour les preuves de signalement (image/vidéo/
-- audio/document). Bucket privé — jamais d'URL publique, lecture via
-- createSignedUrl côté serveur uniquement (voir Phase 3 groupe B/D).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'preuves-signalements',
  'preuves-signalements',
  false,
  104857600, -- 100 Mo par fichier
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/quicktime','video/webm',
    'audio/mpeg','audio/mp4','audio/wav','audio/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Upload : citoyen (anonyme ou identifié) peut déposer une preuve. Le nom de
-- fichier est structuré côté client "{signalement_id}/{uuid}-{nom}" ; on ne
-- peut pas encore vérifier l'appartenance à l'insert (le signalement peut ne
-- pas exister en base au moment de l'upload dans le flux du wizard), donc
-- l'upload est ouvert à toute cible de ce bucket précis, et c'est la lecture
-- qui est strictement contrôlée ci-dessous.
DROP POLICY IF EXISTS "preuves_insert" ON storage.objects;
CREATE POLICY "preuves_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'preuves-signalements');

-- Lecture : personnel (is_staff) ou déclarant identifié propriétaire du
-- signalement référencé par le premier segment du chemin.
DROP POLICY IF EXISTS "preuves_select_staff_or_owner" ON storage.objects;
CREATE POLICY "preuves_select_staff_or_owner" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'preuves-signalements'
    AND (
      public.is_staff(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.signalements s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND s.auteur_id = auth.uid()
      )
    )
  );

-- Suppression : personnel uniquement (le déclarant ne peut pas retirer une
-- preuve après soumission, y compris pour préserver l'intégrité du dossier).
DROP POLICY IF EXISTS "preuves_delete_staff" ON storage.objects;
CREATE POLICY "preuves_delete_staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'preuves-signalements' AND public.is_staff(auth.uid()));

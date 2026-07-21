-- Rejoué automatiquement par `supabase db reset` (local uniquement, jamais sur
-- le projet lié). Les données de référence (ia_config singleton, catégories,
-- modèles IA, intégrations) sont déjà appliquées en prod via la migration
-- 20260720170000_seed_reference_data.sql — ce fichier ne fait que reproduire
-- le même état de base pour un environnement local fraîchement réinitialisé,
-- plus quelques exemples de contenu éditorial pour tester l'UI sans admin.

insert into ia_config (id)
values (1)
on conflict (id) do nothing;

insert into categories (nom, mots_cles) values
  ('Incitation à la violence', array['violence','attaque','menace','tuer']),
  ('Désinformation', array['rumeur','faux','intox','désinformation']),
  ('Harcèlement', array['harcèlement','insulte','menace','doxxing']),
  ('Escroquerie', array['arnaque','escroquerie','loterie','gain']),
  ('Discours de haine', array['haine','ethnie','discrimination']),
  ('Protection de l''enfance', array['mineur','enfant','protection']),
  ('Atteintes sexuelles', array['agression','abus']),
  ('Cybercriminalité', array['piratage','phishing','cybercriminalité'])
on conflict (nom) do nothing;

insert into ia_modeles (nom, version, statut) values
  ('asimba-lang-detect', 'v2.1', 'production'),
  ('asimba-sentiment-fr', 'v3.0', 'production'),
  ('asimba-violence-clf', 'v3.2', 'production'),
  ('asimba-disinfo-clf', 'v2.4', 'production'),
  ('asimba-child-safety', 'v1.9', 'production'),
  ('asimba-propagation', 'v1.1', 'testing');

insert into integrations (nom, description, actif) values
  ('Facebook Graph API', 'Ingestion contenus publics', false),
  ('TikTok Research API', 'Ingestion publications', false),
  ('X (Twitter) API v2', 'Streaming filtré', false),
  ('WhatsApp Business', 'Réception signalements dédiés', false),
  ('SMS Gateway MTN', 'Notifications SMS', false),
  ('Email SMTP sécurisé', 'Notifications transactionnelles', false)
on conflict (nom) do nothing;

insert into institutions (nom, sigle, role, statut, description) values
  ('Agence Nationale des TIC', 'ANTIC', 'regulateur', 'actif', 'Cybersécurité et régulation numérique'),
  ('Brigade Spéciale de la Cybercriminalité', 'BSC', 'gouvernemental', 'actif', 'Police judiciaire spécialisée'),
  ('Ministère de la Communication', 'MINCOM', 'gouvernemental', 'actif', 'Communication publique'),
  ('UNICEF Cameroun', 'UNICEF', 'ong', 'actif', 'Protection de l''enfance')
on conflict (nom) do nothing;

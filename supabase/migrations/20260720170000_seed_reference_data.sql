-- Données de référence indispensables au fonctionnement de l'UI d'administration.
-- Aucune migration précédente n'insère ces lignes : sans elles, ia_config reste
-- vide (le switch "Paramètres IA" ne peut rien modifier faute de ligne id=1 à
-- mettre à jour) et les onglets Catégories/Modèles IA/Intégrations restent vides.
-- Toutes les insertions sont idempotentes (ON CONFLICT DO NOTHING).

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

-- ia_modeles.nom n'a pas de contrainte unique : cette migration ne s'applique
-- qu'une fois (suivie par supabase migration list), pas d'ON CONFLICT nécessaire.
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

-- Phase 1f: Nouvelles tables staff, admin et config

-- === HELPER FUNCTIONS ===
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- === ENUMS ===
create type institution_role as enum ('partenaire', 'regulateur', 'media', 'gouvernemental', 'ong');
create type institution_statut as enum ('actif', 'suspendu', 'archivé');
create type notification_type as enum ('alerte', 'assignation', 'commentaire', 'rapport', 'systeme');
create type audit_action as enum ('create', 'update', 'delete', 'read', 'login', 'role_change', 'config_change');
create type audit_niveau as enum ('info', 'warning', 'critical');
create type ia_model_statut as enum ('development', 'testing', 'production', 'archived');

-- === TABLES ===

-- institutions : partenaires et régulateurs
create table institutions (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  sigle text not null unique,
  role institution_role not null,
  statut institution_statut not null default 'actif',
  description text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  updated_by uuid references auth.users(id)
);

-- ajouter colonne institution_id à profiles
alter table profiles add column institution_id uuid references institutions(id) on delete set null;

-- notifications : messages utilisateur
create table notifications (
  id uuid primary key default gen_random_uuid(),
  destinataire_id uuid not null references auth.users(id) on delete cascade,
  titre text not null,
  corps text not null,
  type notification_type not null,
  lien text,
  lu boolean not null default false,
  lu_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- articles : base de connaissances
create table articles (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  categorie text not null,
  resume text,
  contenu text not null,
  duree_lecture_min integer,
  publie boolean not null default false,
  auteur_id uuid not null references auth.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- audit_logs : append-only, jamais modifié/supprimé après création
create table audit_logs (
  id bigserial primary key,
  acteur_id uuid references auth.users(id) on delete set null,
  action audit_action not null,
  cible text not null,
  niveau audit_niveau not null default 'info',
  ip inet,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- categories : tags pour alertes/fact-checks
create table categories (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  mots_cles text[] default '{}',
  actif boolean not null default true,
  created_at timestamp with time zone default now()
);

-- ia_config : configuration singleton du moteur IA
create table ia_config (
  id integer primary key default 1,
  seuil_critique numeric not null default 0.85,
  seuil_eleve numeric not null default 0.70,
  escalade_auto_bsc boolean not null default true,
  validation_humaine_requise boolean not null default false,
  updated_at timestamp with time zone default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint only_one_row check (id = 1)
);

-- ia_modeles : versions des modèles IA utilisées
create table ia_modeles (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  version text not null,
  statut ia_model_statut not null default 'development',
  description text,
  updated_at timestamp with time zone default now()
);

-- api_keys : clés pour intégrations
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  cle_hash text not null unique,
  cle_apercu text not null,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  revoked_at timestamp with time zone,
  last_used_at timestamp with time zone
);

-- integrations : connexions externes (webhooks, API)
create table integrations (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  description text,
  actif boolean not null default true,
  config jsonb,
  updated_at timestamp with time zone default now()
);

-- preferences_utilisateur : paramètres privés par utilisateur
create table preferences_utilisateur (
  user_id uuid primary key references auth.users(id) on delete cascade,
  deux_facteurs_actif boolean not null default false,
  notif_connexion boolean not null default true,
  verrouillage_auto boolean not null default false,
  verrouillage_auto_minutes integer default 30,
  email_alertes_critiques boolean not null default true,
  email_rapports_hebdo boolean not null default false,
  sms_alertes_critiques boolean not null default false,
  sms_numero text,
  push_assignations boolean not null default true,
  push_commentaires boolean not null default true,
  theme text default 'system',
  langue text default 'fr',
  updated_at timestamp with time zone default now()
);

-- === TRIGGERS ===

-- updated_at sur institutions
create trigger institutions_updated_at
  before update on institutions
  for each row
  execute function update_updated_at_column();

-- updated_at sur articles
create trigger articles_updated_at
  before update on articles
  for each row
  execute function update_updated_at_column();

-- updated_at sur ia_config
create trigger ia_config_updated_at
  before update on ia_config
  for each row
  execute function update_updated_at_column();

-- updated_at sur preferences_utilisateur
create trigger preferences_utilisateur_updated_at
  before update on preferences_utilisateur
  for each row
  execute function update_updated_at_column();

-- === RLS ===

alter table institutions enable row level security;
alter table notifications enable row level security;
alter table articles enable row level security;
alter table audit_logs enable row level security;
alter table categories enable row level security;
alter table ia_config enable row level security;
alter table ia_modeles enable row level security;
alter table api_keys enable row level security;
alter table integrations enable row level security;
alter table preferences_utilisateur enable row level security;

-- institutions : lecture publique, write admin
create policy "institutions_read_public" on institutions
  for select using (true);

create policy "institutions_write_admin" on institutions
  for insert with check (is_admin(auth.uid()));

create policy "institutions_update_admin" on institutions
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "institutions_delete_admin" on institutions
  for delete using (is_admin(auth.uid()));

-- notifications : read/update own, insert service_role only
create policy "notifications_read_own" on notifications
  for select using (destinataire_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update using (destinataire_id = auth.uid()) with check (destinataire_id = auth.uid());

-- articles : read public si publie=true, write staff
create policy "articles_read_published" on articles
  for select using (publie = true or auteur_id = auth.uid() or is_staff(auth.uid()));

create policy "articles_write_staff" on articles
  for insert with check (is_staff(auth.uid()));

create policy "articles_update_author_or_staff" on articles
  for update using (auteur_id = auth.uid() or is_staff(auth.uid()))
  with check (auteur_id = auth.uid() or is_staff(auth.uid()));

-- audit_logs : read staff, insert service_role only
create policy "audit_logs_read_staff" on audit_logs
  for select using (is_staff(auth.uid()));

-- categories : read public, write admin
create policy "categories_read_public" on categories
  for select using (true);

create policy "categories_write_admin" on categories
  for insert with check (is_admin(auth.uid()));

create policy "categories_update_admin" on categories
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ia_config : read staff, write admin
create policy "ia_config_read_staff" on ia_config
  for select using (is_staff(auth.uid()));

create policy "ia_config_write_admin" on ia_config
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ia_modeles : read staff, write admin
create policy "ia_modeles_read_staff" on ia_modeles
  for select using (is_staff(auth.uid()));

create policy "ia_modeles_write_admin" on ia_modeles
  for insert with check (is_admin(auth.uid()));

create policy "ia_modeles_update_admin" on ia_modeles
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- api_keys : read/write admin
create policy "api_keys_read_admin" on api_keys
  for select using (is_admin(auth.uid()));

create policy "api_keys_write_admin" on api_keys
  for insert with check (is_admin(auth.uid()));

create policy "api_keys_delete_admin" on api_keys
  for delete using (is_admin(auth.uid()));

-- integrations : read staff, write admin
create policy "integrations_read_staff" on integrations
  for select using (is_staff(auth.uid()));

create policy "integrations_write_admin" on integrations
  for insert with check (is_admin(auth.uid()));

create policy "integrations_update_admin" on integrations
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- preferences_utilisateur : read/write own
create policy "preferences_read_own" on preferences_utilisateur
  for select using (user_id = auth.uid());

create policy "preferences_write_own" on preferences_utilisateur
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- === INDEXES ===
create index institutions_statut_idx on institutions(statut);
create index notifications_destinataire_idx on notifications(destinataire_id);
create index notifications_lu_idx on notifications(lu);
create index articles_publie_idx on articles(publie);
create index articles_auteur_idx on articles(auteur_id);
create index audit_logs_created_at_idx on audit_logs(created_at);
create index audit_logs_acteur_idx on audit_logs(acteur_id);
create index api_keys_revoked_idx on api_keys(revoked_at);
create index preferences_updated_at_idx on preferences_utilisateur(updated_at);

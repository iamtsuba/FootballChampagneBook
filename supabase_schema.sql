-- =============================================
-- STORY MANAGER - Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PERSONNAGES
-- =============================================
create table personnages (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  prenom text not null,
  surnom text,
  annee_naissance integer,
  nationalite text,
  poste text,
  caracteristiques_design text, -- description physique détaillée
  style_personnalite text,       -- optionnel
  notes text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- EQUIPES
-- =============================================
create table equipes (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  acronyme text,
  ville text,
  pays text,
  couleur_principale text not null,  -- hex ex: #FF0000
  couleur_secondaire text not null,  -- hex ex: #FFFFFF
  description_maillot text,          -- description détaillée du maillot
  logo_url text,
  palmarès jsonb default '[]',       -- [{annee, titre, competition_id}]
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- SAISONS / EFFECTIFS (joueurs par équipe par saison)
-- =============================================
create table saisons (
  id uuid primary key default uuid_generate_v4(),
  equipe_id uuid references equipes(id) on delete cascade,
  annee_debut integer not null,
  annee_fin integer not null,
  notes text,
  created_at timestamptz default now()
);

create table saison_joueurs (
  id uuid primary key default uuid_generate_v4(),
  saison_id uuid references saisons(id) on delete cascade,
  personnage_id uuid references personnages(id) on delete cascade,
  numero_maillot integer,
  role_dans_equipe text,  -- capitaine, remplaçant, etc.
  unique(saison_id, personnage_id)
);

-- =============================================
-- COMPETITIONS
-- =============================================
create table competitions (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  type text,          -- championnat, coupe, tournoi...
  pays text,
  niveau text,        -- national, international, régional...
  description text,
  logo_url text,
  categorie text,
  nb_equipes integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table competition_equipes (
  competition_id uuid references competitions(id) on delete cascade,
  equipe_id      uuid references equipes(id) on delete cascade,
  primary key (competition_id, equipe_id)
);

-- =============================================
-- MATCHS
-- =============================================
create table matchs (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid references competitions(id) on delete set null,
  equipe_domicile_id uuid references equipes(id) on delete set null,
  equipe_exterieur_id uuid references equipes(id) on delete set null,
  date_match date,
  annee integer,
  stade text,
  score_domicile integer,
  score_exterieur integer,
  phase text,          -- finale, demi-finale, poule A...
  resume text,
  evenements jsonb default '[]',  -- [{minute, type, personnage_id, description}]
  saison_annee_debut integer,
  saison_annee_fin   integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- ARCS NARRATIFS
-- =============================================
create table arcs (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  ordre integer,
  description text,
  periode_debut text,
  periode_fin text,
  themes text[],
  statut text default 'en cours',  -- en cours, terminé, planifié
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Relations arc <-> entités
create table arc_personnages (
  arc_id uuid references arcs(id) on delete cascade,
  personnage_id uuid references personnages(id) on delete cascade,
  role_dans_arc text,
  primary key (arc_id, personnage_id)
);

create table arc_equipes (
  arc_id uuid references arcs(id) on delete cascade,
  equipe_id uuid references equipes(id) on delete cascade,
  primary key (arc_id, equipe_id)
);

create table arc_matchs (
  arc_id uuid references arcs(id) on delete cascade,
  match_id uuid references matchs(id) on delete cascade,
  primary key (arc_id, match_id)
);

create table arc_competitions (
  arc_id uuid references arcs(id) on delete cascade,
  competition_id uuid references competitions(id) on delete cascade,
  primary key (arc_id, competition_id)
);

-- =============================================
-- LIVRES
-- =============================================
create table livres (
  id uuid primary key default uuid_generate_v4(),
  titre text not null,
  numero_tome integer,
  sous_titre text,
  synopsis text,
  statut text default 'en cours',  -- brouillon, en cours, terminé, publié
  date_debut_ecriture date,
  date_publication date,
  nb_chapitres integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Relations livre <-> arcs
create table livre_arcs (
  livre_id uuid references livres(id) on delete cascade,
  arc_id uuid references arcs(id) on delete cascade,
  ordre integer,
  primary key (livre_id, arc_id)
);

-- =============================================
-- ROW LEVEL SECURITY (optionnel - désactivé par défaut)
-- Activer si tu veux une auth multi-utilisateur
-- =============================================
-- alter table personnages enable row level security;
-- alter table equipes enable row level security;
-- etc.

-- =============================================
-- UPDATED_AT auto-trigger
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_personnages_updated_at before update on personnages for each row execute function update_updated_at();
create trigger trg_equipes_updated_at before update on equipes for each row execute function update_updated_at();
create trigger trg_competitions_updated_at before update on competitions for each row execute function update_updated_at();
create trigger trg_matchs_updated_at before update on matchs for each row execute function update_updated_at();
create trigger trg_arcs_updated_at before update on arcs for each row execute function update_updated_at();
create trigger trg_livres_updated_at before update on livres for each row execute function update_updated_at();

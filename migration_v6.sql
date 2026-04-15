-- Migration v6 : chapitres, sous_chapitres, livre_chapitres
-- Exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chapitres (
  id uuid primary key default uuid_generate_v4(),
  arc_id uuid references arcs(id) on delete cascade,
  numero integer not null default 1,
  titre text not null,
  prompt_aide text,
  chapitre_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS sous_chapitres (
  id uuid primary key default uuid_generate_v4(),
  chapitre_id uuid references chapitres(id) on delete cascade,
  numero integer not null default 1,
  titre text not null,
  type text not null default 'HISTOIRE',
  description text,
  match_id uuid references matchs(id) on delete set null,
  competition_id uuid references competitions(id) on delete set null,
  classement_categorie text,
  classement_annee_debut integer,
  classement_annee_fin integer,
  equipe_id uuid references equipes(id) on delete set null,
  personnage_id uuid references personnages(id) on delete set null,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS livre_chapitres (
  id uuid primary key default uuid_generate_v4(),
  livre_id uuid references livres(id) on delete cascade,
  chapitre_id uuid references chapitres(id) on delete cascade,
  ordre integer default 0,
  unique(livre_id, chapitre_id)
);

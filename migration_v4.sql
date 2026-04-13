-- Migration v4 : compétitions avec catégorie/équipes, matchs avec saison et timeline
-- Exécuter dans Supabase SQL Editor

-- Compétitions : ajout catégorie et nb_equipes
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS categorie text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS nb_equipes integer;

-- Table de liaison compétition <-> équipes participantes
CREATE TABLE IF NOT EXISTS competition_equipes (
  competition_id uuid references competitions(id) on delete cascade,
  equipe_id      uuid references equipes(id) on delete cascade,
  primary key (competition_id, equipe_id)
);

-- Matchs : ajout saison de référence
ALTER TABLE matchs ADD COLUMN IF NOT EXISTS saison_annee_debut integer;
ALTER TABLE matchs ADD COLUMN IF NOT EXISTS saison_annee_fin   integer;

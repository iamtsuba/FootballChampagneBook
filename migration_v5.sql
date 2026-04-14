-- Migration v5 : table classements
-- Exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS classements (
  id uuid primary key default uuid_generate_v4(),
  categorie text not null,
  annee_debut integer not null,
  annee_fin integer not null,
  lignes jsonb default '[]',
  -- [{position, equipe_id, equipe_nom, equipe_couleur, points, v, n, d, bp, bc}]
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(categorie, annee_debut, annee_fin)
);

-- Bucket Supabase Storage à créer manuellement dans le dashboard :
-- Nom : avatars | Public : oui
-- (utilisé pour les photos de personnages générées par IA)

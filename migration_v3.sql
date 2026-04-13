-- Migration v3 : remplacement du champ age par annee_naissance
-- Exécuter dans Supabase SQL Editor

ALTER TABLE personnages RENAME COLUMN age TO annee_naissance;

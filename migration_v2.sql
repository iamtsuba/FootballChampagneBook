-- =============================================
-- MIGRATION : Simplification catégories + poste select
-- À exécuter dans Supabase > SQL Editor
-- =============================================

-- Met à jour la colonne catégorie dans saisons
-- (elle existe déjà, on la garde telle quelle)
-- Si tu n'as pas encore fait le ALTER précédent, décommente la ligne suivante :
-- ALTER TABLE saisons ADD COLUMN IF NOT EXISTS categorie text;

-- Aucune autre migration SQL nécessaire,
-- les changements sont uniquement dans le frontend.

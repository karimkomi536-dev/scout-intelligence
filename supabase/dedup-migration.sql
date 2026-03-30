-- =============================================================================
-- VIZION — Anti-doublon : normalisation des noms joueurs/équipes
-- =============================================================================
-- Exécuter dans Supabase SQL Editor.
-- Idempotent — safe to re-run.
-- =============================================================================

-- 1. Colonnes de normalisation
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS name_normalized text,
  ADD COLUMN IF NOT EXISTS team_normalized text;

-- 2. Fonction de normalisation (minuscules, sans accents, sans caractères spéciaux)
CREATE OR REPLACE FUNCTION normalize_text(t text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(t,
          'àáâãäåæçèéêëìíîïðñòóôõöùúûüýÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝŸ',
          'aaaaaaeceeeeiiiidnoooooouuuuyyaaaaaaeceeeeiiiidnoooooouuuuyy'
        ),
        '[^a-z0-9 ]', '', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 3. Met à jour les colonnes normalisées existantes
UPDATE players
SET
  name_normalized = normalize_text(name),
  team_normalized = normalize_text(COALESCE(team, ''))
WHERE name_normalized IS NULL OR team_normalized IS NULL;

-- 4. Supprime les doublons en gardant la ligne avec le plus petit id (UUID alpha-sort)
DELETE FROM players a
USING players b
WHERE a.id > b.id
  AND normalize_text(a.name) = normalize_text(b.name)
  AND normalize_text(COALESCE(a.team, '')) = normalize_text(COALESCE(b.team, ''));

-- 5. Index unique fonctionnel sur les formes normalisées
CREATE UNIQUE INDEX IF NOT EXISTS players_name_team_unique
  ON players (normalize_text(name), normalize_text(COALESCE(team, '')));

-- 6. Index GIN pour recherche rapide sur name_normalized
CREATE INDEX IF NOT EXISTS idx_players_name_normalized
  ON players (name_normalized);

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
-- SELECT name, team, name_normalized, team_normalized
-- FROM players
-- ORDER BY name_normalized
-- LIMIT 20;
-- =============================================================================

-- =============================================================================
-- VIZION — Row Level Security Policies
-- =============================================================================
-- Exécuter dans : Supabase Dashboard → SQL Editor
--
-- Tables couvertes :
--   1. players     — données joueurs (actuellement utilisée dans le code)
--   2. shortlists  — raccourcis personnels par scout (à brancher sur Supabase)
--   3. notes       — notes privées par joueur et par scout
--
-- Principe général :
--   - players    → lecture publique (anon + authenticated), écriture admin seulement
--   - shortlists → lecture/écriture uniquement par le scout propriétaire (auth.uid())
--   - notes      → lecture/écriture uniquement par le scout propriétaire (auth.uid())
--
-- ⚠️  Ces policies supposent que la table "auth.users" de Supabase est active.
--     Si tu n'as pas encore activé l'auth, les policies "authenticated" ne
--     bloqueront rien tant qu'aucun utilisateur n'est connecté.
-- =============================================================================


-- =============================================================================
-- 1. TABLE : players
-- =============================================================================
-- Contient les données de scouting : nom, âge, équipe, position, score, label.
-- C'est une table de référence — tout le monde peut lire, seul un admin peut écrire.
-- =============================================================================

-- Active RLS sur players (bloque tout par défaut jusqu'à ce qu'une policy autorise)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- ─── SELECT ──────────────────────────────────────────────────────────────────
-- Permet à tout utilisateur (connecté OU anonyme) de lire tous les joueurs.
-- Utile pendant le développement et pour une éventuelle API publique.
-- Quand l'auth sera en place : tu pourras restreindre à "authenticated" seulement
-- en remplaçant "TO public" par "TO authenticated".
CREATE POLICY "players_select_public"
  ON players
  FOR SELECT
  TO public          -- 'public' = anon + authenticated
  USING (true);      -- aucune condition de filtre : toutes les lignes sont visibles

-- ─── INSERT ──────────────────────────────────────────────────────────────────
-- Interdit l'insertion via le client JS (anon key).
-- L'import de joueurs doit passer par le service_role (backend / Upload page).
-- À ajuster si tu veux qu'un rôle "admin" puisse insérer via le dashboard.
CREATE POLICY "players_insert_service_only"
  ON players
  FOR INSERT
  TO authenticated   -- même les users connectés ne peuvent pas insérer
  WITH CHECK (false); -- bloque tout INSERT depuis le client

-- ─── UPDATE / DELETE ─────────────────────────────────────────────────────────
-- Aucun utilisateur frontal ne doit pouvoir modifier ou supprimer un joueur.
-- Ces opérations se font uniquement via le service_role (backend).
CREATE POLICY "players_update_service_only"
  ON players
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "players_delete_service_only"
  ON players
  FOR DELETE
  TO authenticated
  USING (false);


-- =============================================================================
-- 2. TABLE : shortlists
-- =============================================================================
-- Chaque scout constitue sa liste personnelle de joueurs à suivre.
-- Structure attendue :
--   id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
--   player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE
--   added_at    timestamptz DEFAULT now()
--   UNIQUE(user_id, player_id)
-- =============================================================================

-- Active RLS sur shortlists
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;

-- ─── SELECT ──────────────────────────────────────────────────────────────────
-- Un scout ne voit que SA propre shortlist.
-- auth.uid() retourne l'UUID de l'utilisateur actuellement connecté.
CREATE POLICY "shortlists_select_owner"
  ON shortlists
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()); -- filtre automatique : chaque user ne voit que ses lignes

-- ─── INSERT ──────────────────────────────────────────────────────────────────
-- Un scout ne peut ajouter un joueur qu'à SA propre shortlist.
-- WITH CHECK empêche d'insérer avec un user_id différent du sien.
CREATE POLICY "shortlists_insert_owner"
  ON shortlists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()); -- impossible d'insérer pour un autre user

-- ─── DELETE ──────────────────────────────────────────────────────────────────
-- Un scout ne peut retirer que ses propres entrées de shortlist.
CREATE POLICY "shortlists_delete_owner"
  ON shortlists
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Note : pas de policy UPDATE sur shortlists car on ne "modifie" pas une entrée,
-- on la supprime/recrée. Si tu ajoutes un champ "priority" ou "note_rapide",
-- ajoute une policy UPDATE similaire.


-- =============================================================================
-- 3. TABLE : notes
-- =============================================================================
-- Notes privées rédigées par un scout sur un joueur spécifique.
-- Structure attendue :
--   id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
--   player_id   uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE
--   content     text NOT NULL
--   created_at  timestamptz DEFAULT now()
--   updated_at  timestamptz DEFAULT now()
-- =============================================================================

-- Active RLS sur notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- ─── SELECT ──────────────────────────────────────────────────────────────────
-- Un scout ne lit que ses propres notes (confidentialité totale entre scouts).
CREATE POLICY "notes_select_owner"
  ON notes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─── INSERT ──────────────────────────────────────────────────────────────────
-- Un scout ne peut créer une note qu'en son propre nom.
CREATE POLICY "notes_insert_owner"
  ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── UPDATE ──────────────────────────────────────────────────────────────────
-- Un scout ne peut modifier que ses propres notes.
-- USING filtre les lignes qu'il peut cibler, WITH CHECK valide les nouvelles valeurs.
CREATE POLICY "notes_update_owner"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())        -- ne peut cibler que ses lignes
  WITH CHECK (user_id = auth.uid());   -- ne peut pas changer le user_id

-- ─── DELETE ──────────────────────────────────────────────────────────────────
-- Un scout ne supprime que ses propres notes.
CREATE POLICY "notes_delete_owner"
  ON notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
-- Après exécution, tu peux vérifier les policies actives avec :
--
--   SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('players', 'shortlists', 'notes')
--   ORDER BY tablename, cmd;
--
-- Et vérifier que RLS est bien activé :
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE tablename IN ('players', 'shortlists', 'notes');
-- =============================================================================

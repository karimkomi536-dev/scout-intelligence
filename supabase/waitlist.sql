-- =============================================================================
-- VIZION — Waitlist Table
-- =============================================================================
-- Exécuter dans : Supabase Dashboard → SQL Editor
--
-- Collecte les emails des visiteurs intéressés avant/pendant le lancement.
-- RLS : tout le monde peut s'inscrire, personne ne peut lire via la clé anon.
--       La liste est accessible uniquement via le service_role (admin).
-- =============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL UNIQUE,
  name       text,
  source     text        DEFAULT 'landing',   -- d'où vient le lead
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE waitlist IS 'Emails collectés sur la landing page avant inscription.';
COMMENT ON COLUMN waitlist.source IS 'Page ou section d''origine : landing, pricing, hero, etc.';

-- Index pour éviter les doublons rapides et les lookups admin
CREATE INDEX IF NOT EXISTS idx_waitlist_email      ON waitlist (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- N'importe qui (même anonyme) peut soumettre son email
CREATE POLICY "waitlist_insert_public"
  ON waitlist FOR INSERT TO public
  WITH CHECK (true);

-- Personne ne peut lire la liste via le client JS (clé anon)
-- L'admin accède via le service_role directement dans Supabase Dashboard
CREATE POLICY "waitlist_select_service_only"
  ON waitlist FOR SELECT TO authenticated
  USING (false);

-- Pas de UPDATE ni DELETE depuis le client
-- (gestion via Supabase Dashboard uniquement)

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
--   SELECT COUNT(*) FROM waitlist;                    -- nombre d'inscrits
--   SELECT * FROM waitlist ORDER BY created_at DESC;  -- liste complète (service_role)
-- =============================================================================

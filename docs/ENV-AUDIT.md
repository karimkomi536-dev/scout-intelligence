# VIZION — Audit des Variables d'Environnement

**Date :** 2026-03-28
**Scope :** Tout le code source (src/, api/, scripts/python/, vite.config.ts)

---

## Règle fondamentale

> **`VITE_*` = public.** Vite injecte ces variables dans le bundle JS téléchargé par le navigateur. Ne jamais y mettre une clé secrète (service role, clé API privée, etc.).

---

## Variables d'environnement recensées

### Client-side — `VITE_*` (bundlées dans le JS public)

| Variable | Utilisée où | Statut |
|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts`, `scripts/python/*.py` | ✅ OK — URL publique par design Supabase |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | ✅ OK — Clé anon conçue pour être publique, RLS protège les données |
| `VITE_SENTRY_DSN` | `src/main.tsx` | ✅ OK — DSN public par design Sentry |

### Server-side — `process.env.*` ou `os.environ` (jamais exposées au client)

| Variable | Utilisée où | Côté | Statut |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/python/*.py` | Serveur | ✅ OK — Correctement sans préfixe VITE_ |
| `ANTHROPIC_API_KEY` | `api/generate-scout-report.ts` | Edge Function | ✅ OK — Jamais VITE_ |
| `RESEND_API_KEY` | `api/send-invitation.ts` | Edge Function | ✅ OK — Jamais VITE_ |
| `SENTRY_AUTH_TOKEN` | `vite.config.ts` (build-time) | CI / Build | ✅ OK — Uniquement à la compilation |
| `API_FOOTBALL_KEY` | `scripts/python/import_api_football.py` | Serveur | ✅ OK — Scripts Python uniquement |

---

## Problèmes détectés et corrigés

### 🔴 [CRITIQUE — CORRIGÉ] `VITE_SUPABASE_SERVICE_ROLE_KEY` dans `.env.example`

**Avant :** `.env.example` listait `VITE_SUPABASE_SERVICE_ROLE_KEY=...`
**Risque :** Enseigne aux développeurs à préfixer la clé admin avec `VITE_`, ce qui l'expose dans le bundle JS public. La `service_role` key bypasse toutes les RLS — une fuite permettrait à n'importe qui de lire/écrire toute la base.
**Fix :** Renommé en `SUPABASE_SERVICE_ROLE_KEY` (sans `VITE_`) dans `.env.example`.

### 🟡 [AVERTISSEMENT — CORRIGÉ] Fallback `VITE_SUPABASE_SERVICE_ROLE_KEY` dans les scripts Python

**Avant :** 4 scripts avaient `os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")`
**Risque :** Pattern qui normalise l'idée qu'avoir la clé admin sous forme `VITE_*` est acceptable.
**Scripts corrigés :**
- `scripts/python/import_supabase.py`
- `scripts/python/snapshot_players.py`
- `scripts/python/scrape_market_values.py`
- `scripts/python/import_api_football.py`

**Fix :** Fallback supprimé. Uniquement `SUPABASE_SERVICE_ROLE_KEY`.

### 🟡 [INFO — CORRIGÉ] `RESEND_API_KEY` absente de `.env.example`

**Avant :** Clé utilisée en production (`api/send-invitation.ts`) mais non documentée dans `.env.example`.
**Fix :** Ajoutée dans `.env.example` avec commentaire de contexte.

---

## Vérifications de sécurité complémentaires

| Vérification | Résultat |
|---|---|
| `.env` dans `.gitignore` | ✅ Oui (lignes 1-5) |
| `.env` commité dans l'historique git | ✅ Non — aucune entrée dans `git log -- .env` |
| Clés hardcodées dans `src/` | ✅ Aucune — scan complet des tokens JWT/API keys |
| Clés hardcodées dans `api/` | ✅ Aucune — `ALLOWED_ORIGIN` est une constante de déploiement, pas un secret |
| `service_role` key dans le bundle client | ✅ Non — `SUPABASE_SERVICE_ROLE_KEY` jamais importé dans `src/` |
| API keys dans les fichiers versionnés | ✅ Aucune — tous les secrets via variables d'environnement |

---

## Configuration `.env` recommandée (développement local)

Copier `.env.example` → `.env` et remplir :

```bash
# Client (Vite expose ces variables au navigateur)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...          # Clé anon Supabase
VITE_SENTRY_DSN=https://xxx@oyyy.ingest.sentry.io/zzz

# Serveur uniquement (jamais VITE_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Clé admin — scripts Python uniquement
ANTHROPIC_API_KEY=sk-ant-...           # Vercel env vars
RESEND_API_KEY=re_...                  # Vercel env vars
SENTRY_AUTH_TOKEN=sntrys_...           # CI / Vercel build
API_FOOTBALL_KEY=...                   # Scripts Python uniquement
```

---

## Variables Vercel (production)

Configurer dans **Vercel → Settings → Environment Variables** :

| Variable | Environment | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Production, Preview | |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | |
| `VITE_SENTRY_DSN` | Production | |
| `ANTHROPIC_API_KEY` | Production | Edge Function |
| `RESEND_API_KEY` | Production | Edge Function |
| `SENTRY_AUTH_TOKEN` | Production | Source map uploads |

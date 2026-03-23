# VIZION — Leçons apprises

## Format : [date] | problème | règle

[2026-03-22] | vercel.json manquant → 404 sur toutes les routes React Router |
Toujours créer vercel.json avec rewrites SPA dès le début du projet

[2026-03-22] | fichiers non commités → Vercel tournait sur ancienne version |
Vérifier git status avant tout debug Vercel — si non commité, ça n'existe pas en prod

[2026-03-22] | ALTER TABLE sur table inexistante → SQL crash |
Toujours vérifier qu'une table existe avant de l'altérer avec IF EXISTS

[2026-03-22] | service_role key dans variable VITE_* → clé admin exposée publiquement |
Variables VITE_* = publiques (bundle JS). Service role key = jamais dans VITE_*

[2026-03-22] | npm scripts avec "python" → erreur sur Windows ("py" requis) |
Sur Windows, utiliser "py" au lieu de "python" dans les scripts npm

[2026-03-22] | Unicode box-drawing chars → UnicodeEncodeError sur terminal Windows (cp1252) |
Toujours set PYTHONIOENCODING=utf-8 avant d'invoquer un script Python avec des caractères non-ASCII. Ou utiliser uniquement ASCII dans les print().

[2026-03-22] | scraper FBref → StatsBomb fallback retourne données 2015-16, pas 2023-24 |
StatsBomb open data gratuit couvre seulement certaines saisons historiques. Pour données récentes, soccerdata (Python <3.13) ou scraping direct FBref sont nécessaires.

[2026-03-23] | RLS policies avec références croisées → récursion infinie PostgREST (PGRST301) |
Éviter les policies RLS qui se référencent mutuellement (A→B→A). Si nécessaire, réécrire avec EXISTS + JOIN direct plutôt que IN (SELECT ...) pour briser la récursion. Ajouter un guard isFatal() côté front pour stopper toute boucle de retry.

[2026-03-23] | SQL migration : CREATE TABLE dans le mauvais ordre → "relation does not exist" |
Ordre obligatoire dans un fichier SQL : (1) CREATE TABLE toutes les tables, (2) ALTER TABLE, (3) CREATE INDEX, (4) ENABLE RLS, (5) DROP/CREATE POLICY. Les policies qui référencent d'autres tables doivent être créées APRÈS ces tables.

[2026-03-23] | Supabase onAuthStateChange INITIAL_SESSION → déconnexion race condition |
Ne jamais agir sur l'event INITIAL_SESSION dans onAuthStateChange. Utiliser getSession() comme source autoritaire pour l'init, avec un flag `mounted` pour éviter les setState post-unmount.

[2026-03-23] | useEffect([user]) → boucle infinie sur TOKEN_REFRESHED |
Supabase recrée un nouvel objet User à chaque TOKEN_REFRESHED. [user] compare par référence → l'effet se re-déclenche à chaque refresh de token → boucle. Toujours utiliser [user?.id] (string primitive, stable) comme dépendance.

[2026-03-23] | useState dans useEffect deps pour bloquer une boucle → ça re-boucle |
Utiliser useRef (pas useState) comme guard anti-boucle dans les useEffect. Un ref.current = true n'est pas dans les deps et ne cause pas de re-render. Un state dans les deps relance l'effet quand il change.

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

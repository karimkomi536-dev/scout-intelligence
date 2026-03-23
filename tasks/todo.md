# VIZION — Todo

## En cours
- [ ] SharedShortlist.tsx — vue publique read-only à /shortlist/:token

## Terminé
- [x] P0·01 — Purger .env de l'historique Git
- [x] P0·02 — Row Level Security Supabase
- [x] P0·03 — README
- [x] P1·01 — Auth Supabase (login/register/protected routes)
- [x] P1·02 — Schema multi-tenant (organizations, profiles, user_organizations)
- [x] P1·03 — Landing Page
- [x] P1·04 — Waitlist form
- [x] P2·00 — Scraper FBref (dry-run OK : 90 joueurs, 3 ligues via StatsBomb)
- [x] P2·01 — Import CSV / scrape:all → 90 joueurs importés dans Supabase
- [x] P2·02 — Page détail joueur (score ring, stat cards, radar chart)
- [x] P2·03 — Scoring par position (scoring.ts, position weights, 4 fonctions)
- [x] P2·04 — Filtres avancés avec URL sync (usePlayerFilters hook, server-side Supabase)
- [x] Comparateur (/compare) — CompareContext, CompareBar, Compare.tsx, boutons dans Players/PlayerDetail
- [x] Export PDF — jsPDF + html2canvas, PlayerPDFReport (off-screen), watermark CONFIDENTIEL
- [x] Shortlist v2 — tags, groupes/onglets, drag-and-drop (dnd-kit), share links
- [x] AuthContext — fix INITIAL_SESSION race condition, suppression session state
- [x] Shortlist — guard isFatal() contre boucle infinie 429/RLS recursion

## À faire
- [ ] SharedShortlist.tsx — créer src/pages/SharedShortlist.tsx et route publique dans App.tsx

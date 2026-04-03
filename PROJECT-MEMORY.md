# 🧠 VIZION — Project Memory
> Régénéré le 2026-04-03 | Source: analyse statique complète du code (post-commits session 3)

---

## 📌 SECTION 1 — PAGES & ROUTES

> Toutes les pages sont chargées avec `React.lazy()` + `Suspense` → `<PageLoader />`.
> Aucune page n'est importée statiquement dans App.tsx.

### Routes publiques (sans auth)
| Route | Composant | Statut |
|---|---|---|
| `/` | Landing.tsx | ✅ Fonctionnel — marketing, waitlist form, redirect /dashboard si connecté |
| `/login` | Login.tsx | ✅ Fonctionnel — auth Supabase email/mdp, PKCE flow |
| `/register` | Register.tsx | ✅ Fonctionnel — inscription |
| `/demo` | Demo.tsx | ✅ Fonctionnel — données mock (data/demo-players.ts), pas de Supabase |
| `/privacy` | Privacy.tsx | ✅ Statique |
| `/terms` | Terms.tsx | ✅ Statique |
| `/shortlist/:token` | SharedShortlist.tsx | ✅ Fonctionnel — lecture seule publique, auth non requise |
| `/invite/:token` | AcceptInvitation.tsx | ✅ Fonctionnel — accepter invitation org |

### Routes protégées (ProtectedRoute → Layout)
| Route | Composant | Statut |
|---|---|---|
| `/onboarding` | Onboarding.tsx | ✅ Fonctionnel — wizard 3 étapes, hors Layout |
| `/dashboard` | Dashboard.tsx | ✅ Fonctionnel — KPIs, charts Recharts, widgets |
| `/players` | Players.tsx | ✅ Fonctionnel — liste + filtres rapides + filtre valeur marchande + recherches sauvegardées + pagination (PAGE_SIZE=50) + swipe mobile |
| `/players/:id` | PlayerDetail.tsx | ✅ Fonctionnel — fiche 6 onglets + mode présentation plein écran + PDF + rapport IA |
| `/compare` | Compare.tsx | ✅ Fonctionnel — RadarChart 1 à 3 joueurs |
| `/shortlist` | Shortlist.tsx | ✅ Fonctionnel — groupes, tags, DnD (@dnd-kit), share links |
| `/newsletter` | NewsletterPage.tsx | ✅ Fonctionnel — top players live Supabase, copie presse-papiers, toast |
| `/upload` | Upload.tsx | ✅ Fonctionnel — drag-drop CSV, aperçu, upsert Supabase, toast résultat |
| `/settings` | Settings.tsx | ✅ Fonctionnel — profil, org, scoring personnalisé, invitations |
| `/settings/billing` | Billing.tsx | ✅ Fonctionnel — Stripe checkout + portal |
| `/map` | WorldMap.tsx | ✅ Fonctionnel — globe 3D Three.js, pins par pays, filtres label, clic → Players filtré |
| `/shadow-team` | ShadowTeam.tsx | ✅ Fonctionnel — 5 formations, drag joueurs, export PDF |
| `/admin/cron` | CronLogs.tsx | ✅ Fonctionnel — logs cron jobs (admin only) |
| `/admin/data` | DataDashboard.tsx | ✅ Fonctionnel — stats DB + déclenchement scraping (AdminRoute) |

---

## 🧩 SECTION 2 — COMPOSANTS

| Composant | Rôle | Utilisé dans |
|---|---|---|
| `Layout.tsx` | Sidebar desktop + bottom nav mobile + header + CompareBar | Toutes pages protégées |
| `ProtectedRoute.tsx` | Guard auth → /login si non connecté | App.tsx |
| `AdminRoute.tsx` | Guard rôle admin | App.tsx (/admin/data) |
| `PageLoader.tsx` | Spinner Suspense fallback (lazy routes) | App.tsx |
| `AdvancedSearch.tsx` | Panneau filtres avancés (position, ligue, âge, score, forme, pied, valeur marchande) | Players.tsx |
| `CompareBar.tsx` | Barre fixe bas d'écran — sélection joueurs pour comparateur | Layout.tsx |
| `CommandPalette.tsx` | Palette ⌘K — recherche live joueurs + navigation rapide | Layout.tsx |
| `NotificationBell.tsx` | Cloche avec dropdown (score_change, new_player, transfer, contrat…) | Layout.tsx |
| `OnboardingChecklist.tsx` | Widget progression onboarding 4 étapes avec progress ring | Dashboard.tsx |
| `TrendBadge.tsx` | Badge forme 🔥/📈/📉 calculé sur scores simulés | Players.tsx, PlayerDetail.tsx |
| `ScoreSparkline.tsx` | Mini graphique SVG polyline évolution score | Players.tsx, Dashboard.tsx |
| `PercentileBadge.tsx` | Badge "Top X% des ST · Ligue 1" vs pairs | PlayerDetail.tsx |
| `FixturesList.tsx` | Liste prochains matchs du club (DOM/EXT) | PlayerDetail.tsx — onglet Profil |
| `PlayerStatusBadge.tsx` | Badge statut joueur (fit/blessé/suspendu/doute) | PlayerDetail.tsx |
| `PlayerPDFReport.tsx` | Template PDF off-screen rendu par html2canvas + jsPDF | PlayerDetail.tsx |
| `ScoutReportForm.tsx` | Formulaire rapport de scouting structuré | PlayerDetail.tsx — onglet Rapports |
| `SimilarPlayers.tsx` | Suggestions joueurs similaires par profil stat | PlayerDetail.tsx |
| `Globe/Globe.tsx` | Globe 3D Three.js (lazy-loaded séparément pour perf) | WorldMap.tsx |
| `Toast.tsx` | Container toasts (max 3, desktop top-right, mobile top-center) | ToastContext.tsx |
| `Skeleton.tsx` | Squelettes de chargement | Players.tsx |
| `UpgradeBanner.tsx` | Bandeau upgrade plan Pro/Pro+ | Players.tsx, PlayerDetail.tsx |
| `ErrorFallback.tsx` | Page erreur React Error Boundary (Sentry) | main.tsx |
| `SplashScreen.tsx` | Écran de démarrage animé | main.tsx |
| `VizionLogo.tsx` | Logo SVG VIZION | Layout.tsx, Demo.tsx, Login.tsx |
| `WaitlistForm.tsx` | Formulaire liste d'attente Supabase | Landing.tsx |

---

## 🔌 SECTION 3 — CONTEXTES

| Contexte | Fichier | Rôle |
|---|---|---|
| `AuthContext` | contexts/AuthContext.tsx | Auth Supabase — user, session, onboarding, PKCE |
| `ToastContext` | contexts/ToastContext.tsx | Toasts globaux — `showToast(msg, type, duration)` + `dismiss(id)` |
| `CompareContext` | contexts/CompareContext.tsx | Sélection comparateur — max 3 joueurs, localStorage |
| `DemoContext` | contexts/DemoContext.tsx | Mode démo — DEMO_PLAYERS, shortlist localStorage |

**Hiérarchie des providers (App.tsx) :**
```
ToastProvider
  → CompareProvider
    → AuthProvider
      → BrowserRouter
```

---

## 🪝 SECTION 4 — HOOKS

| Hook | Rôle | TanStack Query |
|---|---|---|
| `useAlertPrefs.ts` | Préférences alertes utilisateur | — |
| `useFixtures.ts` | Prochains matchs joueur (Supabase) | `useQuery` |
| `useGlobeData.ts` | Pins globe par pays (filtres label) | `useQuery` |
| `useIsMobile.ts` | Détecte viewport mobile | — |
| `useMediaQuery.ts` | Media queries génériques | — |
| `useNotifications.ts` | Notifications utilisateur (Supabase realtime) | — |
| `useOrganization.ts` | Organisation active + rôle, max 3 retries guard | — |
| `usePercentile.ts` | Percentile scout_score vs ligue + position | `useQuery` |
| `usePlan.ts` | Plan utilisateur (free/pro/enterprise, VITE_ADMIN_EMAILS) | — |
| `usePlayer.ts` | Single player par ID | `useQuery` |
| `usePlayerFilters.ts` | State filtres Players (URL sync, minValueM, maxValueM…) | — |
| `usePlayerHistory.ts` | Historique score joueur pour graphiques | `useQuery` |
| `usePlayers.ts` | Liste players avec filtres Supabase | `useQuery` |
| `usePressable.ts` | Détecte press/release souris | — |
| `useScoringProfile.ts` | Poids scoring personnalisé par org | — |
| `useScoutReport.ts` | Scout reports d'un joueur | `useQuery` |
| `useSimilarPlayers.ts` | Joueurs similaires par profil stat | `useQuery` |
| `useSpeechRecognition.ts` | API Web Speech Recognition (notes vocales) | — |
| `useToast.ts` | Re-export `useToast` depuis ToastContext | — |

---

## ✅ SECTION 5 — FONCTIONNALITÉS ACTIVES

| Fonctionnalité | Statut | Notes |
|---|---|---|
| KPIs Dashboard cliquables | ✅ | Redirigent vers /players avec filtres pré-remplis |
| Boutons shortlist / comparateur / PDF | ✅ | Tous connectés, tous avec toasts |
| Recherche ⌘K | ✅ | Recherche live Supabase + navigation page |
| Stripe Checkout | ✅ | redirectToCheckout() + redirectToPortal() — null-safe si clé absente |
| Auth login/register | ✅ | PKCE flow, storageKey vizion-auth-v2 |
| Export PDF joueur | ✅ | jsPDF + html2canvas, watermark CONFIDENTIEL, toast succès/erreur |
| Export PDF shadow team | ✅ | Même stack, toast succès/erreur |
| Rapport IA Claude API | ✅ | api/generate-scout-report.ts — ANTHROPIC_API_KEY requise — toast persistant pendant génération |
| Onboarding wizard | ✅ | 3 étapes, auto-complétion checklist, sauvegarde Supabase |
| Mode démo /demo | ✅ | Données fictives complètes, pas de Supabase |
| Notifications cloche | ✅ | 5 types via useNotifications + Supabase realtime |
| Calendrier matchs | ⚠️ | FixturesList fonctionne si fixtures importées, sinon vide |
| Mode présentation | ✅ | PlayerDetail fullscreen (Fullscreen API), bouton "Quitter" flottant |
| Globe 3D interactif | ✅ | Three.js, pins par pays, filtres label (ELITE/U23…), clic → Players filtré par nationalité |
| Filtres rapides (chips) | ✅ | En forme/ELITE/U23/Ligue 1/Premier League/< 5M — bandeau scrollable Players |
| Filtre valeur marchande | ✅ | Select preset AdvancedSearch : Toutes/<1M/1-5M/5-20M/>20M (minValueM + maxValueM) |
| Recherches sauvegardées | ✅ | localStorage (max 5), dropdown "Mes recherches", restore/delete |
| Toasts globaux | ✅ | ToastContext, duration:0 = persistant, max 3 simultanés |
| Percentiles joueur | ✅ | usePercentile hook, calcul vs ligue + position |
| Trend badges 🔥/📉 | ✅ | getTrend() sur scores simulés, filtre client-side |
| Shadow Team | ✅ | 5 formations, assignation par poste, export PDF, toast auto-build |
| Scoring personnalisé | ✅ | Pro+ uniquement — sliders pondération par position |
| Invitations équipe | ✅ | Email via Resend API (RESEND_API_KEY requise), toast confirmation |
| Mobile PWA | ✅ | manifest.json, bottom nav, swipe cards |
| Notes joueur + dictée vocale | ✅ | SpeechRecognition API + sauvegarde Supabase, toast enregistrement |
| Snapshots historique | ✅ | npm run snapshot — à lancer chaque matin |
| Évolution tab fiche joueur | ✅ | LineChart + AreaChart — vide si pas de player_history |
| CSV import | ✅ | Drag-drop + aperçu + upsert Supabase, toast résultat |
| Newsletter | ✅ | Top players live Supabase, copie presse-papiers |
| Partage shortlist | ✅ | Génère token, URL publique /shortlist/:token — lecture seule |

---

## ⚠️ SECTION 6 — STUBS & PROBLÈMES STRUCTURELS

| Fichier | Type | Description |
|---|---|---|
| `PlayerStatusBadge.tsx` | Stub | `api/player-status.ts` retourne toujours `{ status: 'fit' }` — jamais blessé/suspendu |
| `Upload.tsx` | Validation | CSV inseré/mis à jour sans validation de colonnes — valeurs NULL possibles |
| `player_history` | Colonne | Utilise `overall_score` (snapshots) — différent de `players.scout_score` — vérifier cohérence |
| `Dashboard` | Widget vide | Widget "Activité récente" toujours vide — `shortlist_entries` n'existe pas, fallback `[]` |
| `Dashboard` | Widget vide | Widget "Top 3 progressions" vide si `npm run snapshot` jamais lancé |
| `FixturesList` | Données | Vide si fixtures non importées pour le club concerné |

---

## 🖥️ SECTION 7 — ESPACES VIDES DESKTOP

| Page | Zone vide | Cause |
|---|---|---|
| Dashboard | Widget "Activité récente" | shortlist_entries inexistant → fallback [] |
| Dashboard | Widget "Top 3 progressions" | player_history vide si snapshot non lancé |
| Dashboard | Pas de 3e colonne très grand écran | Layout 2 colonnes max (2fr 1fr) |
| PlayerDetail — Évolution | LineChart + AreaChart vides | player_history vide pour ce joueur |
| PlayerDetail — IA | Zone blanche au chargement | Normal — généré à la demande |
| PlayerDetail — Prochains matchs | FixturesList vide | Fixtures non importées |
| Players | Liste vide premier lancement | Base sans joueurs importés |
| ShadowTeam | Terrain entier vide | Aucun joueur assigné |
| Settings.tsx | maxWidth: 720px | Espace blanc sur écrans > 1400px |
| PlayerDetail | maxWidth: 1000px | Large écrans sous-utilisés |
| Compare | maxWidth: 1000px | Comparateur limité même avec 3 joueurs |
| Billing | maxWidth: 680px | Page étroite sur desktop |

---

## ⚡ SECTION 8 — PERFORMANCE

| Critère | Statut | Détail |
|---|---|---|
| Lazy loading pages | ✅ Complet | **Toutes les 24 pages** sont `React.lazy()` dans App.tsx |
| TanStack Query | ✅ Étendu | Utilisé dans 8+ hooks : usePlayers, usePlayer, usePercentile, usePlayerHistory, useSimilarPlayers, useGlobeData, useFixtures, useScoutReport |
| Globe lazy-loadé | ✅ | `Globe/Globe.tsx` chunké séparément par Vite |
| Skeleton screens | ✅ Partiel | Skeleton.tsx utilisé dans Players.tsx |
| Virtualisation liste | ❌ Absent | Players.tsx charge tout en mémoire (ok jusqu'à ~500 joueurs) |
| useInfiniteQuery | ❌ Absent | Pas de scroll infini — pagination client-side PAGE_SIZE=50 |
| Sentry monitoring | ✅ Installé | `@sentry/react ^10.46.0` + `VITE_SENTRY_DSN` |

> **Risque** : au-delà de 500 joueurs, la liste Players.tsx peut ramer (pas de virtualisation ni pagination infinie côté serveur).

---

## 🛠️ SECTION 9 — STACK & CONFIG

### Dépendances principales
| Package | Version | Usage |
|---|---|---|
| react | ^19.2.4 | UI |
| react-dom | ^19.2.4 | Rendu |
| react-router-dom | ^7.13.1 | Routing (lazy, ProtectedRoute) |
| @supabase/supabase-js | ^2.99.3 | BDD + auth + realtime |
| @tanstack/react-query | ^5.94.5 | Cache + fetching — 8+ hooks |
| recharts | ^3.8.0 | Graphiques (LineChart, AreaChart, RadarChart, PieChart…) |
| @dnd-kit/core+sortable | ^6.3.1 / ^10.0.0 | Drag-and-drop Shortlist + ShadowTeam |
| three | — | Globe 3D (WorldMap) |
| jspdf | ^4.2.1 | Export PDF |
| html2canvas | ^1.4.1 | Capture DOM → PDF |
| lucide-react | ^0.577.0 | Icônes |
| @stripe/stripe-js | ^9.0.0 | Paiements client |
| stripe | ^21.0.1 | SDK serveur Stripe |
| @sentry/react | ^10.46.0 | Monitoring erreurs |
| react-swipeable | ^7.0.2 | Swipe mobile Players |
| canvas-confetti | ^1.9.4 | Animation onboarding terminé |
| vite | ^8.0.1 | Bundler |
| typescript | ~5.9.3 | Typage |

### Scripts npm disponibles
```
npm run dev                  — serveur local
npm run build                — build production (tsc + vite)
npm run preview              — preview build local
npm run snapshot             — ⭐ À LANCER CHAQUE MATIN — snapshots + notifs
npm run scrape:all           — FBref Big 5 saison courante
npm run scrape:ligue1        — FBref Ligue 1 uniquement
npm run scrape:dry           — dry-run sans écriture DB
npm run import:2425          — import pipeline 2024-25
npm run import:big5-2425     — 7 ligues 2024-25 (80/ligue)
npm run import:history       — historique via api-sports.io (100 req/jour)
npm run import:historical    — ⚠️ ~2h — FBref historique 2018-2024
npm run import:historical:dry — dry-run historique
npm run scrape:values        — valeurs marchandes Transfermarkt
npm run scrape:understat     — xG Understat
npm run import:api-football  — fixtures via API-Football
```

### Vercel config
- **SPA rewrite** : `/(.*) → /index.html` (React Router compatible)
- **Crons actifs** :
  - `0 3 * * *` → `/api/cron/update-players` (03h00 chaque nuit)
  - `0 4 * * *` → `/api/cron/update-fixtures` (04h00 chaque nuit)
- **Headers sécurité** : X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, XSS-Protection
- **Cache assets** : `/assets/*` → max-age=1 an (immutable)

---

## 🔑 SECTION 10 — VARIABLES D'ENVIRONNEMENT

| Variable | Côté | Statut |
|---|---|---|
| `VITE_SUPABASE_URL` | Client (public) | ✅ Configurée |
| `VITE_SUPABASE_ANON_KEY` | Client (public) | ✅ Configurée |
| `VITE_SENTRY_DSN` | Client (public) | ✅ Configurée |
| `VITE_STRIPE_PUBLIC_KEY` | Client (public) | ✅ Configurée (null-safe si absente) |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | Client (public) | ✅ Configurée (Billing.tsx) |
| `VITE_ADMIN_EMAILS` | Client (public) | ✅ Configurée (usePlan.ts) |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement | ✅ Configurée |
| `ANTHROPIC_API_KEY` | Serveur uniquement | ✅ Configurée |
| `RESEND_API_KEY` | Serveur uniquement | ✅ Configurée |
| `SENTRY_AUTH_TOKEN` | Build CI uniquement | ✅ Configurée |
| `API_FOOTBALL_KEY` | Python scripts uniquement | ✅ Configurée |
| `FOOTBALL_DATA_API_KEY` | Serveur (fixtures) | ✅ Configurée |
| `STRIPE_SECRET_KEY` | Serveur uniquement | ✅ Configurée |
| `STRIPE_WEBHOOK_SECRET` | Serveur uniquement | ✅ Configurée |
| `CRON_SECRET` | Serveur (crons) | ✅ Configurée |
| `APP_URL` | Serveur (crons) | ✅ Configurée |

> ⚠️ `.env` local contient ~5 lignes — les autres variables sont configurées uniquement dans Vercel.

---

## 🗄️ SECTION 11 — SUPABASE TABLES

| Table | Utilisée dans | Migrations SQL |
|---|---|---|
| `profiles` | useOrganization, Settings, Onboarding | profiles-rls-v2.sql |
| `players` | usePlayers, usePlayer, Dashboard, Upload… | players-columns-migration.sql |
| `player_history` | usePlayerHistory, PlayerDetail (overall_score) | player-history-migration.sql |
| `player_market_values` | PlayerDetail — historique valeur | market-value-migration.sql |
| `shortlist_groups` | Shortlist.tsx | shortlist-v2-migration.sql |
| `shortlists` | Shortlist.tsx (entrées) | shortlist-v2-migration.sql |
| `shortlist_shares` | Shortlist.tsx, SharedShortlist.tsx | shortlist-v2-migration.sql |
| `player_notes` | PlayerDetail — onglet Notes | notes-migration.sql |
| `scout_reports` | useScoutReport, ScoutReportForm | scout-reports-migration.sql |
| `notifications` | useNotifications, NotificationBell | notifications-migration.sql |
| `cron_logs` | CronLogs.tsx, Dashboard | cron-logs-migration.sql |
| `organizations` | useOrganization, Settings | schema-multitenancy.sql |
| `user_organizations` | useOrganization | schema-multitenancy.sql |
| `team_invitations` | Settings.tsx, AcceptInvitation | team-invitations-migration.sql |
| `scoring_profiles` | useScoringProfile, Settings | custom-scoring-migration.sql |
| `waitlist` | WaitlistForm.tsx | waitlist.sql |

> ⚠️ `shortlist_entries` n'existe PAS — c'était le nom de table incorrect. La vraie table est `shortlists`.
> ⚠️ `player_history` utilise la colonne `overall_score` (snapshots historiques), distincte de `players.scout_score`.

---

## 🐛 SECTION 12 — BUGS CONNUS & WARNINGS

| Fichier | Ligne | Type | Description |
|---|---|---|---|
| `AuthContext.tsx` | 44 | warn | 429 rate-limit détecté — session existante conservée |
| `AuthContext.tsx` | 47 | warn | getSession error — loggué silencieusement |
| `OnboardingChecklist.tsx` | 70 | warn | Profile fetch error (code RLS) — silencieux |
| `OnboardingChecklist.tsx` | 82 | warn | Profile fetch failed — catch général |
| `lib/stripe.ts` | 6 | warn | VITE_STRIPE_PUBLIC_KEY non définie en local — null-safe |
| `hooks/useOrganization.ts` | 119 | error | fetchOrganization error — max 3 retries via useRef guard |
| `hooks/useSpeechRecognition.ts` | 78 | warn | SpeechRecognition error non-aborted |
| `pages/NewsletterPage.tsx` | 103 | error | Newsletter generation failed |
| `pages/PlayerDetail.tsx` | 333 | error | PDF export failed — toast erreur affiché |
| `pages/ShadowTeam.tsx` | 568 | error | Shadow team PDF export failed — toast erreur |
| `pages/Shortlist.tsx` | 335/359/370 | warn | shortlist_groups / shortlists / shares — silencieux, fallback [] |
| `components/WaitlistForm.tsx` | 42 | error | Supabase error waitlist insert |
| `pages/Settings.tsx` | 348 | warn | Fetch silencieux `.catch(console.warn)` |
| `main.tsx` | 31 | warn | Service Worker registration failed |

---

> 📋 **Action prioritaire** : `npm run snapshot` chaque matin pour alimenter les widgets Dashboard + onglet Évolution.
> 📋 **SQL à exécuter si 406 persiste** : `supabase/profiles-rls-v2.sql` dans Supabase SQL Editor.
> 📋 **Colonne `overall_score`** : utilisée dans `player_history` (snapshots) — différente de `players.scout_score` — ne pas confondre.

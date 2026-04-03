# 🧠 VIZION — Project Memory
> Généré le 2026-04-03 | Source: analyse statique complète du code

---

## 📌 SECTION 1 — PAGES & ROUTES

### Routes publiques (sans auth)
| Route | Composant | Statut |
|---|---|---|
| `/` | Landing.tsx | ✅ Fonctionnel — marketing, waitlist form |
| `/login` | Login.tsx | ✅ Fonctionnel — auth Supabase email/mdp |
| `/register` | Register.tsx | ✅ Fonctionnel — inscription |
| `/demo` | Demo.tsx | ✅ Fonctionnel — démo interactive données fictives |
| `/privacy` | Privacy.tsx | ✅ Statique |
| `/terms` | Terms.tsx | ✅ Statique |
| `/shortlist/:token` | SharedShortlist.tsx | ✅ Route existante, page en cours de finalisation |
| `/invite/:token` | AcceptInvitation.tsx | ✅ Fonctionnel — accepter invitation org |

### Routes protégées (auth requise)
| Route | Composant | Statut |
|---|---|---|
| `/onboarding` | Onboarding.tsx | ✅ Fonctionnel — wizard 3 étapes |
| `/dashboard` | Dashboard.tsx | ✅ Fonctionnel — KPIs, charts, widgets |
| `/players` | Players.tsx | ✅ Fonctionnel — liste + filtres avancés + mobile swipe |
| `/players/:id` | PlayerDetail.tsx | ✅ Fonctionnel — fiche complète 6 onglets |
| `/compare` | Compare.tsx | ✅ Fonctionnel — radar chart 1 à 3 joueurs |
| `/shortlist` | Shortlist.tsx | ✅ Fonctionnel — groupes, tags, DnD, share links |
| `/newsletter` | NewsletterPage.tsx | ⚠️ Partiel — données hardcodées fictives, bouton "Generate" non connecté |
| `/upload` | Upload.tsx | ⚠️ Partiel — sélection CSV OK, bouton "Import" non connecté |
| `/settings` | Settings.tsx | ✅ Fonctionnel — profil, org, scoring, invitations |
| `/settings/billing` | Billing.tsx | ✅ Fonctionnel — Stripe checkout + portal |
| `/shadow-team` | ShadowTeam.tsx | ✅ Fonctionnel — 5 formations, drag joueurs, export PDF |
| `/admin/cron` | CronLogs.tsx | ✅ Fonctionnel — logs cron jobs (admin only) |
| `/admin/data` | DataDashboard.tsx | ✅ Fonctionnel — stats DB + déclenchement scraping (admin only) |

---

## 🧩 SECTION 2 — COMPOSANTS

| Composant | Rôle | Utilisé dans |
|---|---|---|
| `Layout.tsx` | Sidebar desktop + bottom nav mobile + header + CompareBar | Toutes les pages protégées |
| `ProtectedRoute.tsx` | Guard auth — redirige vers /login si non connecté | App.tsx |
| `AdminRoute.tsx` | Guard rôle admin | App.tsx (/admin/data) |
| `AdvancedSearch.tsx` | Panneau filtres avancés (position, ligue, âge, score, forme, pied…) | Players.tsx |
| `CompareBar.tsx` | Barre flottante sélection joueurs pour comparateur | Layout.tsx |
| `CommandPalette.tsx` | Palette ⌘K — recherche live joueurs + navigation rapide | Layout.tsx |
| `NotificationBell.tsx` | Cloche avec dropdown (score_change, new_player, transfer, contrat…) | Layout.tsx |
| `OnboardingChecklist.tsx` | Widget progression onboarding 4 étapes avec progress ring | Dashboard.tsx |
| `TrendBadge.tsx` | Badge forme 🔥/📈/📉 calculé sur scores simulés | Players.tsx, PlayerDetail.tsx |
| `ScoreSparkline.tsx` | Mini graphique SVG polyline évolution score | Players.tsx, Dashboard.tsx |
| `PercentileBadge.tsx` | Badge "Top X% des ST · Ligue 1" vs pairs | PlayerDetail.tsx |
| `FixturesList.tsx` | Liste prochains matchs du club (DOM/EXT) | PlayerDetail.tsx — onglet Profil |
| `PlayerStatusBadge.tsx` | Badge statut joueur (fit/blessé/suspendu/doute) | PlayerDetail.tsx |
| `PlayerPDFReport.tsx` | Rapport PDF off-screen rendu par html2canvas + jsPDF | PlayerDetail.tsx |
| `ScoutReportForm.tsx` | Formulaire rapport de scouting structuré | PlayerDetail.tsx — onglet Rapports |
| `SimilarPlayers.tsx` | Suggestions joueurs similaires par profil statistique | PlayerDetail.tsx |
| `Toast.tsx` | Notifications toast temporaires | Partout via contexte |
| `Skeleton.tsx` | Squelettes de chargement | Players.tsx |
| `UpgradeBanner.tsx` | Bandeau upgrade plan Pro/Pro+ | Players.tsx, PlayerDetail.tsx |
| `ErrorFallback.tsx` | Page d'erreur React Error Boundary | main.tsx |
| `SplashScreen.tsx` | Écran de démarrage animé | main.tsx |
| `VizionLogo.tsx` | Logo SVG VIZION | Layout.tsx, Demo.tsx, Login.tsx |
| `WaitlistForm.tsx` | Formulaire liste d'attente avec Supabase | Landing.tsx |

---

## ✅ SECTION 3 — FONCTIONNALITÉS ACTIVES

| Fonctionnalité | Statut | Notes |
|---|---|---|
| KPIs Dashboard cliquables | ✅ | Redirigent vers /players avec filtres |
| Boutons shortlist / comparateur / PDF | ✅ | Tous connectés dans Players.tsx + PlayerDetail.tsx |
| Recherche ⌘K | ✅ | Recherche live Supabase + navigation page |
| Stripe Checkout | ✅ | redirectToCheckout() + redirectToPortal() dans Billing.tsx |
| Auth login/register | ✅ | PKCE flow, storageKey vizion-auth-v2 |
| Export PDF | ✅ | jsPDF + html2canvas, watermark CONFIDENTIEL |
| Rapport IA Claude API | ✅ | api/generate-scout-report.ts — ANTHROPIC_API_KEY requise |
| Onboarding wizard | ✅ | 3 étapes, auto-complétion checklist, sauvegarde Supabase |
| Mode démo /demo | ✅ | Données fictives, pas de Supabase |
| Notifications cloche | ✅ | 5 types via useNotifications + Supabase realtime |
| Calendrier matchs | ⚠️ | FixturesList fonctionne si fixtures importées, sinon vide |
| Percentiles joueur | ✅ | usePercentile hook, calcul vs ligue + position |
| Trend badges 🔥/📉 | ✅ | getTrend() sur scores simulés, filtre client-side |
| Shadow Team | ✅ | 5 formations, assignation par poste, export PDF |
| Scoring personnalisé | ✅ | Pro+ uniquement — sliders pondération par position |
| Invitations équipe | ✅ | Email via Resend API (RESEND_API_KEY requise) |
| Mobile PWA | ✅ | manifest.json, bottom nav, swipe cards |
| Notes joueur + dictée vocale | ✅ | SpeechRecognition API + sauvegarde Supabase |
| Snapshots historique | ✅ | npm run snapshot — à lancer chaque matin |
| Évolution tab fiche joueur | ✅ | LineChart + AreaChart — vide si pas de player_history |

---

## ⚠️ SECTION 4 — BOUTONS NON CONNECTÉS

| Fichier | Ligne | Problème |
|---|---|---|
| `NewsletterPage.tsx` | 25 | Bouton "Generate Newsletter" — pas de `onClick`, pas de handler |
| `NL.tsx` | 1 | Même page dupliquée — bouton idem non connecté |
| `Upload.tsx` | 1 | Bouton "Import Players" — affiche ✅ fichier choisi mais ne pousse rien vers Supabase |
| `PlayerStatusBadge.tsx` | — | api/player-status.ts retourne toujours `{ status: 'fit' }` — jamais blessé/suspendu |
| `Demo.tsx` | 629 | onClick vide `() => {` dans section CTA signup |

> Aucun `onClick={() => {}}` strict ni `href="#"` trouvé dans le reste du code.
> Les `cursor: not-allowed` sont tous légitimes (loading states, limites plan).

---

## 🖥️ SECTION 5 — ESPACES VIDES DESKTOP

| Page | Zone vide | Cause |
|---|---|---|
| Dashboard | Widget "Activité récente" vide | Besoin de shortlist_entries en base |
| Dashboard | Widget "Top 3 progressions" vide | Besoin de npm run snapshot lancé |
| Dashboard | Pas de 3e colonne sur très grand écran | Layout en 2 colonnes max (2fr 1fr) |
| PlayerDetail — onglet Évolution | LineChart + AreaChart vides | player_history vide pour ce joueur |
| PlayerDetail — onglet IA | Zone blanche au chargement | Normal — généré à la demande |
| PlayerDetail — Prochains matchs | FixturesList vide | Fixtures non importées pour ce club |
| Players | Liste vide premier lancement | Base sans joueurs importés |
| ShadowTeam | Terrain entier vide | Aucun joueur assigné, pas de suggestion auto |
| Newsletter /newsletter | Données fictives hardcodées | Yamal, Pedri, Endrick — pas reliés à la vraie base |
| Settings.tsx | maxWidth: 720px | Beaucoup d'espace blanc sur écrans > 1400px |
| PlayerDetail | maxWidth: 1000px | Idem — large écrans sous-utilisés |
| Compare | maxWidth: 1000px | Comparateur limité en largeur même si 3 joueurs |
| Billing | maxWidth: 680px | Page très étroite sur desktop |
| Admin pages | maxWidth: 800-900px | OK pour admin, acceptable |

---

## ⚡ SECTION 6 — PERFORMANCE

| Critère | Statut | Détail |
|---|---|---|
| TanStack Query | ✅ Installé | `@tanstack/react-query ^5.94.5` — non utilisé dans src/ (installé mais pas encore branché) |
| Lazy loading pages | ❌ Absent | Toutes les pages importées statiquement dans App.tsx |
| Virtualisation liste | ❌ Absent | Players.tsx charge tout en mémoire — ok jusqu'à ~500 joueurs |
| Skeleton screens | ✅ Partiel | Skeleton.tsx existe, utilisé dans Players.tsx uniquement |
| Sentry monitoring | ✅ Installé | `@sentry/react ^10.46.0` + `VITE_SENTRY_DSN` |
| Bundle splitting | ❌ Absent | Vite split automatique mais pas de lazy() explicite |

> **Risque** : au-delà de 500 joueurs en base, la liste Players.tsx pourrait ramer (pas de pagination infinie ni virtualisation).

---

## 🛠️ SECTION 7 — STACK & CONFIG

### Dépendances principales
| Package | Version | Usage |
|---|---|---|
| react | ^19.2.4 | UI |
| react-dom | ^19.2.4 | Rendu |
| react-router-dom | ^7.13.1 | Routing |
| @supabase/supabase-js | ^2.99.3 | BDD + auth + realtime |
| recharts | ^3.8.0 | Graphiques (LineChart, AreaChart, RadarChart) |
| @tanstack/react-query | ^5.94.5 | Installé, non branché |
| @dnd-kit/core+sortable | ^6.3.1 / ^10.0.0 | Drag-and-drop Shortlist |
| jspdf | ^4.2.1 | Export PDF |
| html2canvas | ^1.4.1 | Capture DOM → PDF |
| lucide-react | ^0.577.0 | Icônes |
| @stripe/stripe-js | ^9.0.0 | Paiements |
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

## 🔑 SECTION 8 — VARIABLES D'ENVIRONNEMENT

| Variable | Côté | Statut |
|---|---|---|
| `VITE_SUPABASE_URL` | Client (public) | ✅ Configurée |
| `VITE_SUPABASE_ANON_KEY` | Client (public) | ✅ Configurée |
| `VITE_SENTRY_DSN` | Client (public) | ✅ Configurée |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement | ✅ Configurée |
| `ANTHROPIC_API_KEY` | Serveur uniquement | ✅ Configurée |
| `RESEND_API_KEY` | Serveur uniquement | ✅ Configurée |
| `SENTRY_AUTH_TOKEN` | Build CI uniquement | ✅ Configurée |
| `API_FOOTBALL_KEY` | Python scripts uniquement | ✅ Configurée |
| `FOOTBALL_DATA_API_KEY` | Serveur (fixtures) | ✅ Configurée |
| `VITE_STRIPE_PUBLIC_KEY` | Client (public) | ✅ Configurée |
| `STRIPE_SECRET_KEY` | Serveur uniquement | ✅ Configurée |
| `STRIPE_WEBHOOK_SECRET` | Serveur uniquement | ✅ Configurée |
| `STRIPE_PRICE_PRO_MONTHLY` | Serveur uniquement | ✅ Configurée |
| `CRON_SECRET` | Serveur (crons) | ✅ Configurée |
| `APP_URL` | Serveur (crons) | ✅ Configurée |

> ⚠️ .env contient 5 lignes — certaines variables ci-dessus peuvent être manquantes localement mais configurées dans Vercel.

---

## 🗄️ SECTION 9 — SUPABASE (fichiers SQL)

| Fichier | Contenu | Statut |
|---|---|---|
| `schema-multitenancy.sql` | Tables organizations, profiles, user_organizations | ✅ Exécuté |
| `rls-policies.sql` | Policies RLS initiales toutes tables | ✅ Exécuté |
| `rls-fix.sql` | Correctifs RLS récursion infinie | ✅ Exécuté |
| `fix-organizations-rls.sql` | Fix RLS orgs | ✅ Exécuté |
| `profiles-rls-fix.sql` | Fix intermédiaire profiles | ✅ Exécuté |
| `profiles-rls-v2.sql` | Reset complet policies profiles + upsert profil Karim | ❓ À exécuter si 406 persiste |
| `players-columns-migration.sql` | Colonnes xg, xa, is_u23, scout_label, per90… | ✅ Exécuté |
| `shortlist-v2-migration.sql` | Tables shortlist_groups, shortlist_entries, shortlist_shares, tags | ✅ Exécuté |
| `notifications-migration.sql` | Table notifications + trigger score_change | ✅ Exécuté |
| `notes-migration.sql` | Table player_notes | ✅ Exécuté |
| `market-value-migration.sql` | Colonne market_value_eur + player_market_values | ✅ Exécuté |
| `team-invitations-migration.sql` | Table team_invitations | ✅ Exécuté |
| `custom-scoring-migration.sql` | Table scoring_profiles (scoring personnalisé) | ✅ Exécuté |
| `scout-reports-migration.sql` | Table scout_reports | ✅ Exécuté |
| `contract-migration.sql` | Colonnes contrat (expiration, valeur) | ✅ Exécuté |
| `onboarding-migration.sql` | Colonne onboarding_checklist dans profiles | ✅ Exécuté |
| `cron-logs-migration.sql` | Table cron_logs | ✅ Exécuté |
| `understat-migration.sql` | Colonnes xg_understat, xa_understat | ✅ Exécuté |
| `dedup-migration.sql` | Contrainte unicité (name, team) + déduplication | ✅ Exécuté |
| `player-history-migration.sql` | Table player_history (snapshots historiques) | ✅ Exécuté |
| `waitlist.sql` | Table waitlist | ✅ Exécuté |
| `security-audit.sql` | Audit policies + vérifications sécurité | ✅ Référence |

---

## 🐛 SECTION 10 — BUGS CONNUS & WARNINGS

| Fichier | Ligne | Type | Description |
|---|---|---|---|
| `AuthContext.tsx` | 44 | warn | 429 rate-limit détecté — session existante conservée |
| `AuthContext.tsx` | 47 | warn | getSession error — loggué silencieusement |
| `OnboardingChecklist.tsx` | 70 | warn | Profile fetch error (code RLS) — affiche rien, silencieux |
| `OnboardingChecklist.tsx` | 82 | warn | Profile fetch failed — catch général |
| `lib/stripe.ts` | 6 | warn | VITE_STRIPE_PUBLIC_KEY non définie en local |
| `hooks/useOrganization.ts` | 116 | error | fetchOrganization error — loggué console |
| `hooks/useSpeechRecognition.ts` | 78 | warn | SpeechRecognition error non-aborted |
| `pages/PlayerDetail.tsx` | 335 | error | PDF export failed — alert() affiché |
| `pages/Shortlist.tsx` | 338/365/378 | error | Erreurs fetch shortlist_groups / entries / shares |
| `components/WaitlistForm.tsx` | 42 | error | Supabase error waitlist insert |
| `pages/Settings.tsx` | 343 | warn | Fetch silencieux `.catch(console.warn)` |
| `main.tsx` | 19 | warn | Service Worker registration failed |

### Problèmes structurels restants
- **Newsletter** : données fictives hardcodées (Yamal, Pedri, Endrick) — à brancher sur vraie DB
- **Upload CSV** : bouton "Import" sans handler — à connecter à l'API d'import Supabase
- **PlayerStatusBadge** : retourne toujours `fit` — api/player-status.ts est un stub
- **TanStack Query** : installé mais non utilisé — les fetches sont en `useEffect` directs
- **Lazy loading** : aucun `React.lazy()` — bundle initial charge toutes les pages
- **player_history vide** : graphiques Évolution et Dashboard vides tant que snapshot non lancé

---

> 📋 **Action prioritaire** : `npm run snapshot` chaque matin pour alimenter les widgets Dashboard + onglet Évolution.
> 📋 **SQL à exécuter si 406 persiste** : `supabase/profiles-rls-v2.sql` dans Supabase SQL Editor.

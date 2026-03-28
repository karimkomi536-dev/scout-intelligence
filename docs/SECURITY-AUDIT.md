# VIZION — Security Audit Report

**Date:** 2026-03-28
**Scope:** Row Level Security (RLS) — Supabase public schema
**Method:** Static analysis of all migration SQL files

---

## Summary

| Metric | Value |
|---|---|
| Tables audited | 15 |
| Tables with RLS enabled | 15 |
| Tables with RLS disabled | 0 |
| Critical issues | 3 |
| High issues | 3 |
| Medium issues | 5 |
| Low / informational | 4 |

All tables have RLS enabled. The issues below are policy-level, not RLS-level.

---

## Table Status

| Table | RLS | Policies | SELECT scope | Issues |
|---|---|---|---|---|
| `players` | ✅ | 4 | `public` (anon + auth) | 🔴 Anon read, no org isolation |
| `organizations` | ✅ | 4 | `is_org_member()` | 🟠 Unlimited creation |
| `profiles` | ✅ | 3 | own or org member | 🟡 No DELETE policy |
| `user_organizations` | ✅ | 7 | org member | 🟠 Duplicate policies, self-ref risk |
| `shortlists` | ✅ | 5 | owner + share | ✅ OK |
| `shortlist_groups` | ✅ | 2 | owner + SECURITY DEFINER | ✅ OK |
| `shortlist_shares` | ✅ | 2 | owner + `USING (true)` | 🟠 All tokens publicly readable |
| `notes` | ✅ | 3 | owner only | 🟡 No UPDATE policy |
| `notifications` | ✅ | 3 | owner only | ✅ OK (INSERT = service_role only) |
| `invitations` | ✅ | 4 | admin + pending | 🔴 PII leak, no email verification |
| `scoring_profiles` | ✅ | 3 | org member | 🟡 No DELETE policy |
| `player_history` | ✅ | 1 | all authenticated | 🟡 No org isolation |
| `market_value_history` | ✅ | 1 | all authenticated | 🟡 No org isolation |
| `waitlist` | ✅ | 2 | anon insert only | ✅ OK (by design) |
| `api_keys` | ❌ | — | — | ⚫ Table does not exist |

---

## Issues — Critical 🔴

### C-1 · `players` — Anonymous read exposes all data

**File:** `supabase/rls-policies.sql` line 37
**Policy:** `players_select_public`

```sql
CREATE POLICY "players_select_public"
  ON players FOR SELECT TO public   -- 'public' = anon + authenticated
  USING (true);                     -- ALL rows, no filter
```

**Risk:** Any unauthenticated user (with only the anon key) can read every player in the database, including players belonging to specific organizations (`organization_id IS NOT NULL`). The `individual_stats`, `scout_score`, and `scout_label` fields represent proprietary scouting analysis.

**Fix:** See `supabase/rls-fix.sql` — restrict to `authenticated` and filter by org.

---

### C-2 · `invitations` — PII leak via pending invitation query

**File:** `supabase/team-invitations-migration.sql` line 44
**Policy:** `invitations_select_pending`

```sql
CREATE POLICY "invitations_select_pending" ON invitations
  FOR SELECT USING (accepted_at IS NULL AND expires_at > now());
```

**Risk:** Any authenticated user (no org membership required) can query all pending invitations and retrieve `email`, `organization_id`, `role`, and `invited_by` fields. This leaks PII (email addresses) and org structure to any authenticated user.

**Fix:** Add email match check — `auth.email() = email` — so only the intended recipient can look up their invitation.

---

### C-3 · `invitations` — No email verification on acceptance

**File:** `supabase/team-invitations-migration.sql` line 73
**Policy:** `invitations_update_accept`

```sql
CREATE POLICY "invitations_update_accept" ON invitations
  FOR UPDATE
  USING (accepted_at IS NULL AND expires_at > now())
  WITH CHECK (accepted_at IS NOT NULL);
```

**Risk:** Any authenticated user who obtains a valid token (exploitable via C-2) can accept an invitation intended for a different email address, gaining unauthorized access to an organization.

**Fix:** Add `auth.email() = email` to both USING and WITH CHECK clauses.

---

## Issues — High 🟠

### H-1 · `shortlist_shares` — All share tokens publicly readable

**File:** `supabase/shortlist-v2-migration.sql` line 143
**Policy:** `shortlist_shares: public read`

```sql
CREATE POLICY "shortlist_shares: public read" ON shortlist_shares
  FOR SELECT USING (true);
```

**Risk:** Every share token, its associated `list_id`, and its expiry are readable by anyone (including anonymous users). While tokens are 128-bit UUIDs (not guessable by brute force), this enables full enumeration via the Supabase API if the anon key is known.

**Fix:** Restrict to token-specific lookup: `USING (true)` is acceptable if the client always queries with `WHERE token = $token`, but exposing the full table allows mass enumeration. Narrow to: `USING (expires_at IS NULL OR expires_at > now())` and consider adding a separate function for token validation.

---

### H-2 · `user_organizations` — Self-referential policy risks PGRST301

**File:** `supabase/team-invitations-migration.sql` line 99
**Policy:** `user_org_admin_delete`

```sql
CREATE POLICY "user_org_admin_delete" ON user_organizations
  FOR DELETE USING (
    user_id != auth.uid()
    AND organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_organizations self_row   -- ← reads user_organizations
      WHERE self_row.user_id = auth.uid()         --   from within a policy ON user_organizations
        AND self_row.role = 'admin'
        AND self_row.organization_id = user_organizations.organization_id
    )
  );
```

**Risk:** This policy queries the `user_organizations` table from within a policy defined on `user_organizations`. PostgREST applies RLS to the sub-query, which re-evaluates this same policy — potential infinite recursion (PGRST301). The `SECURITY DEFINER` functions (`is_org_admin`, `is_org_member`) were added specifically to avoid this pattern.

**Fix:** Replace the inner `EXISTS` with a call to the existing `is_org_admin()` function, which uses `SECURITY DEFINER` to bypass RLS on the sub-query.

---

### H-3 · `user_organizations` — Duplicate conflicting policies

**Files:** `supabase/schema-multitenancy.sql` + `supabase/team-invitations-migration.sql`

Both files create policies on `user_organizations`. Multiple permissive SELECT policies apply with OR logic — the less restrictive one wins:

| Policy | Source | SELECT condition |
|---|---|---|
| `user_orgs_select_member` | schema-multitenancy | `is_org_member(organization_id)` |
| `user_org_select_same_org` | team-invitations | `profiles.organization_id = active_org` |

The second policy leaks membership data for users who share the same *active* org as the requester, even if they were never formally members of the queried sub-org. Similarly for INSERT:

| Policy | INSERT condition |
|---|---|
| `user_orgs_insert_admin` | admin of org |
| `user_org_self_insert` | any authenticated user (user_id = auth.uid()) |

`user_org_self_insert` allows any authenticated user to insert themselves into any organization with any role. This completely bypasses the admin gate.

**Fix:** Drop `user_org_self_insert` — the accept-invitation flow should use a `SECURITY DEFINER` function instead.

---

## Issues — Medium 🟡

### M-1 · `notes` — Missing UPDATE policy

**File:** `supabase/notes-migration.sql`
Users cannot edit their own notes from the client (no UPDATE policy defined).
**Fix:** Add `CREATE POLICY "notes_update_owner" ON notes FOR UPDATE USING/WITH CHECK (auth.uid() = user_id)`.

---

### M-2 · `profiles` — Missing DELETE policy

**File:** `supabase/schema-multitenancy.sql`
Users cannot delete their own profile.
**Fix:** Add `CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE USING (user_id = auth.uid())`.

---

### M-3 · `scoring_profiles` — Missing DELETE policy

**File:** `supabase/custom-scoring-migration.sql`
Org members cannot delete scoring profiles from the client.
**Fix:** Add DELETE policy mirroring the existing SELECT policy.

---

### M-4 · `player_history` — No org isolation

**File:** `supabase/player-history-migration.sql`
Policy: `USING (true)` for all authenticated users.
Any authenticated user can read score history for players belonging to other organizations.
**Fix:** Join through `players.organization_id` and filter by org membership, or keep open for global players only.

---

### M-5 · `market_value_history` — No org isolation

**File:** `supabase/market-value-migration.sql`
Same issue as M-4. All authenticated users can read market value history for all players.

---

## Issues — Low / Informational 🟢

### L-1 · `players` — Blocked CRUD policies are redundant

`players_insert_service_only` (`WITH CHECK (false)`), `players_update_service_only` (`USING (false)`), and `players_delete_service_only` (`USING (false)`) create restrictive policies that block client-side writes. This is correct behaviour — `service_role` bypasses RLS regardless. However, with RLS enabled and no permissive INSERT/UPDATE/DELETE policy, these operations are already blocked. The policies add confusion without adding security.

### L-2 · `waitlist` — No rate limiting at DB level

Any anonymous user can insert unlimited entries (different emails). Consider application-level or Supabase Edge Function rate limiting.

### L-3 · `organizations` — Unlimited creation

`orgs_insert_authenticated` allows any authenticated user to create unlimited organizations. No plan-based gate at the DB level. Enforce limits in application code or a trigger.

### L-4 · `api_keys` table — Not created

The table `api_keys` mentioned in the audit requirements does not exist in any migration. If API key authentication is planned, it requires: table creation + RLS + secure hash storage (never store raw keys).

---

## Recommended Fixes Priority

| Priority | Issue | Action |
|---|---|---|
| 🔴 P0 | C-2 + C-3: Invitation PII + email bypass | Fix policies immediately |
| 🔴 P0 | H-3: `user_org_self_insert` role bypass | Drop policy, use DEFINER function |
| 🟠 P1 | C-1: Players anon read | Restrict to `authenticated` |
| 🟠 P1 | H-2: Self-referential delete policy | Refactor with `is_org_admin()` |
| 🟠 P1 | H-1: Share token enumeration | Add expiry filter |
| 🟡 P2 | M-1: notes UPDATE | Add policy |
| 🟡 P2 | M-2: profiles DELETE | Add policy |
| 🟡 P2 | M-3: scoring_profiles DELETE | Add policy |
| 🟡 P3 | M-4/M-5: history no org isolation | Add org filter |

---

## Fix SQL

See `supabase/rls-fix.sql` for ready-to-run corrections for all P0/P1/P2 issues.

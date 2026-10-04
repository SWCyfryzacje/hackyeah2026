# Database tests

## `group_routes_rls.sql`

Security tests for "Wspólne trasy" (migrations `20261004090000_group_routes.sql`,
`20261004130000_group_routes_delete.sql`):
RLS policies, grants and the security definer RPCs that protect routes, chat and
the creator's live location.

**It always rolls back.** The whole script is one transaction (`begin;` … `rollback;`).
Fake profiles (`rls_test_*`), routes, messages and locations are created inside it
and disappear at the end. It never touches existing rows.

### How it works

- It runs as a privileged role (`postgres`) and switches into `authenticated` / `anon`
  with `set local role` and a simulated Clerk JWT in `request.jwt.claims`
  (`auth.jwt()->>'sub'` = `rls_test_creator`, `rls_test_member`, `rls_test_member2`,
  `rls_test_outsider`, `rls_test_noprof`).
- Each case writes one row into a temp table; an expected error is caught, so one
  failure does not stop the rest. A statement that should have failed but succeeded
  is rolled back on the spot.
- The last result set is the table `n | result (PASS/FAIL) | name | detail`.

### What it covers

| # | Area |
|---|------|
| 1 | Outsider sees a public route row, but not its participants, chat or location (also while live) |
| 2 | Outsider sees nothing of a private route; `join_group_route` fails; `join_group_route_by_code` works and opens access |
| 3 | Members see the location only while the route is `live`; `finish` deletes it |
| 4 | `get_group_route_participants`: members only; nick = username → display_name → `Turysta-XXXX`; no email |
| 5 | `list_group_routes()`: public open routes + my routes, correct `my_role` and `participant_count` |
| 6 | `anon` cannot read any table or call any RPC |
| 7 | Direct INSERT/UPDATE/DELETE/TRUNCATE by `authenticated` → permission denied; private helpers not callable |
| 8 | Only the creator starts/finishes/cancels/deletes and shares location, and location only while `live` |
| 9 | Chat: members post while scheduled/live; no `user_id`/`created_at` spoofing; body rules; read-only after the end |
| 10 | Creator cannot leave; a member who leaves loses access |
| 11 | Status transitions: start ← scheduled, finish ← live, cancel ← live (row kept) |
| 12 | `private.auto_finish_group_routes()` |
| 13 | `private.purge_group_route_messages()` (7-day retention) |
| 14 | Catalog: RLS enabled, no unexpected policies, realtime publication, replica identity default |
| 15 | `delete_group_route`: scheduled only; alone any time, with participants until 2 h before the start; row and its participants/chat deleted |

### Running it

- **Supabase SQL Editor:** paste the whole file and run it. The result grid shows the table.
- **Supabase MCP:** `execute_sql` with the file contents (only the last result set is
  returned, which is the table).
- **psql:** `psql "$DATABASE_URL" -f supabase/tests/group_routes_rls.sql`

Requires the group routes migrations to be applied. Expect every row to be `PASS`.

Known failures (2026-10-04): `9.6b` and `9.7b`. The message CHECK
`char_length(btrim(body)) between 1 and 500` accepts tab/newline-only bodies, and
bodies of any length if they are padded with spaces. Both pass once the constraint is
`check (char_length(body) <= 500 and body ~ '[^[:space:]]')`.

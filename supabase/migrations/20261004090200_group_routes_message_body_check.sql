-- Fix the chat message length check found by supabase/tests/group_routes_rls.sql (cases 9.6b, 9.7b).
-- The old check measured char_length(btrim(body)): btrim() strips only spaces and the limit applied
-- after trimming, so space-padded bodies of any size and tab/newline-only bodies were accepted.
-- New rule: at most 500 characters as stored, and at least one non-whitespace character.
-- Needs 20261004090000_group_routes.sql. Safe to re-run.

alter table public.group_route_messages
  drop constraint if exists group_route_messages_body_check;

alter table public.group_route_messages
  add constraint group_route_messages_body_check
  check (char_length(body) <= 500 and body ~ '[^[:space:]]');

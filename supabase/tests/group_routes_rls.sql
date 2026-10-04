-- RLS / RPC security tests for "Wspólne trasy" (group routes).
-- Covers migrations 20261004090000_group_routes.sql and
-- 20261004130000_group_routes_delete.sql. See supabase/tests/README.md.
--
-- Everything runs in ONE transaction that ends with ROLLBACK: fake profiles,
-- routes, messages and locations are created inside it and vanish afterwards.
-- Run as a privileged role (postgres: SQL Editor or MCP execute_sql), which
-- switches into `authenticated` / `anon` with a simulated Clerk JWT.
-- The last result set is the PASS/FAIL table.

begin;

-- ---------------------------------------------------------------------------
-- Harness
-- ---------------------------------------------------------------------------

create temp table rls_results (
  n serial primary key,
  name text not null,
  ok boolean not null,
  detail text
) on commit drop;
grant insert, select on pg_temp.rls_results to authenticated, anon;
grant usage on sequence pg_temp.rls_results_n_seq to authenticated, anon;

create function pg_temp.rec(p_name text, p_ok boolean, p_detail text default null)
returns void language sql as $$
  insert into pg_temp.rls_results (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail);
$$;

-- Simulated Clerk user: auth.jwt() reads request.jwt.claims.
create function pg_temp.as_user(p_sub text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.as_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;

create function pg_temp.as_admin()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Fixture ids live in transaction-local settings rls.<key>.
create function pg_temp.id(p_key text)
returns uuid language sql as $$
  select current_setting('rls.' || p_key)::uuid;
$$;

-- Creates a route as the current user (security invoker), returns its id as text.
create function pg_temp.mk(p_title text, p_visibility text, p_end interval default interval '3 hours')
returns text language sql as $$
  select public.create_group_route(
    p_title, 'RLS test fixture', p_visibility,
    now() + interval '1 hour',
    case when p_end is null then null else now() + p_end end,
    50.06, 19.93,
    '[{"latitude":50.06,"longitude":19.93},{"latitude":50.07,"longitude":19.94}]'::jsonb,
    '[]'::jsonb, 1200, 900, null
  )::text;
$$;

create function pg_temp.expect_ok(p_name text, p_sql text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    perform pg_temp.rec(p_name, false, 'unexpected error: ' || sqlerrm);
    return;
  end;
  perform pg_temp.rec(p_name, true, 'ok');
end;
$$;

-- Passes when p_sql raises (and SQLERRM matches p_like, if given). A statement
-- that wrongly succeeds is rolled back so it cannot skew later cases.
create function pg_temp.expect_error(p_name text, p_sql text, p_like text default null)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    raise exception 'rls_test: no error' using errcode = 'P0099';
  exception
    when sqlstate 'P0099' then
      perform pg_temp.rec(p_name, false, 'expected an error, statement succeeded (rolled back)');
      return;
    when others then
      perform pg_temp.rec(p_name, p_like is null or sqlerrm ilike p_like,
        'error: ' || sqlerrm || case when p_like is null then '' else ' [want ' || p_like || ']' end);
      return;
  end;
end;
$$;

create function pg_temp.check_count(p_name text, p_sql text, p_expected bigint)
returns void language plpgsql as $$
declare
  v bigint;
begin
  begin
    execute p_sql into v;
  exception when others then
    perform pg_temp.rec(p_name, false, 'query error: ' || sqlerrm);
    return;
  end;
  perform pg_temp.rec(p_name, v is not distinct from p_expected,
    format('expected %s, got %s', p_expected, v));
end;
$$;

create function pg_temp.check_text(p_name text, p_sql text, p_expected text)
returns void language plpgsql as $$
declare
  v text;
begin
  begin
    execute p_sql into v;
  exception when others then
    perform pg_temp.rec(p_name, false, 'query error: ' || sqlerrm);
    return;
  end;
  perform pg_temp.rec(p_name, v is not distinct from p_expected,
    format('expected %L, got %L', p_expected, v));
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Catalog sanity (RLS on, no stray policies, realtime safe for DELETEs)
-- ---------------------------------------------------------------------------

select pg_temp.as_admin();
select pg_temp.check_count('14.1 RLS enabled on all 4 tables',
  $q$select count(*) from pg_class
     where oid in ('public.group_routes'::regclass, 'public.group_route_participants'::regclass,
                   'public.group_route_messages'::regclass, 'public.group_route_locations'::regclass)
       and relrowsecurity$q$, 4);
select pg_temp.check_count('14.2 only SELECT policies + the message INSERT policy, all to authenticated',
  $q$select count(*) from pg_policies
     where schemaname = 'public' and tablename like 'group_route%'
       and (roles <> '{authenticated}'
            or not (cmd = 'SELECT' or (tablename = 'group_route_messages' and cmd = 'INSERT')))$q$, 0);
select pg_temp.check_count('14.3 all 4 tables in the supabase_realtime publication',
  $q$select count(*) from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename like 'group_route%'$q$, 4);
select pg_temp.check_count('14.4 replica identity default (DELETE events carry only the PK)',
  $q$select count(*) from pg_class
     where oid in ('public.group_routes'::regclass, 'public.group_route_participants'::regclass,
                   'public.group_route_messages'::regclass, 'public.group_route_locations'::regclass)
       and relreplident = 'd'$q$, 4);

-- ---------------------------------------------------------------------------
-- 0. Fixtures
-- ---------------------------------------------------------------------------

insert into public.profiles (user_id, username) values ('rls_test_creator', 'rls_creator_nick');
insert into public.profiles (user_id, display_name) values ('rls_test_member', 'Member Display');
insert into public.profiles (user_id, username) values ('rls_test_member2', '   ');
insert into public.profiles (user_id) values ('rls_test_outsider');
-- rls_test_noprof deliberately has no profile row.

select pg_temp.as_user('rls_test_creator');
select set_config('rls.pub',      pg_temp.mk('RLS public', 'public'), true);
select set_config('rls.priv',     pg_temp.mk('RLS private', 'private'), true);
select set_config('rls.can',      pg_temp.mk('RLS to cancel', 'public'), true);
select set_config('rls.af_live',  pg_temp.mk('RLS autofinish live', 'public'), true);
select set_config('rls.af_sched', pg_temp.mk('RLS autofinish scheduled', 'public'), true);
select set_config('rls.af_noend', pg_temp.mk('RLS autofinish no end', 'private', null), true);
-- delete_group_route: alone (start in 1 h), with a participant 1 h / 3 h before the start.
select set_config('rls.del_solo',  pg_temp.mk('RLS delete alone', 'public'), true);
select set_config('rls.del_late',  pg_temp.mk('RLS delete too late', 'public'), true);
select set_config('rls.del_early', pg_temp.mk('RLS delete early', 'public', null), true);

select pg_temp.as_admin();
select set_config('rls.priv_code',
  (select join_code from public.group_routes where id = pg_temp.id('priv')), true);
select pg_temp.check_count('0.1 create_group_route adds the creator as participant role=creator',
  $q$select count(*) from public.group_route_participants
     where route_id = pg_temp.id('priv') and user_id = 'rls_test_creator' and role = 'creator'$q$, 1);
select pg_temp.check_count('0.2 new route starts scheduled with a 6-char join code',
  $q$select count(*) from public.group_routes
     where id = pg_temp.id('priv') and status = 'scheduled' and join_code ~ '^[A-HJ-NP-Z2-9]{6}$'$q$, 1);

select pg_temp.as_user('rls_test_noprof');
select pg_temp.expect_error('0.3 create_group_route without a profile row fails',
  $q$select pg_temp.mk('x', 'public')$q$, '%Brak profilu%');
select pg_temp.as_user('rls_test_creator');
select pg_temp.expect_error('0.4 create_group_route with planned_start 2 h in the past fails',
  $q$select public.create_group_route('x', null, 'public', now() - interval '2 hours', null, 50, 19,
       '[{"latitude":50,"longitude":19},{"latitude":50.1,"longitude":19.1}]'::jsonb, null, null, null, null)$q$,
  '%przesz%');

-- Joins while scheduled.
select pg_temp.as_user('rls_test_member');
select pg_temp.expect_ok('0.5 member joins the public route', $q$select public.join_group_route(pg_temp.id('pub'))$q$);
select pg_temp.expect_ok('0.6 member joins the private route by code',
  $q$select public.join_group_route_by_code(current_setting('rls.priv_code'))$q$);
select pg_temp.as_user('rls_test_noprof');
select pg_temp.expect_ok('0.7 user without profile joins the public route',
  $q$select public.join_group_route(pg_temp.id('pub'))$q$);
select pg_temp.as_user('rls_test_member');
select pg_temp.expect_ok('0.8 member joins the delete-too-late route',
  $q$select public.join_group_route(pg_temp.id('del_late'))$q$);
select pg_temp.expect_ok('0.9 member joins the delete-early route',
  $q$select public.join_group_route(pg_temp.id('del_early'))$q$);
select pg_temp.expect_ok('0.10 member posts on the delete-early route',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('del_early'), 'do usuniecia')$q$);
select pg_temp.as_admin();
update public.group_routes set planned_start = now() + interval '3 hours'
where id = pg_temp.id('del_early');

-- ---------------------------------------------------------------------------
-- 9a. Messages while scheduled
-- ---------------------------------------------------------------------------

select pg_temp.as_user('rls_test_member');
select pg_temp.expect_ok('9.1 member posts in public route while scheduled',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), 'hej z publicznej')$q$);
select pg_temp.expect_ok('9.2 member posts in private route while scheduled',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('priv'), 'hej z prywatnej')$q$);
select pg_temp.expect_error('9.3 member cannot spoof user_id (column-level grant)',
  $q$insert into public.group_route_messages (route_id, user_id, body)
     values (pg_temp.id('pub'), 'rls_test_creator', 'spoof')$q$, '%permission denied%');
select pg_temp.expect_error('9.4 member cannot set created_at (column-level grant)',
  $q$insert into public.group_route_messages (route_id, body, created_at)
     values (pg_temp.id('pub'), 'backdated', now() - interval '30 days')$q$, '%permission denied%');
select pg_temp.expect_error('9.5 empty body rejected',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), '')$q$);
select pg_temp.expect_error('9.6 spaces-only body rejected',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), '     ')$q$);
-- btrim() without a character list strips only spaces.
select pg_temp.expect_error('9.6b tab/newline-only body rejected',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), E'\t\n\r\n')$q$);
select pg_temp.expect_error('9.7 501-char body rejected',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), repeat('a', 501))$q$);
-- The CHECK measures the trimmed length, so padding must not get around the limit.
select pg_temp.expect_error('9.7b 10001-char body padded with spaces rejected',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), repeat(' ', 10000) || 'a')$q$);
select pg_temp.expect_ok('9.8 500-char body accepted (boundary)',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), repeat('a', 500))$q$);
select pg_temp.as_user('rls_test_creator');
select pg_temp.expect_ok('9.9 creator posts in the route to cancel while scheduled',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('can'), 'zaraz anuluje')$q$);
select pg_temp.as_user('rls_test_outsider');
select pg_temp.expect_error('9.10 outsider cannot post in public route',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), 'intruz')$q$,
  '%row-level security%');
select pg_temp.expect_error('9.11 outsider cannot post in private route',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('priv'), 'intruz')$q$,
  '%row-level security%');

select pg_temp.as_admin();
select pg_temp.check_count('9.12 message user_id comes from the JWT (default)',
  $q$select count(*) from public.group_route_messages
     where route_id = pg_temp.id('pub') and body = 'hej z publicznej' and user_id = 'rls_test_member'$q$, 1);

-- ---------------------------------------------------------------------------
-- 2/4/5. Reads while scheduled
-- ---------------------------------------------------------------------------

select pg_temp.as_user('rls_test_outsider');
select pg_temp.check_count('2.1 outsider: private route row hidden',
  $q$select count(*) from public.group_routes where id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('2.2 outsider: private route participants hidden',
  $q$select count(*) from public.group_route_participants where route_id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('2.3 outsider: private route messages hidden',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('2.4 outsider: no private routes visible at all (incl. the no-end one)',
  $q$select count(*) from public.group_routes where visibility = 'private'$q$, 0);
select pg_temp.expect_error('2.5 outsider: join_group_route(private id) fails like a missing route',
  $q$select public.join_group_route(pg_temp.id('priv'))$q$, '%Nie znaleziono trasy%');
select pg_temp.expect_error('2.6 join_group_route(random id) gives the same error',
  $q$select public.join_group_route(gen_random_uuid())$q$, '%Nie znaleziono trasy%');
select pg_temp.expect_error('2.7 join_group_route_by_code with a wrong code fails',
  $q$select public.join_group_route_by_code('IIIIII')$q$, '%Nieprawid%');
select pg_temp.check_count('1.1 outsider: public route row visible',
  $q$select count(*) from public.group_routes where id = pg_temp.id('pub')$q$, 1);
select pg_temp.check_count('1.2 outsider: public route participants hidden',
  $q$select count(*) from public.group_route_participants where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('1.3 outsider: public route messages hidden',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.expect_error('4.1 get_group_route_participants fails for outsider (private)',
  $q$select * from public.get_group_route_participants(pg_temp.id('priv'))$q$, '%Nie jeste%uczestnikiem%');
select pg_temp.expect_error('4.2 get_group_route_participants fails for outsider (public)',
  $q$select * from public.get_group_route_participants(pg_temp.id('pub'))$q$, '%Nie jeste%uczestnikiem%');
select pg_temp.check_count('5.1 list (outsider): public open route listed with my_role null',
  $q$select count(*) from public.list_group_routes() where id = pg_temp.id('pub') and my_role is null$q$, 1);
select pg_temp.check_count('5.2 list (outsider): no private routes',
  $q$select count(*) from public.list_group_routes() where visibility = 'private'$q$, 0);
select pg_temp.check_count('5.3 list (outsider): public route participant_count = 3',
  $q$select participant_count from public.list_group_routes() where id = pg_temp.id('pub')$q$, 3);
select pg_temp.check_text('5.4 list: creator_nick = username',
  $q$select creator_nick from public.list_group_routes() where id = pg_temp.id('pub')$q$, 'rls_creator_nick');

select pg_temp.as_user('rls_test_member');
select pg_temp.check_count('2.8 member: private route row visible',
  $q$select count(*) from public.group_routes where id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_count('2.9 member: private route participants visible',
  $q$select count(*) from public.group_route_participants where route_id = pg_temp.id('priv')$q$, 2);
select pg_temp.check_count('2.10 member: private route messages visible',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_count('2.11 member: no-end private route (not joined) hidden',
  $q$select count(*) from public.group_routes where id = pg_temp.id('af_noend')$q$, 0);
select pg_temp.check_count('5.5 list (member): private route listed with my_role participant',
  $q$select count(*) from public.list_group_routes() where id = pg_temp.id('priv') and my_role = 'participant'$q$, 1);
select pg_temp.check_count('5.6 list (member): public route listed with my_role participant',
  $q$select count(*) from public.list_group_routes() where id = pg_temp.id('pub') and my_role = 'participant'$q$, 1);
select pg_temp.check_count('5.7 list (member): unjoined public route listed with my_role null',
  $q$select count(*) from public.list_group_routes() where id = pg_temp.id('can') and my_role is null$q$, 1);
select pg_temp.check_count('5.8 list (member): private participant_count = 2',
  $q$select participant_count from public.list_group_routes() where id = pg_temp.id('priv')$q$, 2);
select pg_temp.check_count('4.3 get_group_route_participants (member, private) returns 2 rows',
  $q$select count(*) from public.get_group_route_participants(pg_temp.id('priv'))$q$, 2);
select pg_temp.check_text('4.4 nick: username wins',
  $q$select nick from public.get_group_route_participants(pg_temp.id('priv')) where user_id = 'rls_test_creator'$q$,
  'rls_creator_nick');
select pg_temp.check_text('4.5 nick: display_name when username is null',
  $q$select nick from public.get_group_route_participants(pg_temp.id('priv')) where user_id = 'rls_test_member'$q$,
  'Member Display');
select pg_temp.check_text('4.6 nick: Turysta-XXXX when there is no profile row',
  $q$select nick from public.get_group_route_participants(pg_temp.id('pub')) where user_id = 'rls_test_noprof'$q$,
  'Turysta-PROF');
select pg_temp.check_text('4.7 participants: creator listed first',
  $q$select role from public.get_group_route_participants(pg_temp.id('pub')) limit 1$q$, 'creator');

select pg_temp.as_user('rls_test_creator');
select pg_temp.check_count('5.9 list (creator): my_role creator on own routes',
  $q$select count(*) from public.list_group_routes()
     where id in (pg_temp.id('pub'), pg_temp.id('priv'), pg_temp.id('af_noend')) and my_role = 'creator'$q$, 3);

select pg_temp.as_admin();
select pg_temp.check_count('4.8 no email column in get_group_route_participants / list_group_routes output',
  $q$select count(*) from pg_proc p, unnest(p.proargnames) a
     where p.oid in ('public.get_group_route_participants(uuid)'::regprocedure,
                     'public.list_group_routes()'::regprocedure)
       and a ilike '%mail%'$q$, 0);

-- ---------------------------------------------------------------------------
-- 7. Direct writes are denied (all state changes go through RPCs)
-- ---------------------------------------------------------------------------

select pg_temp.as_user('rls_test_member');
select pg_temp.expect_error('7.1 member: UPDATE group_routes set status=live denied',
  $q$update public.group_routes set status = 'live' where id = pg_temp.id('pub')$q$, '%permission denied%');
select pg_temp.expect_error('7.2 member: INSERT group_routes denied',
  $q$insert into public.group_routes (creator_id, title, visibility, join_code, planned_start, start_lat, start_lng, geometry)
     values ('rls_test_member', 'x', 'public', 'ZZZZZZ', now() + interval '1 hour', 50, 19,
             '[{"latitude":50,"longitude":19},{"latitude":50.1,"longitude":19.1}]'::jsonb)$q$, '%permission denied%');
select pg_temp.expect_error('7.3 member: DELETE group_routes denied',
  $q$delete from public.group_routes where id = pg_temp.id('pub')$q$, '%permission denied%');
select pg_temp.expect_error('7.4 member: UPDATE own participant role to creator denied',
  $q$update public.group_route_participants set role = 'creator'
     where route_id = pg_temp.id('pub') and user_id = 'rls_test_member'$q$, '%permission denied%');
select pg_temp.expect_error('7.5 member: INSERT location denied',
  $q$insert into public.group_route_locations (route_id, user_id, latitude, longitude)
     values (pg_temp.id('pub'), 'rls_test_member', 0, 0)$q$, '%permission denied%');
select pg_temp.expect_error('7.6 member: UPDATE locations denied',
  $q$update public.group_route_locations set latitude = 0 where route_id = pg_temp.id('pub')$q$, '%permission denied%');
select pg_temp.expect_error('7.7 member: DELETE locations denied',
  $q$delete from public.group_route_locations where route_id = pg_temp.id('pub')$q$, '%permission denied%');
select pg_temp.expect_error('7.8 member: UPDATE messages denied',
  $q$update public.group_route_messages set body = 'edited' where route_id = pg_temp.id('pub')$q$, '%permission denied%');
select pg_temp.expect_error('7.9 member: DELETE messages denied',
  $q$delete from public.group_route_messages where route_id = pg_temp.id('pub')$q$, '%permission denied%');
select pg_temp.expect_error('7.10 member: TRUNCATE messages denied',
  $q$truncate public.group_route_messages$q$, '%permission denied%');
select pg_temp.expect_error('7.11 member: private helper group_route_nick not executable',
  $q$select private.group_route_nick('rls_test_creator')$q$, '%permission denied%');
select pg_temp.expect_error('7.12 member: private.auto_finish_group_routes not executable',
  $q$select private.auto_finish_group_routes()$q$, '%permission denied%');
select pg_temp.expect_error('7.13 member: private.purge_group_route_messages not executable',
  $q$select private.purge_group_route_messages()$q$, '%permission denied%');

select pg_temp.as_user('rls_test_outsider');
select pg_temp.expect_error('7.14 outsider: INSERT self as participant of private route denied',
  $q$insert into public.group_route_participants (route_id, user_id, role)
     values (pg_temp.id('priv'), 'rls_test_outsider', 'participant')$q$, '%permission denied%');

select pg_temp.as_user('rls_test_creator');
select pg_temp.expect_error('7.15 creator: UPDATE own route (visibility) denied',
  $q$update public.group_routes set visibility = 'public' where id = pg_temp.id('priv')$q$, '%permission denied%');
select pg_temp.expect_error('7.16 creator: DELETE a participant denied',
  $q$delete from public.group_route_participants
     where route_id = pg_temp.id('pub') and user_id = 'rls_test_member'$q$, '%permission denied%');
select pg_temp.expect_error('7.17 creator: INSERT location directly denied',
  $q$insert into public.group_route_locations (route_id, user_id, latitude, longitude)
     values (pg_temp.id('pub'), 'rls_test_creator', 50, 19)$q$, '%permission denied%');

-- ---------------------------------------------------------------------------
-- 8/11. Role and status rules while scheduled
-- ---------------------------------------------------------------------------

select pg_temp.as_user('rls_test_member');
select pg_temp.expect_error('8.1 member cannot start',
  $q$select public.start_group_route(pg_temp.id('pub'))$q$, '%Tylko tw%');
select pg_temp.expect_error('8.2 member cannot cancel',
  $q$select public.cancel_group_route(pg_temp.id('pub'))$q$, '%Tylko tw%');
select pg_temp.expect_error('8.2a member cannot delete',
  $q$select public.delete_group_route(pg_temp.id('del_early'))$q$, '%Tylko tw%');
select pg_temp.expect_error('8.3 member cannot finish',
  $q$select public.finish_group_route(pg_temp.id('pub'))$q$, '%Tylko tw%');
select pg_temp.expect_error('8.4 member cannot update_group_route_location',
  $q$select public.update_group_route_location(pg_temp.id('pub'), 50, 19, 5)$q$, '%Tylko tw%');

select pg_temp.as_user('rls_test_creator');
select pg_temp.expect_error('8.5 creator cannot update_group_route_location while scheduled',
  $q$select public.update_group_route_location(pg_temp.id('pub'), 50, 19, 5)$q$, '%podczas trwaj%');
select pg_temp.expect_error('11.1 finish from scheduled fails',
  $q$select public.finish_group_route(pg_temp.id('pub'))$q$, '%Zako%czy% mo%na tylko trwaj%');
select pg_temp.expect_error('11.1a cancel from scheduled fails',
  $q$select public.cancel_group_route(pg_temp.id('pub'))$q$, '%Anulowa% mo%na tylko rozpocz%');

-- 15. delete_group_route (scheduled only; with participants until 2 h before the start)
select pg_temp.expect_ok('15.1 creator deletes a route without participants 1 h before the start',
  $q$select public.delete_group_route(pg_temp.id('del_solo'))$q$);
select pg_temp.expect_error('15.2 delete with a participant 1 h before the start fails',
  $q$select public.delete_group_route(pg_temp.id('del_late'))$q$, '%2 godziny przed startem%');
select pg_temp.expect_ok('15.3 creator deletes a route with a participant 3 h before the start',
  $q$select public.delete_group_route(pg_temp.id('del_early'))$q$);
select pg_temp.expect_error('15.4 delete an already deleted route fails',
  $q$select public.delete_group_route(pg_temp.id('del_solo'))$q$, '%Tylko tw%');

select pg_temp.as_admin();
select pg_temp.check_count('15.5 deleted routes are gone from the database',
  $q$select count(*) from public.group_routes where id in (pg_temp.id('del_solo'), pg_temp.id('del_early'))$q$, 0);
select pg_temp.check_count('15.6 participants and chat of a deleted route are gone (cascade)',
  $q$select (select count(*) from public.group_route_participants where route_id = pg_temp.id('del_early'))
          + (select count(*) from public.group_route_messages where route_id = pg_temp.id('del_early'))$q$, 0);
select pg_temp.check_count('15.7 route that could not be deleted is still scheduled',
  $q$select count(*) from public.group_routes where id = pg_temp.id('del_late') and status = 'scheduled'$q$, 1);
select pg_temp.as_user('rls_test_creator');

-- 3. A (stale) location row on a scheduled route is not readable by members.
select pg_temp.as_admin();
insert into public.group_route_locations (route_id, user_id, latitude, longitude)
values (pg_temp.id('pub'), 'rls_test_creator', 50.06, 19.93);
select pg_temp.as_user('rls_test_member');
select pg_temp.check_count('3.1 member: location of a scheduled route hidden (status filter)',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.as_admin();
delete from public.group_route_locations where route_id = pg_temp.id('pub');

-- ---------------------------------------------------------------------------
-- Go live
-- ---------------------------------------------------------------------------

select pg_temp.as_user('rls_test_creator');
select pg_temp.expect_ok('11.2 creator starts public route (scheduled -> live)',
  $q$select public.start_group_route(pg_temp.id('pub'))$q$);
select pg_temp.expect_ok('11.3 creator starts private route',
  $q$select public.start_group_route(pg_temp.id('priv'))$q$);
select pg_temp.expect_ok('11.4 creator starts auto-finish live route',
  $q$select public.start_group_route(pg_temp.id('af_live'))$q$);
select pg_temp.expect_error('11.5 start again (live) fails',
  $q$select public.start_group_route(pg_temp.id('pub'))$q$, '%tylko, gdy jest zaplanowana%');
select pg_temp.expect_error('11.6 delete a live route fails',
  $q$select public.delete_group_route(pg_temp.id('pub'))$q$, '%jeszcze nie rozpocz%');
select pg_temp.expect_ok('8.6 creator update_group_route_location while live (public)',
  $q$select public.update_group_route_location(pg_temp.id('pub'), 50.061, 19.931, 8)$q$);
select pg_temp.expect_ok('8.7 creator update_group_route_location while live (private)',
  $q$select public.update_group_route_location(pg_temp.id('priv'), 50.062, 19.932, 8)$q$);
select pg_temp.expect_ok('8.8 creator update_group_route_location (auto-finish route)',
  $q$select public.update_group_route_location(pg_temp.id('af_live'), 50.063, 19.933, 8)$q$);
select pg_temp.expect_ok('8.9 second update upserts (still one row)',
  $q$select public.update_group_route_location(pg_temp.id('pub'), 50.064, 19.934, 4)$q$);

select pg_temp.as_admin();
select pg_temp.check_count('8.10 only one location row per route (latest position)',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('pub') and latitude = 50.064$q$, 1);

select pg_temp.as_user('rls_test_member');
select pg_temp.expect_error('8.11 member cannot update_group_route_location while live',
  $q$select public.update_group_route_location(pg_temp.id('pub'), 0, 0, 1)$q$, '%Tylko tw%');
select pg_temp.expect_error('8.12 member cannot finish a live route',
  $q$select public.finish_group_route(pg_temp.id('pub'))$q$, '%Tylko tw%');
select pg_temp.check_count('3.2 member sees live location (public)',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('pub')$q$, 1);
select pg_temp.check_count('3.3 member sees live location (private)',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_count('3.4 member does not see location of a live route they did not join',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('af_live')$q$, 0);
select pg_temp.expect_ok('9.13 member posts while live',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), 'jestem w drodze')$q$);

select pg_temp.as_user('rls_test_outsider');
select pg_temp.check_count('1.4 outsider: live public route row visible',
  $q$select count(*) from public.group_routes where id = pg_temp.id('pub') and status = 'live'$q$, 1);
select pg_temp.check_count('1.5 outsider: live public route location hidden',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('1.6 outsider: live public route participants hidden',
  $q$select count(*) from public.group_route_participants where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('1.7 outsider: live public route messages hidden',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('1.8 outsider: no location rows readable at all',
  $q$select count(*) from public.group_route_locations$q$, 0);
select pg_temp.check_count('2.12 outsider: live private route row hidden',
  $q$select count(*) from public.group_routes where id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('2.13 outsider: live private route location hidden',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('5.10 list (outsider): live public route listed',
  $q$select count(*) from public.list_group_routes() where id = pg_temp.id('pub') and status = 'live'$q$, 1);

-- ---------------------------------------------------------------------------
-- 6. anon gets nothing
-- ---------------------------------------------------------------------------

select pg_temp.as_anon();
select pg_temp.expect_error('6.1 anon: SELECT group_routes denied',
  $q$select count(*) from public.group_routes$q$, '%permission denied%');
select pg_temp.expect_error('6.2 anon: SELECT group_route_participants denied',
  $q$select count(*) from public.group_route_participants$q$, '%permission denied%');
select pg_temp.expect_error('6.3 anon: SELECT group_route_messages denied',
  $q$select count(*) from public.group_route_messages$q$, '%permission denied%');
select pg_temp.expect_error('6.4 anon: SELECT group_route_locations denied',
  $q$select count(*) from public.group_route_locations$q$, '%permission denied%');
select pg_temp.expect_error('6.5 anon: INSERT message denied',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), 'anon')$q$, '%permission denied%');
select pg_temp.expect_error('6.6 anon: create_group_route denied',
  $q$select pg_temp.mk('anon', 'public')$q$, '%permission denied%');
select pg_temp.expect_error('6.7 anon: join_group_route denied',
  $q$select public.join_group_route(pg_temp.id('pub'))$q$, '%permission denied%');
select pg_temp.expect_error('6.8 anon: join_group_route_by_code denied',
  $q$select public.join_group_route_by_code(current_setting('rls.priv_code'))$q$, '%permission denied%');
select pg_temp.expect_error('6.9 anon: leave_group_route denied',
  $q$select public.leave_group_route(pg_temp.id('pub'))$q$, '%permission denied%');
select pg_temp.expect_error('6.10 anon: start_group_route denied',
  $q$select public.start_group_route(pg_temp.id('can'))$q$, '%permission denied%');
select pg_temp.expect_error('6.11 anon: finish_group_route denied',
  $q$select public.finish_group_route(pg_temp.id('pub'))$q$, '%permission denied%');
select pg_temp.expect_error('6.12 anon: cancel_group_route denied',
  $q$select public.cancel_group_route(pg_temp.id('can'))$q$, '%permission denied%');
select pg_temp.expect_error('6.12a anon: delete_group_route denied',
  $q$select public.delete_group_route(pg_temp.id('del_late'))$q$, '%permission denied%');
select pg_temp.expect_error('6.13 anon: update_group_route_location denied',
  $q$select public.update_group_route_location(pg_temp.id('pub'), 0, 0, 1)$q$, '%permission denied%');
select pg_temp.expect_error('6.14 anon: list_group_routes denied',
  $q$select count(*) from public.list_group_routes()$q$, '%permission denied%');
select pg_temp.expect_error('6.15 anon: get_group_route_participants denied',
  $q$select count(*) from public.get_group_route_participants(pg_temp.id('pub'))$q$, '%permission denied%');
select pg_temp.expect_error('6.16 anon: private helper group_route_is_member denied',
  $q$select private.group_route_is_member(pg_temp.id('pub'))$q$, '%permission denied%');

-- ---------------------------------------------------------------------------
-- 10. Leaving; 2. joining a private route by code
-- ---------------------------------------------------------------------------

select pg_temp.as_user('rls_test_creator');
select pg_temp.expect_error('10.1 creator cannot leave own route',
  $q$select public.leave_group_route(pg_temp.id('priv'))$q$, '%Tw%rca nie mo%e opu%ci%');

select pg_temp.as_user('rls_test_member2');
select pg_temp.expect_ok('10.2 member2 joins private route by code (lower case, padded)',
  $q$select public.join_group_route_by_code(lower('  ' || current_setting('rls.priv_code') || ' '))$q$);
select pg_temp.check_count('10.3 member2 sees private live location after joining',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_text('4.9 nick: Turysta-XXXX when username is whitespace and display_name null',
  $q$select nick from public.get_group_route_participants(pg_temp.id('priv')) where user_id = 'rls_test_member2'$q$,
  'Turysta-BER2');
select pg_temp.expect_ok('10.4 member2 leaves private route',
  $q$select public.leave_group_route(pg_temp.id('priv'))$q$);
select pg_temp.check_count('10.5 after leaving: private route row hidden',
  $q$select count(*) from public.group_routes where id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('10.6 after leaving: private chat hidden',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('10.7 after leaving: private location hidden',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('priv')$q$, 0);
select pg_temp.check_count('10.8 after leaving: private participants hidden',
  $q$select count(*) from public.group_route_participants where route_id = pg_temp.id('priv')$q$, 0);
select pg_temp.expect_error('10.9 after leaving: cannot post in private chat',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('priv'), 'jeszcze ja')$q$,
  '%row-level security%');
select pg_temp.expect_error('10.10 after leaving: get_group_route_participants fails',
  $q$select * from public.get_group_route_participants(pg_temp.id('priv'))$q$, '%Nie jeste%uczestnikiem%');

select pg_temp.as_user('rls_test_noprof');
select pg_temp.expect_ok('10.11 member leaves public route',
  $q$select public.leave_group_route(pg_temp.id('pub'))$q$);
select pg_temp.check_count('10.12 after leaving public route: row still visible',
  $q$select count(*) from public.group_routes where id = pg_temp.id('pub')$q$, 1);
select pg_temp.check_count('10.13 after leaving public route: location hidden',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('10.14 after leaving public route: chat hidden',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('pub')$q$, 0);

select pg_temp.as_user('rls_test_outsider');
select pg_temp.expect_ok('2.14 outsider joins private route by code',
  $q$select public.join_group_route_by_code(current_setting('rls.priv_code'))$q$);
select pg_temp.check_count('2.15 after code join: private route row visible',
  $q$select count(*) from public.group_routes where id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_count('2.16 after code join: private live location visible',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_count('2.17 after code join: private chat history visible',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_text('4.10 nick: Turysta-XXXX when profile has no names',
  $q$select nick from public.get_group_route_participants(pg_temp.id('priv')) where user_id = 'rls_test_outsider'$q$,
  'Turysta-IDER');
select pg_temp.check_count('5.11 list: participant_count after leave/join = 3',
  $q$select participant_count from public.list_group_routes() where id = pg_temp.id('priv')$q$, 3);

-- ---------------------------------------------------------------------------
-- Finish / cancel
-- ---------------------------------------------------------------------------

select pg_temp.as_user('rls_test_creator');
select pg_temp.expect_ok('11.7 creator finishes public route (live -> finished)',
  $q$select public.finish_group_route(pg_temp.id('pub'))$q$);
select pg_temp.expect_error('11.8 finish again fails',
  $q$select public.finish_group_route(pg_temp.id('pub'))$q$, '%Zako%czy% mo%na tylko trwaj%');
select pg_temp.expect_error('11.9 start a finished route fails',
  $q$select public.start_group_route(pg_temp.id('pub'))$q$, '%tylko, gdy jest zaplanowana%');
select pg_temp.expect_error('11.10 cancel a finished route fails',
  $q$select public.cancel_group_route(pg_temp.id('pub'))$q$, '%Anulowa% mo%na tylko rozpocz%');
select pg_temp.expect_error('11.10a delete a finished route fails',
  $q$select public.delete_group_route(pg_temp.id('pub'))$q$, '%jeszcze nie rozpocz%');
select pg_temp.expect_error('8.13 creator cannot update location after finish',
  $q$select public.update_group_route_location(pg_temp.id('pub'), 50, 19, 5)$q$, '%podczas trwaj%');
select pg_temp.expect_error('9.14 creator cannot post after finish',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), 'po fakcie')$q$,
  '%row-level security%');
select pg_temp.expect_ok('11.11a creator starts the route to cancel',
  $q$select public.start_group_route(pg_temp.id('can'))$q$);
select pg_temp.expect_ok('11.11 creator cancels a started route (live -> cancelled)',
  $q$select public.cancel_group_route(pg_temp.id('can'))$q$);
select pg_temp.expect_error('11.12 start a cancelled route fails',
  $q$select public.start_group_route(pg_temp.id('can'))$q$, '%tylko, gdy jest zaplanowana%');
select pg_temp.expect_error('11.13 cancel again fails',
  $q$select public.cancel_group_route(pg_temp.id('can'))$q$, '%Anulowa% mo%na tylko rozpocz%');
select pg_temp.expect_error('9.15 creator cannot post after cancel',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('can'), 'po anulowaniu')$q$,
  '%row-level security%');
select pg_temp.check_count('9.16 creator still reads cancelled route history',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('can')$q$, 1);

select pg_temp.as_admin();
select pg_temp.check_count('3.5 finish deleted the location row',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('11.15 cancelled route is kept with status cancelled and ended_at set',
  $q$select count(*) from public.group_routes where id = pg_temp.id('can') and status = 'cancelled' and ended_at is not null$q$, 1);
select pg_temp.check_count('11.14 finished route has status finished and ended_at set',
  $q$select count(*) from public.group_routes where id = pg_temp.id('pub') and status = 'finished' and ended_at is not null$q$, 1);
-- Stale row on a finished route must stay hidden too (status filter in the policy).
insert into public.group_route_locations (route_id, user_id, latitude, longitude)
values (pg_temp.id('pub'), 'rls_test_creator', 50.06, 19.93);

select pg_temp.as_user('rls_test_member');
select pg_temp.check_count('3.6 member: no location after finish (even a stale row)',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('3.7 member: private route location still visible while live (control)',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('priv')$q$, 1);
select pg_temp.expect_error('9.17 member cannot post after finish',
  $q$insert into public.group_route_messages (route_id, body) values (pg_temp.id('pub'), 'po fakcie')$q$,
  '%row-level security%');
select pg_temp.check_count('9.18 member still reads chat history after finish',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('pub')$q$, 3);
select pg_temp.check_count('5.12 list (member): finished route still listed for 7 days',
  $q$select count(*) from public.list_group_routes() where id = pg_temp.id('pub') and status = 'finished'$q$, 1);
select pg_temp.expect_error('2.18 joining a finished route fails',
  $q$select public.join_group_route(pg_temp.id('pub'))$q$, '%zako%czy%a%');

select pg_temp.as_user('rls_test_outsider');
select pg_temp.check_count('5.13 list (outsider): finished public route no longer listed',
  $q$select count(*) from public.list_group_routes() where id = pg_temp.id('pub')$q$, 0);

select pg_temp.as_admin();
delete from public.group_route_locations where route_id = pg_temp.id('pub');

-- ---------------------------------------------------------------------------
-- 12. private.auto_finish_group_routes()
-- ---------------------------------------------------------------------------

update public.group_routes
set planned_start = now() - interval '5 hours', planned_end = now() - interval '2 hours'
where id in (pg_temp.id('af_live'), pg_temp.id('af_sched'));
update public.group_routes
set planned_start = now() - interval '7 hours'
where id = pg_temp.id('af_noend');
select pg_temp.expect_ok('12.1 auto_finish_group_routes runs as privileged role',
  $q$select private.auto_finish_group_routes()$q$);
select pg_temp.check_text('12.2 live route past planned_end + 1 h -> finished',
  $q$select status from public.group_routes where id = pg_temp.id('af_live')$q$, 'finished');
select pg_temp.check_count('12.3 its location row deleted',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('af_live')$q$, 0);
select pg_temp.check_text('12.4 scheduled route past planned_end + 1 h -> cancelled',
  $q$select status from public.group_routes where id = pg_temp.id('af_sched')$q$, 'cancelled');
select pg_temp.check_text('12.5 scheduled route without end, start + 6 h passed -> cancelled',
  $q$select status from public.group_routes where id = pg_temp.id('af_noend')$q$, 'cancelled');
select pg_temp.check_text('12.6 live route within its window stays live',
  $q$select status from public.group_routes where id = pg_temp.id('priv')$q$, 'live');
select pg_temp.check_count('12.7 ...and keeps its location',
  $q$select count(*) from public.group_route_locations where route_id = pg_temp.id('priv')$q$, 1);
select pg_temp.check_count('12.8 auto-finished routes have ended_at set',
  $q$select count(*) from public.group_routes
     where id in (pg_temp.id('af_live'), pg_temp.id('af_sched'), pg_temp.id('af_noend')) and ended_at is not null$q$, 3);

-- ---------------------------------------------------------------------------
-- 13. private.purge_group_route_messages()
-- ---------------------------------------------------------------------------

update public.group_routes set ended_at = now() - interval '8 days' where id = pg_temp.id('pub');
update public.group_routes set ended_at = now() - interval '6 days' where id = pg_temp.id('can');
select set_config('rls.priv_msgs',
  (select count(*) from public.group_route_messages where route_id = pg_temp.id('priv'))::text, true);
select pg_temp.expect_ok('13.1 purge_group_route_messages runs as privileged role',
  $q$select private.purge_group_route_messages()$q$);
select pg_temp.check_count('13.2 messages of a route ended 8 days ago purged',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('pub')$q$, 0);
select pg_temp.check_count('13.3 messages of a route ended 6 days ago kept',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('can')$q$, 1);
select pg_temp.check_count('13.4 messages of a live route kept',
  $q$select count(*) from public.group_route_messages where route_id = pg_temp.id('priv')$q$,
  current_setting('rls.priv_msgs')::bigint);

-- ---------------------------------------------------------------------------
-- Results (last result set), then throw everything away.
-- ---------------------------------------------------------------------------

select pg_temp.as_admin();
select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
from pg_temp.rls_results
order by n;

rollback;

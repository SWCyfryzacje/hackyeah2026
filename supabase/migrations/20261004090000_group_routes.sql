-- Shared group routes ("Wspólne trasy"): routes, participants, chat messages and
-- the creator's live location. See SPEC.md / ARCHITECTURE.md.
--
-- Security model: clients only READ through RLS. Every state change goes through
-- the security definer RPCs below, which check the caller (auth.jwt()->>'sub'),
-- their role and the route status. The only direct write is inserting a chat
-- message, guarded by RLS. anon gets nothing.
--
-- Safe to re-run.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.group_routes (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null references public.profiles (user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text check (char_length(description) <= 500),
  visibility text not null check (visibility in ('public', 'private')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'cancelled')),
  join_code text not null unique,
  planned_start timestamptz not null,
  planned_end timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  start_lat double precision not null check (start_lat between -90 and 90),
  start_lng double precision not null check (start_lng between -180 and 180),
  geometry jsonb not null
    check (jsonb_typeof(geometry) = 'array' and jsonb_array_length(geometry) between 2 and 20000),
  stops jsonb not null default '[]'::jsonb
    check (jsonb_typeof(stops) = 'array' and jsonb_array_length(stops) <= 50),
  distance_m integer check (distance_m >= 0),
  duration_s integer check (duration_s >= 0),
  event_id bigint references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  check (planned_end is null or planned_end > planned_start)
);

comment on table public.group_routes is 'Shared routes with a planned start; public ones are listed for everyone, private ones are joined by join_code.';

create index if not exists group_routes_listing_idx
  on public.group_routes (visibility, status, planned_start);
create index if not exists group_routes_status_idx on public.group_routes (status);
create index if not exists group_routes_creator_idx on public.group_routes (creator_id);
create index if not exists group_routes_event_idx on public.group_routes (event_id);

create table if not exists public.group_route_participants (
  route_id uuid not null references public.group_routes (id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('creator', 'participant')),
  joined_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

create index if not exists group_route_participants_user_idx
  on public.group_route_participants (user_id);

create table if not exists public.group_route_messages (
  id bigint generated always as identity primary key,
  route_id uuid not null references public.group_routes (id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub'),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists group_route_messages_route_idx
  on public.group_route_messages (route_id, created_at);

-- Only the LATEST position of the creator, one row per route. No history.
create table if not exists public.group_route_locations (
  route_id uuid primary key references public.group_routes (id) on delete cascade,
  user_id text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision check (accuracy >= 0),
  updated_at timestamptz not null default now()
);

alter table public.group_routes enable row level security;
alter table public.group_route_participants enable row level security;
alter table public.group_route_messages enable row level security;
alter table public.group_route_locations enable row level security;

-- Supabase grants everything on new public tables by default: take it back.
revoke all on public.group_routes, public.group_route_participants,
  public.group_route_messages, public.group_route_locations from anon, authenticated;
grant select on public.group_routes, public.group_route_participants,
  public.group_route_messages, public.group_route_locations to authenticated;
-- Messages are the only direct write; user_id and created_at come from defaults.
grant insert (route_id, body) on public.group_route_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Private helpers (not exposed through the API; security definer so the
-- policies below don't recurse into each other's RLS)
-- ---------------------------------------------------------------------------

create or replace function private.group_route_is_member(p_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_route_participants
    where route_id = p_route_id and user_id = (select auth.jwt() ->> 'sub')
  );
$$;

create or replace function private.group_route_is_creator(p_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_routes
    where id = p_route_id and creator_id = (select auth.jwt() ->> 'sub')
  );
$$;

create or replace function private.group_route_status(p_route_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.group_routes where id = p_route_id;
$$;

-- username -> display_name -> 'Turysta-XXXX' (last 4 chars of the Clerk id)
create or replace function private.group_route_nick(p_user_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select coalesce(nullif(btrim(p.username), ''), nullif(btrim(p.display_name), ''))
     from public.profiles p where p.user_id = p_user_id),
    'Turysta-' || upper(right(p_user_id, 4))
  );
$$;

create or replace function private.group_route_new_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.group_routes where join_code = code);
  end loop;
  return code;
end;
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.group_route_is_member(uuid) to authenticated;
grant execute on function private.group_route_is_creator(uuid) to authenticated;
grant execute on function private.group_route_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies (read side + message insert)
-- ---------------------------------------------------------------------------

drop policy if exists "Public or joined routes are readable" on public.group_routes;
create policy "Public or joined routes are readable"
  on public.group_routes for select
  to authenticated
  using (visibility = 'public' or private.group_route_is_member(id));

drop policy if exists "Members see fellow participants" on public.group_route_participants;
create policy "Members see fellow participants"
  on public.group_route_participants for select
  to authenticated
  using (private.group_route_is_member(route_id));

drop policy if exists "Members read the chat" on public.group_route_messages;
create policy "Members read the chat"
  on public.group_route_messages for select
  to authenticated
  using (private.group_route_is_member(route_id));

drop policy if exists "Members post while the route is open" on public.group_route_messages;
create policy "Members post while the route is open"
  on public.group_route_messages for insert
  to authenticated
  with check (
    user_id = (select auth.jwt() ->> 'sub')
    and private.group_route_is_member(route_id)
    and private.group_route_status(route_id) in ('scheduled', 'live')
  );

drop policy if exists "Members see the live location" on public.group_route_locations;
create policy "Members see the live location"
  on public.group_route_locations for select
  to authenticated
  using (
    private.group_route_is_member(route_id)
    and private.group_route_status(route_id) = 'live'
  );

-- ---------------------------------------------------------------------------
-- RPCs (public API, authenticated only)
-- ---------------------------------------------------------------------------

create or replace function public.create_group_route(
  p_title text,
  p_description text,
  p_visibility text,
  p_planned_start timestamptz,
  p_planned_end timestamptz,
  p_start_lat double precision,
  p_start_lng double precision,
  p_geometry jsonb,
  p_stops jsonb,
  p_distance_m integer,
  p_duration_s integer,
  p_event_id bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := (select auth.jwt() ->> 'sub');
  new_id uuid;
begin
  if uid is null then
    raise exception 'Musisz być zalogowany.';
  end if;
  if not exists (select 1 from public.profiles where user_id = uid) then
    raise exception 'Brak profilu użytkownika. Spróbuj ponownie za chwilę.';
  end if;
  if p_planned_start < now() - interval '1 hour' then
    raise exception 'Start trasy nie może być w przeszłości.';
  end if;
  if p_planned_end is not null and p_planned_end <= p_planned_start then
    raise exception 'Koniec trasy musi być po starcie.';
  end if;

  insert into public.group_routes (
    creator_id, title, description, visibility, join_code,
    planned_start, planned_end, start_lat, start_lng,
    geometry, stops, distance_m, duration_s, event_id
  ) values (
    uid, btrim(p_title), nullif(btrim(p_description), ''), p_visibility,
    private.group_route_new_join_code(),
    p_planned_start, p_planned_end, p_start_lat, p_start_lng,
    p_geometry, coalesce(p_stops, '[]'::jsonb), p_distance_m, p_duration_s, p_event_id
  )
  returning id into new_id;

  insert into public.group_route_participants (route_id, user_id, role)
  values (new_id, uid, 'creator');

  return new_id;
end;
$$;

create or replace function public.join_group_route(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := (select auth.jwt() ->> 'sub');
  r public.group_routes;
begin
  if uid is null then
    raise exception 'Musisz być zalogowany.';
  end if;
  select * into r from public.group_routes where id = p_route_id;
  -- A private route is indistinguishable from a missing one here.
  if not found or r.visibility <> 'public' then
    raise exception 'Nie znaleziono trasy.';
  end if;
  if r.status not in ('scheduled', 'live') then
    raise exception 'Ta trasa już się zakończyła.';
  end if;
  insert into public.group_route_participants (route_id, user_id, role)
  values (p_route_id, uid, 'participant')
  on conflict (route_id, user_id) do nothing;
end;
$$;

create or replace function public.join_group_route_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := (select auth.jwt() ->> 'sub');
  r public.group_routes;
begin
  if uid is null then
    raise exception 'Musisz być zalogowany.';
  end if;
  select * into r from public.group_routes where join_code = upper(btrim(p_code));
  if not found then
    raise exception 'Nieprawidłowy kod trasy.';
  end if;
  if r.status not in ('scheduled', 'live') then
    raise exception 'Ta trasa już się zakończyła.';
  end if;
  insert into public.group_route_participants (route_id, user_id, role)
  values (r.id, uid, 'participant')
  on conflict (route_id, user_id) do nothing;
  return r.id;
end;
$$;

create or replace function public.leave_group_route(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := (select auth.jwt() ->> 'sub');
begin
  if private.group_route_is_creator(p_route_id) then
    raise exception 'Twórca nie może opuścić trasy. Możesz ją zakończyć lub anulować.';
  end if;
  delete from public.group_route_participants
  where route_id = p_route_id and user_id = uid;
end;
$$;

create or replace function public.start_group_route(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.group_route_is_creator(p_route_id) then
    raise exception 'Tylko twórca może rozpocząć trasę.';
  end if;
  update public.group_routes
  set status = 'live', started_at = now()
  where id = p_route_id and status = 'scheduled';
  if not found then
    raise exception 'Trasę można rozpocząć tylko, gdy jest zaplanowana.';
  end if;
end;
$$;

create or replace function public.finish_group_route(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.group_route_is_creator(p_route_id) then
    raise exception 'Tylko twórca może zakończyć trasę.';
  end if;
  update public.group_routes
  set status = 'finished', ended_at = now()
  where id = p_route_id and status = 'live';
  if not found then
    raise exception 'Zakończyć można tylko trwającą trasę.';
  end if;
  delete from public.group_route_locations where route_id = p_route_id;
end;
$$;

create or replace function public.cancel_group_route(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.group_route_is_creator(p_route_id) then
    raise exception 'Tylko twórca może anulować trasę.';
  end if;
  update public.group_routes
  set status = 'cancelled', ended_at = now()
  where id = p_route_id and status = 'scheduled';
  if not found then
    raise exception 'Anulować można tylko zaplanowaną trasę.';
  end if;
  delete from public.group_route_locations where route_id = p_route_id;
end;
$$;

create or replace function public.update_group_route_location(
  p_route_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := (select auth.jwt() ->> 'sub');
begin
  if not private.group_route_is_creator(p_route_id) then
    raise exception 'Tylko twórca udostępnia lokalizację.';
  end if;
  if private.group_route_status(p_route_id) <> 'live' then
    raise exception 'Lokalizację można udostępniać tylko podczas trwającej trasy.';
  end if;
  insert into public.group_route_locations (route_id, user_id, latitude, longitude, accuracy, updated_at)
  values (p_route_id, uid, p_lat, p_lng, p_accuracy, now())
  on conflict (route_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        accuracy = excluded.accuracy,
        updated_at = excluded.updated_at;
end;
$$;

-- Public routes that are still open + all of my routes (open, or ended in the
-- last 7 days). No geometry here; the details screen reads it from the table.
create or replace function public.list_group_routes()
returns table (
  id uuid,
  title text,
  description text,
  visibility text,
  status text,
  planned_start timestamptz,
  planned_end timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  start_lat double precision,
  start_lng double precision,
  distance_m integer,
  duration_s integer,
  event_id bigint,
  event_title text,
  creator_nick text,
  participant_count integer,
  my_role text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.jwt() ->> 'sub') as uid)
  select
    r.id, r.title, r.description, r.visibility, r.status,
    r.planned_start, r.planned_end, r.started_at, r.ended_at,
    r.start_lat, r.start_lng, r.distance_m, r.duration_s,
    r.event_id, e.title,
    private.group_route_nick(r.creator_id),
    (select count(*)::int from public.group_route_participants p where p.route_id = r.id),
    mine.role
  from public.group_routes r
  cross join me
  left join public.events e on e.id = r.event_id
  left join public.group_route_participants mine
    on mine.route_id = r.id and mine.user_id = me.uid
  where me.uid is not null
    and (
      (r.visibility = 'public' and r.status in ('scheduled', 'live'))
      or (mine.user_id is not null
          and (r.status in ('scheduled', 'live') or r.ended_at > now() - interval '7 days'))
    )
  order by (r.status = 'live') desc, r.planned_start asc
  limit 200;
$$;

create or replace function public.get_group_route_participants(p_route_id uuid)
returns table (
  user_id text,
  role text,
  nick text,
  avatar_url text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.group_route_is_member(p_route_id) then
    raise exception 'Nie jesteś uczestnikiem tej trasy.';
  end if;
  return query
    select p.user_id, p.role, private.group_route_nick(p.user_id), pr.avatar_url, p.joined_at
    from public.group_route_participants p
    left join public.profiles pr on pr.user_id = p.user_id
    where p.route_id = p_route_id
    order by (p.role = 'creator') desc, p.joined_at;
end;
$$;

revoke all on function
  public.create_group_route(text, text, text, timestamptz, timestamptz, double precision, double precision, jsonb, jsonb, integer, integer, bigint),
  public.join_group_route(uuid),
  public.join_group_route_by_code(text),
  public.leave_group_route(uuid),
  public.start_group_route(uuid),
  public.finish_group_route(uuid),
  public.cancel_group_route(uuid),
  public.update_group_route_location(uuid, double precision, double precision, double precision),
  public.list_group_routes(),
  public.get_group_route_participants(uuid)
from public, anon;

grant execute on function
  public.create_group_route(text, text, text, timestamptz, timestamptz, double precision, double precision, jsonb, jsonb, integer, integer, bigint),
  public.join_group_route(uuid),
  public.join_group_route_by_code(text),
  public.leave_group_route(uuid),
  public.start_group_route(uuid),
  public.finish_group_route(uuid),
  public.cancel_group_route(uuid),
  public.update_group_route_location(uuid, double precision, double precision, double precision),
  public.list_group_routes(),
  public.get_group_route_participants(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Cron jobs' work (scheduled in 20261004090100_group_routes_cron.sql)
-- ---------------------------------------------------------------------------

-- live -> finished, scheduled -> cancelled once planned_end + 1 h
-- (or planned_start + 6 h without an end) has passed. Drops their locations.
create or replace function private.auto_finish_group_routes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.group_routes
  set status = case status when 'live' then 'finished' else 'cancelled' end,
      ended_at = now()
  where status in ('scheduled', 'live')
    and now() > coalesce(planned_end + interval '1 hour', planned_start + interval '6 hours');
  get diagnostics n = row_count;

  delete from public.group_route_locations l
  using public.group_routes r
  where r.id = l.route_id and r.status <> 'live';

  return n;
end;
$$;

-- Chat history is kept read-only for 7 days after a route ends.
create or replace function private.purge_group_route_messages()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.group_route_messages m
  using public.group_routes r
  where r.id = m.route_id
    and r.status in ('finished', 'cancelled')
    and r.ended_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.auto_finish_group_routes(), private.purge_group_route_messages()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (postgres_changes). Default replica identity on purpose: DELETE
-- events are not RLS-filtered, so they must carry only the primary key.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['group_routes', 'group_route_participants',
                           'group_route_messages', 'group_route_locations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

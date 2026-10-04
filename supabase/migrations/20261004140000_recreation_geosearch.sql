-- Work queue of the geosearch-recreation Edge Function, which fills public.recreation_areas from
-- LocationIQ forward search (scripts/import-recreation.mjs needs Overpass, which may be unreachable).
-- One row per (search phrase, bbox tile); a tile that hits the 50-result limit gets four child
-- tiles one level deeper. The function deletes and re-seeds the queue when a sweep is a week old.
-- Only the service role (the Edge Function) uses it: RLS on, no policies.
-- Depends on 20261004120000_recreation_areas.sql (table and import_recreation_areas()).
-- To start a new sweep right away: delete from public.recreation_geosearch_tiles;
-- Safe to re-run.

create table if not exists public.recreation_geosearch_tiles (
  id bigint generated always as identity primary key,
  phrase text not null,
  depth integer not null default 0,
  west double precision not null,
  south double precision not null,
  east double precision not null,
  north double precision not null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  result_count integer,
  searched_at timestamptz,
  created_at timestamptz not null default now(),
  check (west < east and south < north)
);

create index if not exists recreation_geosearch_tiles_pending_idx
  on public.recreation_geosearch_tiles (depth, id)
  where status = 'pending';

alter table public.recreation_geosearch_tiles enable row level security;

revoke all on public.recreation_geosearch_tiles from anon, authenticated;

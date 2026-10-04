-- Cron job for recreation areas:
--   geosearch-recreation  every 15 minutes at :12/:27/:42/:57 (between geocode-events runs at
--                         :05/:20/:35/:50, ~110 s each, so the two never use LocationIQ at once):
--                         calls the geosearch-recreation Edge Function, which searches pending tiles
--                         (~100 LocationIQ requests per run). A full sweep takes a few runs; then
--                         runs are a single select until the sweep is a week old.
--
-- Reuses the events_cron_secret vault secret (same CRON_SECRET function secret),
-- see 20261003130100_events_cron.sql. The function is deployed with --no-verify-jwt.
--
-- cron.schedule() with an existing job name updates that job, so this is safe to re-run.
-- To turn it off: select cron.unschedule('geosearch-recreation');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'geosearch-recreation',
  '12,27,42,57 * * * *',
  $$
  select net.http_post(
    url := 'https://ufdwloicpssfgkrttvnj.supabase.co/functions/v1/geosearch-recreation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'events_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  ) as request_id;
  $$
);

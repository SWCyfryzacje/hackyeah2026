-- Cron jobs for group routes (needs 20261004090000_group_routes.sql):
--   group-routes-auto-finish   every 5 min: ends routes past planned_end + 1 h (or start + 6 h)
--                              and removes their live locations
--   group-routes-purge-chat    daily 02:45 UTC: deletes chat of routes ended more than 7 days ago
--
-- cron.schedule() with an existing job name updates that job, so this is safe to re-run.
-- To turn a job off: select cron.unschedule('group-routes-auto-finish');

create extension if not exists pg_cron;

select cron.schedule(
  'group-routes-auto-finish',
  '*/5 * * * *',
  $$ select private.auto_finish_group_routes(); $$
);

select cron.schedule(
  'group-routes-purge-chat',
  '45 2 * * *',
  $$ select private.purge_group_route_messages(); $$
);

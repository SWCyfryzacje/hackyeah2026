// Fills public.recreation_areas from LocationIQ forward search (hosted Nominatim on OpenStreetMap
// data), the same way geocode-events geocodes events. Overpass would be the natural source, but
// public instances block Supabase's cloud network; LocationIQ answers.
//
// One search returns at most 50 results, so every phrase (categorize.ts PHRASES) is searched over
// tiles of the Kraków bbox, kept in public.recreation_geosearch_tiles: a tile that hits the limit
// is split into four pending quarters. Invoked every 15 minutes by pg_cron (see
// supabase/migrations/*_recreation_geosearch_cron.sql); each run works through pending tiles for
// ~110 s. When none are left it does nothing until the sweep is REFRESH_DAYS old, then starts over.
//
// Body (all optional):
//   { "maxSeconds": 110, "restart": true }   restart: drop the tile queue and start a new sweep
//
// LocationIQ free plan (https://locationiq.com/tos): 5000 requests/day, 2/s, 60/min; a full sweep
// is a few hundred requests. Runs are offset from geocode-events so the two never search at once.
// The app shows "Search by LocationIQ.com" and "© OpenStreetMap contributors" with the layer.
//
// Uses the LOCATIONIQ_KEY and CRON_SECRET secrets of geocode-events. Deploy with JWT verification off:
//   supabase functions deploy geosearch-recreation --no-verify-jwt

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import {
  dedupeItems,
  type LocationIqResult,
  PHRASES,
  quarters,
  type RecreationItem,
  type Tile,
  toItem,
  viewbox,
} from './categorize.ts';

const SEARCH_URL = 'https://eu1.locationiq.com/v1/search';
const MIN_INTERVAL_MS = 1100;
const FETCH_TIMEOUT_MS = 15_000;
const RESULT_LIMIT = 50; // LocationIQ maximum
// Depth 6 tiles are ~0.5 km across; a full one there is accepted as is.
const MAX_DEPTH = 6;
const REFRESH_DAYS = 7;
const UPSERT_BATCH = 100;

// Kraków city limits; results outside the city are dropped by address (categorize.ts).
const KRAKOW: Tile = { west: 19.792, south: 49.967, east: 20.217, north: 50.126 };

type TileRow = Tile & { id: number; phrase: string; depth: number };

/** The geocoder refused or failed: stop, leave the tile pending. */
class TransientError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let lastRequestAt = 0;

async function search(tile: TileRow, apiKey: string): Promise<LocationIqResult[]> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    key: apiKey,
    q: tile.phrase,
    format: 'json',
    limit: String(RESULT_LIMIT),
    countrycodes: 'pl',
    viewbox: viewbox(tile),
    bounded: '1',
    addressdetails: '1',
    extratags: '1',
    namedetails: '1',
    polygon_geojson: '1', // outlines come back for a few areas only; the rest are points
    // dedupe=1 drops results after the limit is applied, so a full tile would look complete
    // and never be split. Duplicates are removed by dedupeItems().
    dedupe: '0',
    'accept-language': 'pl',
    source: 'nom', // OpenStreetMap data only
  });

  let res: Response;
  try {
    res = await fetch(`${SEARCH_URL}?${params}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    throw new TransientError(`fetch failed: ${(e as Error).message}`);
  }
  // 401/403: bad key or blocked; 429: rate or daily limit; 5xx: server trouble.
  // 404 is LocationIQ's "nothing found".
  if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
    throw new TransientError(`LocationIQ ${res.status} ${res.statusText}`);
  }
  return res.ok ? ((await res.json()) as LocationIqResult[]) : [];
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const apiKey = Deno.env.get('LOCATIONIQ_KEY');
  if (!apiKey) return Response.json({ error: 'LOCATIONIQ_KEY is not configured' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const maxSeconds = Math.min(Math.max(Number(body.maxSeconds ?? 110), 5), 140);
  const deadline = Date.now() + maxSeconds * 1000;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const tiles = () => supabase.from('recreation_geosearch_tiles');

  const loadPending = async () => {
    const { data, error } = await tiles()
      .select('id, phrase, depth, west, south, east, north')
      .eq('status', 'pending')
      .order('depth')
      .order('id')
      .limit(500);
    if (error) throw error;
    return data as TileRow[];
  };

  let pending = await loadPending();
  if (!pending.length || body.restart) {
    const { data: last, error } = await tiles().select('created_at').order('created_at').limit(1).maybeSingle();
    if (error) throw error;
    const sweepAgeMs = last ? Date.now() - new Date(last.created_at).getTime() : Infinity;
    if (!body.restart && sweepAgeMs < REFRESH_DAYS * 86400_000) {
      return Response.json({ pending: 0, sweepAgeHours: Math.round(sweepAgeMs / 3600_000) });
    }
    const { error: deleteError } = await tiles().delete().gte('id', 0);
    if (deleteError) throw deleteError;
    const { error: insertError } = await tiles().insert(PHRASES.map((phrase) => ({ phrase, depth: 0, ...KRAKOW })));
    if (insertError) throw insertError;
    pending = await loadPending();
    console.log(`new sweep: ${pending.length} root tiles`);
  }

  const counts = { tiles: 0, split: 0, results: 0, written: 0, api_requests: 0 };
  let stopReason: string | null = null;

  // Split tiles are queued as new rows, so reload the queue until it's empty or time is up.
  sweep: for (; pending.length; pending = await loadPending()) for (const tile of pending) {
    if (Date.now() + MIN_INTERVAL_MS + FETCH_TIMEOUT_MS > deadline) {
      stopReason = 'time budget used up';
      break sweep;
    }
    let results: LocationIqResult[];
    try {
      counts.api_requests++;
      results = await search(tile, apiKey);
    } catch (e) {
      if (!(e instanceof TransientError)) throw e;
      stopReason = e.message;
      break sweep;
    }
    counts.results += results.length;

    const items: RecreationItem[] = dedupeItems(results.map(toItem).filter((i) => i !== null));
    const seenAt = new Date().toISOString();
    for (let i = 0; i < items.length; i += UPSERT_BATCH) {
      const { data, error } = await supabase.rpc('import_recreation_areas', {
        items: items.slice(i, i + UPSERT_BATCH),
        seen_at: seenAt,
      });
      if (error) throw new Error(`import_recreation_areas: ${error.message}`);
      counts.written += data as number;
    }

    if (results.length >= RESULT_LIMIT && tile.depth < MAX_DEPTH) {
      const children = quarters(tile).map((t) => ({ phrase: tile.phrase, depth: tile.depth + 1, ...t }));
      const { error } = await tiles().insert(children);
      if (error) throw error;
      counts.split++;
    }
    const { error } = await tiles()
      .update({ status: 'done', result_count: results.length, searched_at: seenAt })
      .eq('id', tile.id);
    if (error) throw error;
    counts.tiles++;
  }

  const { count: left, error } = await tiles().select('id', { count: 'exact', head: true }).eq('status', 'pending');
  if (error) throw error;

  console.log('geosearch-recreation finished', { ...counts, left, stopReason });
  return Response.json({ ...counts, pending: left, stopReason });
});

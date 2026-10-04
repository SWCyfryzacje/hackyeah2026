// Imports Kraków recreation areas from OpenStreetMap (Overpass) into public.recreation_areas.
// Runs locally, not as an Edge Function: public Overpass instances block Supabase's cloud network.
//
//   node --env-file=.env --env-file-if-exists=.env.local scripts/import-recreation.mjs --dry-run
//   node --env-file=.env --env-file-if-exists=.env.local scripts/import-recreation.mjs
//
// Needs EXPO_PUBLIC_SUPABASE_URL (.env) and SUPABASE_SERVICE_ROLE_KEY (put it in .env.local,
// never commit it). --dry-run only fetches and prints counts per category;
// --dump=<file> also writes the items as JSON for inspection.
// Data © OpenStreetMap contributors, ODbL — the app shows the attribution.

import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const USER_AGENT =
  'hackyeah2026-recreation-importer/1.0 (+https://github.com/SWCyfryzacje/hackyeah2026)';

// Kraków city limits (south, west, north, east).
const BBOX = [49.967, 19.792, 50.126, 20.217];
const BATCH_SIZE = 200;

const QUERY = `
[out:json][timeout:180][bbox:${BBOX.join(',')}];
(
  nwr["leisure"~"^(park|garden|skatepark|playground|fitness_station|dog_park|picnic_site|swimming_area|bathing_place)$"];
  nwr["landuse"="recreation_ground"];
  nwr["sport"~"skateboard|bmx|roller_skating"]["leisure"~"^(pitch|track|sports_centre)$"];
  nwr["tourism"~"^(picnic_site|viewpoint)$"];
  nwr["amenity"="lounger"];
  nwr["natural"="beach"];
);
out geom qt;
`;

// OSM tags kept for the app (details in the marker callout).
const KEPT_TAGS = [
  'leisure', 'landuse', 'tourism', 'amenity', 'natural', 'sport',
  'opening_hours', 'lit', 'surface', 'wheelchair', 'fee', 'website', 'description',
];

// Points of one category closer than this (m) are merged into one: outdoor gyms and
// lounger rows are often mapped as one node per machine / lounger.
const DEDUPE_M = { fitness: 40, relax: 40, playground: 25, skatepark: 40 };

/** OSM tags -> app category, or null to skip. Order matters: most specific first. */
function categorize(t) {
  if (/^(private|no)$/.test(t.access ?? '')) return null;
  if (t.leisure === 'skatepark' || /skateboard|bmx|roller_skating/.test(t.sport ?? ''))
    return 'skatepark';
  if (/^(swimming_area|bathing_place)$/.test(t.leisure ?? '') || t.natural === 'beach')
    return 'water';
  if (t.leisure === 'dog_park') return 'dog_park';
  if (t.leisure === 'playground') return 'playground';
  if (t.leisure === 'fitness_station') return 'fitness';
  if (
    t.leisure === 'picnic_site' ||
    t.tourism === 'picnic_site' ||
    t.tourism === 'viewpoint' ||
    t.amenity === 'lounger'
  )
    return 'relax';
  if (t.leisure === 'park' || t.landuse === 'recreation_ground') return 'park';
  // Most gardens in OSM are private backyards; keep only named, explicitly public ones.
  if (t.leisure === 'garden' && t.name && /^(yes|public|permissive)$/.test(t.access ?? ''))
    return 'park';
  return null;
}

const lonLat = (p) => [p.lon, p.lat];

/** Overpass element (out geom) -> GeoJSON geometry, or null. */
function toGeometry(el) {
  if (el.type === 'node') return { type: 'Point', coordinates: [el.lon, el.lat] };
  if (el.type === 'way' && el.geometry?.length) {
    const coords = el.geometry.map(lonLat);
    const [first, last] = [coords[0], coords[coords.length - 1]];
    const closed = coords.length >= 4 && first[0] === last[0] && first[1] === last[1];
    return closed
      ? { type: 'Polygon', coordinates: [coords] }
      : { type: 'LineString', coordinates: coords };
  }
  if (el.type === 'relation' && el.tags?.type === 'multipolygon') {
    // PostGIS (ST_BuildArea) joins the member ways into rings, holes included.
    const lines = (el.members ?? [])
      .filter((m) => m.type === 'way' && m.geometry?.length >= 2)
      .map((m) => m.geometry.map(lonLat));
    return lines.length ? { type: 'MultiLineString', coordinates: lines } : null;
  }
  return null;
}

/** Rough centre, only used for de-duplication. */
function center(geom) {
  const pts =
    geom.type === 'Point'
      ? [geom.coordinates]
      : geom.type === 'Polygon'
        ? geom.coordinates[0]
        : geom.type === 'LineString'
          ? geom.coordinates
          : geom.coordinates.flat();
  const sum = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [sum[0] / pts.length, sum[1] / pts.length];
}

function distanceM([lon1, lat1], [lon2, lat2]) {
  const r = (d) => (d * Math.PI) / 180;
  const x = r(lon2 - lon1) * Math.cos(r((lat1 + lat2) / 2));
  const y = r(lat2 - lat1);
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

function toItems(elements) {
  const items = [];
  const kept = {}; // category -> centres already kept
  // Areas first, so a playground mapped as an area wins over its nodes.
  const sorted = [...elements].sort((a, b) => (a.type === 'node') - (b.type === 'node'));

  for (const el of sorted) {
    const tags = el.tags ?? {};
    const category = categorize(tags);
    if (!category) continue;
    const geom = toGeometry(el);
    if (!geom) continue;

    const radius = DEDUPE_M[category];
    if (radius && !tags.name) {
      const c = center(geom);
      const list = (kept[category] ??= []);
      if (list.some((k) => distanceM(k, c) < radius)) continue;
      list.push(c);
    }

    items.push({
      osm_type: el.type,
      osm_id: el.id,
      name: tags['name:pl'] ?? tags.name ?? null,
      category,
      tags: Object.fromEntries(KEPT_TAGS.filter((k) => tags[k]).map((k) => [k, tags[k]])),
      wikidata_id: tags.wikidata ?? null,
      geom,
    });
  }
  return items;
}

async function fetchOverpass() {
  for (const url of OVERPASS_URLS) {
    try {
      const t0 = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ data: QUERY }),
        signal: AbortSignal.timeout(200_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log(`${url}: ${json.elements.length} elements (${Date.now() - t0} ms)`);
      return json.elements;
    } catch (e) {
      console.warn(`${url} failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error('All Overpass instances failed');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const startedAt = new Date().toISOString();

  const items = toItems(await fetchOverpass());
  const counts = items.reduce((a, i) => ({ ...a, [i.category]: (a[i.category] ?? 0) + 1 }), {});
  console.log('Items per category:', counts);
  const dump = process.argv.find((a) => a.startsWith('--dump='))?.slice('--dump='.length);
  if (dump) writeFileSync(dump, JSON.stringify(items));
  if (dryRun) return;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL (.env) and SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let written = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const { data, error } = await supabase.rpc('import_recreation_areas', {
      items: items.slice(i, i + BATCH_SIZE),
      seen_at: startedAt,
    });
    if (error) throw new Error(`Batch ${i / BATCH_SIZE}: ${error.message}`);
    written += data;
  }

  // Drop areas that disappeared from OSM; guarded so an empty answer wipes nothing.
  let deleted = 0;
  if (items.length > 0) {
    const { count, error } = await supabase
      .from('recreation_areas')
      .delete({ count: 'exact' })
      .lt('last_seen_at', startedAt);
    if (error) throw error;
    deleted = count ?? 0;
  }

  console.log(`Written: ${written}, deleted: ${deleted}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

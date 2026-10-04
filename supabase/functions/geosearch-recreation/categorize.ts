// Turning LocationIQ (Nominatim) search results into public.recreation_areas rows.
// Kept free of Deno APIs so it can be tested with plain Node.

/**
 * Search phrases, each run over every tile of the Kraków bbox. Nominatim treats "park",
 * "plac zabaw", "punkt widokowy", "picnic site" and "recreation ground" as category searches
 * (all objects of that kind in the viewbox); the others only match names ("Skatepark Bulwary").
 * Dog parks and loungers return nothing for any phrase tried, so they aren't searched.
 */
export const PHRASES = [
  'park',
  'plac zabaw',
  'punkt widokowy',
  'picnic site',
  'recreation ground',
  'ogród',
  'skatepark',
  'skate park',
  'siłownia',
  'kąpielisko',
  'plaża',
];

// Results are kept only inside the city (address.city); the bbox also covers Wieliczka etc.
const CITY_NAMES = new Set(['Kraków', 'Krakow', 'Cracow']);

export type LocationIqResult = {
  osm_type?: string;
  osm_id?: string | number;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
  namedetails?: Record<string, string> | null;
  geojson?: { type: string; coordinates: unknown };
};

export type RecreationItem = {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  name: string | null;
  category: string;
  tags: Record<string, string>;
  wikidata_id: string | null;
  geom: { type: string; coordinates: unknown };
};

// OSM tags kept for the app (details in the marker callout).
const KEPT_TAGS = [
  'leisure', 'landuse', 'tourism', 'amenity', 'natural', 'sport',
  'opening_hours', 'lit', 'surface', 'wheelchair', 'fee', 'website', 'description',
];

/** OSM tags -> app category, or null to skip. Same rules as scripts/import-recreation.mjs. */
export function categorize(t: Record<string, string | undefined>): string | null {
  if (/^(private|no)$/.test(t.access ?? '')) return null;
  if (
    t.leisure === 'skatepark' ||
    /skateboard|bmx|roller_skating/.test(t.sport ?? '') ||
    // Skateparks found by name are often pitches without a sport tag.
    (t.leisure === 'pitch' && /skate/i.test(t.name ?? ''))
  )
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
  if (t.leisure === 'park' || t.landuse === 'recreation_ground' || t.leisure === 'recreation_ground')
    return 'park';
  // Most gardens in OSM are private backyards; keep only named, explicitly public ones.
  if (t.leisure === 'garden' && t.name && /^(yes|public|permissive)$/.test(t.access ?? ''))
    return 'park';
  return null;
}

/** One search result -> row for import_recreation_areas(), or null to skip. */
export function toItem(r: LocationIqResult): RecreationItem | null {
  const osmType = r.osm_type;
  if (osmType !== 'node' && osmType !== 'way' && osmType !== 'relation') return null;
  const osmId = Number(r.osm_id);
  if (!Number.isSafeInteger(osmId)) return null;

  const city = r.address?.city ?? r.address?.town;
  if (r.address && !(city && CITY_NAMES.has(city))) return null;

  const name = r.namedetails?.['name:pl'] ?? r.namedetails?.name ?? null;
  const tags: Record<string, string> = { ...(r.extratags ?? {}) };
  if (r.class && r.type) tags[r.class] = r.type;
  const category = categorize({ ...tags, name: name ?? undefined });
  if (!category) return null;

  const geom =
    r.geojson && r.geojson.type !== 'Point'
      ? r.geojson
      : { type: 'Point', coordinates: [Number(r.lon), Number(r.lat)] };

  return {
    osm_type: osmType,
    osm_id: osmId,
    name,
    category,
    tags: Object.fromEntries(KEPT_TAGS.filter((k) => tags[k]).map((k) => [k, tags[k]])),
    wikidata_id: tags.wikidata ?? null,
    geom,
  };
}

/** Results of all phrases and tiles -> rows without duplicates (an upsert can't touch a row twice). */
export function dedupeItems(items: RecreationItem[]): RecreationItem[] {
  const byId = new Map<string, RecreationItem>();
  for (const i of items) byId.set(`${i.osm_type}/${i.osm_id}`, i);
  return [...byId.values()];
}

export type Tile = { west: number; south: number; east: number; north: number };

/** LocationIQ viewbox parameter: lon1,lat1,lon2,lat2. */
export const viewbox = (t: Tile) => `${t.west},${t.north},${t.east},${t.south}`;

/** A tile that hit the result limit is searched again as four quarters. */
export function quarters(t: Tile): Tile[] {
  const midLon = (t.west + t.east) / 2;
  const midLat = (t.south + t.north) / 2;
  return [
    { west: t.west, south: t.south, east: midLon, north: midLat },
    { west: midLon, south: t.south, east: t.east, north: midLat },
    { west: t.west, south: midLat, east: midLon, north: t.north },
    { west: midLon, south: midLat, east: t.east, north: t.north },
  ];
}

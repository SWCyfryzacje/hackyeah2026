// Event markers are violet so they stand out from the amber/green monument pins.
export const EVENT_MARKER_COLOR = '#7c3aed';

// How far ahead the map tab shows events. The route tab only shows events up to
// the last day a group route can be planned for (MAX_ROUTE_DAYS_AHEAD).
export const MAP_EVENTS_MONTHS_AHEAD = 5;

// Required by the LocationIQ free plan (geocoding) and the OSM licence (the data).
export const GEOCODING_ATTRIBUTION = [
  { label: 'Search by LocationIQ.com', url: 'https://locationiq.com' },
  {
    label: '© OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
  },
] as const;

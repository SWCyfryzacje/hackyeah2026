// Recreation markers are teal so they stand out from amber monuments, violet events
// and the green "selected" pins.
export const RECREATION_MARKER_COLOR = '#0d9488';

export const RECREATION_CATEGORIES = {
  park: { label: 'Park', fill: 'rgba(34, 197, 94, 0.18)', stroke: '#16a34a' },
  water: {
    label: 'Bathing spot',
    fill: 'rgba(14, 165, 233, 0.2)',
    stroke: '#0284c7',
  },
  skatepark: {
    label: 'Skatepark',
    fill: 'rgba(249, 115, 22, 0.2)',
    stroke: '#ea580c',
  },
  playground: {
    label: 'Playground',
    fill: 'rgba(234, 179, 8, 0.2)',
    stroke: '#ca8a04',
  },
  fitness: {
    label: 'Outdoor gym',
    fill: 'rgba(225, 29, 72, 0.18)',
    stroke: '#e11d48',
  },
  relax: {
    label: 'Relax spot',
    fill: 'rgba(13, 148, 136, 0.18)',
    stroke: '#0d9488',
  },
  dog_park: {
    label: 'Dog park',
    fill: 'rgba(161, 98, 7, 0.18)',
    stroke: '#a16207',
  },
} as const;

export type RecreationCategory = keyof typeof RECREATION_CATEGORIES;

// What the map tab shows at a given zoom (region latitudeDelta), so a zoomed-out
// city view isn't buried under ~1000 playgrounds. Outlines only when zoomed in.
export const RECREATION_ZOOM_LEVELS: {
  maxLatitudeDelta: number;
  categories: RecreationCategory[] | null; // null = all
  withShapes: boolean;
}[] = [
  { maxLatitudeDelta: 0.03, categories: null, withShapes: true },
  {
    maxLatitudeDelta: 0.08,
    categories: ['park', 'water', 'skatepark', 'dog_park', 'relax'],
    withShapes: false,
  },
  {
    maxLatitudeDelta: Infinity,
    categories: ['park', 'water'],
    withShapes: false,
  },
];

// Required by the OSM licence (ODbL) wherever recreation data is shown.
export const OSM_ATTRIBUTION = {
  label: '© OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
} as const;

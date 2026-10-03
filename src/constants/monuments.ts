// How well-known a monument must be to be shown, by the number of Wikipedia
// language editions that have an article about it (`score` in the database).
export const MONUMENT_LEVELS = [
  { label: 'Top', minScore: 10 }, // ~47 in Kraków: Wawel, Sukiennice, St. Mary's...
  { label: 'Popular', minScore: 5 }, // ~110
  { label: 'More', minScore: 3 }, // ~300
  { label: 'All', minScore: 2 }, // ~730
] as const;

export const DEFAULT_MONUMENT_MIN_SCORE = 5;

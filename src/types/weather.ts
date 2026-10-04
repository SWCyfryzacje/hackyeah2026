import type { LatLng } from 'react-native-maps';

// Weather advice for a planned walk. Plain JSON (ISO strings, no Dates) so it can be
// cached, logged or sent elsewhere as is; the UI formats it.

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'freezing-rain'
  | 'snow'
  | 'thunderstorm';

/** One forecast hour (Open-Meteo hourly data). */
export type WeatherHour = {
  time: string; // ISO 8601, start of the hour
  tempC: number;
  feelsLikeC: number;
  precipProb: number; // %
  precipMm: number;
  windKmh: number;
  gustKmh: number;
  uvIndex: number;
  isDay: boolean;
  condition: WeatherCondition;
};

/** Extremes over the hours the walk covers. */
export type WeatherSummary = {
  tempMinC: number;
  tempMaxC: number;
  feelsLikeMinC: number;
  precipProbMax: number;
  precipTotalMm: number;
  windMaxKmh: number;
  gustMaxKmh: number;
  uvMax: number;
  /** Most severe condition in the window */
  condition: WeatherCondition;
  /** Daylight at the start of the walk */
  isDay: boolean;
};

export type WalkRating = 'good' | 'ok' | 'poor';

export type ClothingIcon =
  | 'warm-jacket'
  | 'jacket'
  | 'layer'
  | 'tshirt'
  | 'raincoat'
  | 'umbrella'
  | 'hat'
  | 'gloves'
  | 'cap'
  | 'sunglasses'
  | 'sunscreen'
  | 'water'
  | 'shoes'
  | 'boots'
  | 'light';

export type ClothingItem = {
  item: string;
  icon: ClothingIcon;
  reason: string;
};

export type WeatherAlert = {
  level: 'info' | 'warning';
  text: string;
};

export type WeatherAdvice = {
  headline: string;
  summary: string;
  walkRating: WalkRating;
  clothing: ClothingItem[];
  tips: string[];
  alerts: WeatherAlert[];
};

export type RouteWeather = {
  location: LatLng;
  from: string; // ISO 8601
  to: string; // ISO 8601
  hours: WeatherHour[];
  summary: WeatherSummary;
  advice: WeatherAdvice;
  generatedAt: string; // ISO 8601
};

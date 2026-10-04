import type { LatLng } from 'react-native-maps';
import type {
  ClothingItem,
  RouteWeather,
  WalkRating,
  WeatherAdvice,
  WeatherAlert,
  WeatherCondition,
  WeatherHour,
  WeatherSummary,
} from '@/types/weather';
import {
  CONDITION_SEVERITY,
  fetchHourlyForecast,
} from '@/utils/weather-forecast';
import { formatTime } from '@/utils/group-route-format';

// Rule-based walking advice: a handful of thresholds over the forecast hours the walk covers.

const RAIN_LIKELY_PROB = 50; // %
const RAIN_POSSIBLE_PROB = 30; // %
const DRY_PROB = 10; // %
const HEAVY_RAIN_MM_H = 2.5;
const WET_TOTAL_MM = 5;
const UMBRELLA_MAX_GUST_KMH = 40;
const WINDY_GUST_KMH = 45;
const STORM_GUST_KMH = 60;
const WARM_C = 25;
const HOT_C = 27;
const HEAT_C = 30;
const CHILLY_FEELS_C = 3;
const FROST_FEELS_C = -10;
const LAYERS_SPREAD_C = 8;
const UV_SUNGLASSES = 3;
const UV_SUNSCREEN = 6;
const UV_EXTREME = 8;
const LONG_WALK_MIN = 120;

const WET_CONDITIONS: readonly WeatherCondition[] = [
  'drizzle',
  'rain',
  'heavy-rain',
  'freezing-rain',
  'thunderstorm',
];

export const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: 'słonecznie',
  'partly-cloudy': 'częściowe zachmurzenie',
  cloudy: 'pochmurno',
  fog: 'mgła',
  drizzle: 'mżawka',
  rain: 'deszcz',
  'heavy-rain': 'ulewa',
  'freezing-rain': 'marznący deszcz',
  snow: 'śnieg',
  thunderstorm: 'burza',
};

export const WALK_RATING_LABELS: Record<WalkRating, string> = {
  good: 'Dobre warunki',
  ok: 'Znośne warunki',
  poor: 'Słabe warunki',
};

const round = Math.round;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatMm = (mm: number) => `${mm.toFixed(1).replace('.', ',')} mm`;

// Snow is handled separately, so a likely snowfall is not "rain"
const isWet = (h: WeatherHour) =>
  WET_CONDITIONS.includes(h.condition) ||
  (h.precipProb >= RAIN_LIKELY_PROB && h.condition !== 'snow');

function temperatureWord(c: number) {
  if (c <= 0) return 'mroźno';
  if (c <= 8) return 'zimno';
  if (c <= 14) return 'chłodno';
  if (c <= 20) return 'przyjemnie';
  if (c <= 26) return 'ciepło';
  return 'upalnie';
}

export function summarizeHours(hours: WeatherHour[]): WeatherSummary {
  const max = (f: (h: WeatherHour) => number) => Math.max(...hours.map(f));
  const min = (f: (h: WeatherHour) => number) => Math.min(...hours.map(f));

  return {
    tempMinC: min((h) => h.tempC),
    tempMaxC: max((h) => h.tempC),
    feelsLikeMinC: min((h) => h.feelsLikeC),
    precipProbMax: max((h) => h.precipProb),
    precipTotalMm: hours.reduce((sum, h) => sum + h.precipMm, 0),
    windMaxKmh: max((h) => h.windKmh),
    gustMaxKmh: max((h) => h.gustKmh),
    uvMax: max((h) => h.uvIndex),
    condition:
      CONDITION_SEVERITY[max((h) => CONDITION_SEVERITY.indexOf(h.condition))],
    isDay: hours[0].isDay,
  };
}

export function buildWeatherAdvice(
  hours: WeatherHour[],
  durationMin: number
): WeatherAdvice {
  const s = summarizeHours(hours);
  const clothing: ClothingItem[] = [];
  const tips: string[] = [];
  const alerts: WeatherAlert[] = [];

  const feels = round(s.feelsLikeMinC);
  const rainLikely = hours.some(isWet);
  const heavyRain =
    s.condition === 'heavy-rain' ||
    hours.some((h) => h.precipMm >= HEAVY_RAIN_MM_H);
  const slippery = s.condition === 'snow' || s.condition === 'freezing-rain';
  const afterDark = hours.some((h) => !h.isDay);

  // Base layer, by the coldest felt temperature
  if (feels <= 0) {
    clothing.push(
      {
        item: 'Ciepła kurtka zimowa',
        icon: 'warm-jacket',
        reason: `Odczuwalnie ${feels}°C`,
      },
      { item: 'Czapka, szalik i rękawiczki', icon: 'gloves', reason: 'Mróz' }
    );
  } else if (feels <= 8) {
    clothing.push({
      item: 'Ciepła kurtka',
      icon: 'warm-jacket',
      reason: `Odczuwalnie ${feels}°C`,
    });
    if (feels <= 4) {
      clothing.push({
        item: 'Czapka',
        icon: 'hat',
        reason: 'Zimny wiatr i niska temperatura',
      });
    }
  } else if (feels <= 14) {
    clothing.push({
      item: 'Lekka kurtka lub polar',
      icon: 'jacket',
      reason: `Odczuwalnie ${feels}°C`,
    });
  } else if (feels <= 19) {
    clothing.push({
      item: 'Bluza lub sweter',
      icon: 'layer',
      reason: `Odczuwalnie ${feels}°C`,
    });
  } else {
    clothing.push({
      item: 'Lekkie, przewiewne ubranie',
      icon: 'tshirt',
      reason: `Do ${round(s.tempMaxC)}°C`,
    });
  }

  // Rain
  if (rainLikely) {
    if (s.gustMaxKmh >= UMBRELLA_MAX_GUST_KMH) {
      clothing.push({
        item: 'Kurtka przeciwdeszczowa',
        icon: 'raincoat',
        reason: 'Deszcz z silnym wiatrem — parasol się nie sprawdzi',
      });
    } else {
      clothing.push({
        item: 'Parasol',
        icon: 'umbrella',
        reason: `Opady do ${s.precipProbMax}%`,
      });
    }
    if (heavyRain || s.precipTotalMm >= WET_TOTAL_MM) {
      clothing.push({
        item: 'Nieprzemakalne buty',
        icon: 'boots',
        reason: `Do ${formatMm(s.precipTotalMm)} opadu`,
      });
    }
  } else if (s.precipProbMax >= RAIN_POSSIBLE_PROB && !slippery) {
    clothing.push({
      item: 'Składany parasol',
      icon: 'umbrella',
      reason: `Na wszelki wypadek — opady do ${s.precipProbMax}%`,
    });
  }

  if (slippery) {
    clothing.push({
      item: 'Buty z dobrą przyczepnością',
      icon: 'boots',
      reason: 'Śnieg lub gołoledź',
    });
  }

  // Sun and heat
  if (s.uvMax >= UV_SUNGLASSES && s.isDay) {
    clothing.push({
      item: 'Okulary przeciwsłoneczne',
      icon: 'sunglasses',
      reason: `UV do ${round(s.uvMax)}`,
    });
  }
  if (s.uvMax >= UV_SUNSCREEN) {
    clothing.push(
      {
        item: 'Krem z filtrem SPF 30+',
        icon: 'sunscreen',
        reason: `Wysokie UV (${round(s.uvMax)})`,
      },
      {
        item: 'Czapka z daszkiem',
        icon: 'cap',
        reason: 'Ochrona przed słońcem',
      }
    );
  }
  if (s.tempMaxC >= WARM_C) {
    clothing.push({
      item: 'Woda — ok. 0,5 l na godzinę',
      icon: 'water',
      reason: `Do ${round(s.tempMaxC)}°C`,
    });
  }

  // Walk length and daylight
  if (
    durationMin >= LONG_WALK_MIN &&
    !clothing.some((c) => c.icon === 'boots')
  ) {
    clothing.push({
      item: 'Wygodne buty',
      icon: 'shoes',
      reason: `Ok. ${round(durationMin / 60)} h marszu`,
    });
  }
  if (afterDark) {
    clothing.push({
      item: 'Latarka lub odblask',
      icon: 'light',
      reason: 'Część trasy po zmroku',
    });
  }

  // Alerts
  if (s.condition === 'thunderstorm') {
    alerts.push({
      level: 'warning',
      text: 'Prognozowana burza — rozważ przełożenie trasy.',
    });
  }
  if (s.condition === 'freezing-rain') {
    alerts.push({
      level: 'warning',
      text: 'Marznące opady — ślisko na chodnikach.',
    });
  }
  if (heavyRain) {
    alerts.push({
      level: 'warning',
      text: `Intensywne opady — łącznie do ${formatMm(s.precipTotalMm)}.`,
    });
  }
  if (s.gustMaxKmh >= STORM_GUST_KMH) {
    alerts.push({
      level: 'warning',
      text: `Porywy wiatru do ${round(s.gustMaxKmh)} km/h — omijaj parki i drzewa.`,
    });
  } else if (s.gustMaxKmh >= WINDY_GUST_KMH) {
    alerts.push({
      level: 'info',
      text: `Wietrznie, porywy do ${round(s.gustMaxKmh)} km/h.`,
    });
  }
  if (s.tempMaxC >= HEAT_C) {
    alerts.push({
      level: 'warning',
      text: `Upał do ${round(s.tempMaxC)}°C — unikaj pełnego słońca w południe.`,
    });
  }
  if (feels <= FROST_FEELS_C) {
    alerts.push({
      level: 'warning',
      text: `Silny mróz — odczuwalnie ${feels}°C.`,
    });
  }
  if (s.uvMax >= UV_EXTREME) {
    alerts.push({
      level: 'warning',
      text: `Bardzo wysokie promieniowanie UV (${round(s.uvMax)}).`,
    });
  }
  if (s.condition === 'fog') {
    alerts.push({ level: 'info', text: 'Mgła — ograniczona widoczność.' });
  }
  if (s.condition === 'snow') {
    alerts.push({ level: 'info', text: 'Opady śniegu.' });
  }

  // Tips
  const firstWet = hours.findIndex(isWet);
  if (firstWet > 0) {
    tips.push(
      `Deszcz możliwy od ${formatTime(new Date(hours[firstWet].time))} — lepiej wyjść wcześniej.`
    );
  } else if (firstWet === 0 && !hours.every(isWet)) {
    tips.push('Pada na starcie, później powinno się przejaśnić.');
  }
  if (s.tempMaxC - s.feelsLikeMinC >= LAYERS_SPREAD_C) {
    tips.push('Ubierz się na cebulkę — temperatura mocno się zmieni.');
  }
  if (s.tempMaxC >= HOT_C) {
    tips.push('Zaplanuj postoje w cieniu.');
  }
  if (rainLikely && durationMin >= LONG_WALK_MIN) {
    tips.push('Zaplanuj po drodze miejsca na schronienie — kawiarnie, muzea.');
  }

  const walkRating: WalkRating = alerts.some((a) => a.level === 'warning')
    ? 'poor'
    : alerts.length ||
        rainLikely ||
        feels < CHILLY_FEELS_C ||
        s.tempMaxC >= HOT_C
      ? 'ok'
      : 'good';

  if (walkRating === 'good' && !tips.length) {
    tips.push('Świetna pogoda na spacer!');
  }

  const conditionLabel =
    rainLikely &&
    !WET_CONDITIONS.includes(s.condition) &&
    s.condition !== 'snow'
      ? 'możliwy deszcz'
      : s.condition === 'clear' && !s.isDay
        ? 'bezchmurnie'
        : CONDITION_LABELS[s.condition];

  const tempMin = round(s.tempMinC);
  const tempMax = round(s.tempMaxC);
  const tempRange =
    tempMin === tempMax ? `${tempMax}°C` : `${tempMin}–${tempMax}°C`;
  const gust =
    s.gustMaxKmh >= WINDY_GUST_KMH ? ` (porywy ${round(s.gustMaxKmh)})` : '';
  const precip =
    s.precipProbMax < DRY_PROB ? 'Bez opadów' : `Opady do ${s.precipProbMax}%`;

  return {
    headline: capitalize(
      `${temperatureWord((s.tempMinC + s.tempMaxC) / 2)}, ${conditionLabel}`
    ),
    summary: `${tempRange}, odczuwalnie ${feels}°C. ${precip}, wiatr do ${round(s.windMaxKmh)} km/h${gust}.`,
    walkRating,
    clothing,
    tips,
    alerts,
  };
}

/** Forecast + advice for a walk starting at `startAt` (past starts are treated as now). */
export async function getRouteWeather(
  location: LatLng,
  startAt: Date,
  durationMin: number,
  signal?: AbortSignal
): Promise<RouteWeather> {
  const from = new Date(Math.max(startAt.getTime(), Date.now()));
  const to = new Date(from.getTime() + durationMin * 60_000);
  const hours = await fetchHourlyForecast(location, from, to, signal);

  return {
    location,
    from: from.toISOString(),
    to: to.toISOString(),
    hours,
    summary: summarizeHours(hours),
    advice: buildWeatherAdvice(hours, durationMin),
    generatedAt: new Date().toISOString(),
  };
}

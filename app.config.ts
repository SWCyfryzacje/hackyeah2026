import { ConfigContext, ExpoConfig } from 'expo/config';

// Maps use PROVIDER_GOOGLE, which on iOS needs the Google Maps SDK.
// Keys come from .env (see .env).
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_IOS_API_KEY =
  process.env.GOOGLE_MAPS_IOS_API_KEY ?? GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn(
    '[app.config] Missing GOOGLE_MAPS_API_KEY — the map will not work.'
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Wypadowo',
  slug: config.slug ?? 'expo-template',
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: GOOGLE_MAPS_IOS_API_KEY ?? '',
    },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
});

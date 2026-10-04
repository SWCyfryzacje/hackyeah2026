import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import useRouteWeather, {
  type UseRouteWeatherOptions,
} from '@/hooks/useRouteWeather';
import type {
  ClothingIcon,
  WalkRating,
  WeatherCondition,
} from '@/types/weather';
import { WALK_RATING_LABELS } from '@/utils/weather-advice';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const CONDITION_ICONS: Record<
  WeatherCondition,
  [day: IconName, night: IconName]
> = {
  clear: ['weather-sunny', 'weather-night'],
  'partly-cloudy': ['weather-partly-cloudy', 'weather-night-partly-cloudy'],
  cloudy: ['weather-cloudy', 'weather-cloudy'],
  fog: ['weather-fog', 'weather-fog'],
  drizzle: ['weather-rainy', 'weather-rainy'],
  rain: ['weather-rainy', 'weather-rainy'],
  'heavy-rain': ['weather-pouring', 'weather-pouring'],
  'freezing-rain': ['weather-snowy-rainy', 'weather-snowy-rainy'],
  snow: ['weather-snowy', 'weather-snowy'],
  thunderstorm: ['weather-lightning-rainy', 'weather-lightning-rainy'],
};

const CLOTHING_ICONS: Record<ClothingIcon, IconName> = {
  'warm-jacket': 'coat-rack',
  jacket: 'hanger',
  layer: 'tshirt-v',
  tshirt: 'tshirt-crew',
  raincoat: 'weather-pouring',
  umbrella: 'umbrella',
  hat: 'hat-fedora',
  gloves: 'hand-back-right',
  cap: 'hat-fedora',
  sunglasses: 'sunglasses',
  sunscreen: 'lotion-outline',
  water: 'cup-water',
  shoes: 'shoe-sneaker',
  boots: 'hiking',
  light: 'flashlight',
};

const RATING_STYLES: Record<WalkRating, { box: string; text: string }> = {
  good: { box: 'bg-green-100', text: 'text-green-800' },
  ok: { box: 'bg-amber-100', text: 'text-amber-800' },
  poor: { box: 'bg-red-100', text: 'text-red-800' },
};

type Props = UseRouteWeatherOptions & {
  /** Start collapsed to one line (e.g. inside the planner panel) */
  defaultExpanded?: boolean;
};

/** Weather over the hours of a planned walk, with clothing advice. */
export default function RouteWeatherCard({
  defaultExpanded = false,
  ...options
}: Props) {
  const { weather, loading, error, refresh } = useRouteWeather(options);
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!weather) {
    if (!loading && !error) return null;
    return (
      <Pressable
        onPress={error ? refresh : undefined}
        className='flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5'>
        {loading ? (
          <ActivityIndicator
            size='small'
            color='#2563eb'
          />
        ) : (
          <Ionicons
            name='refresh'
            size={16}
            color='#64748b'
          />
        )}
        <Text className='text-sm text-neutral-600'>
          {loading ? 'Sprawdzam pogodę…' : `${error} Dotknij, aby ponowić.`}
        </Text>
      </Pressable>
    );
  }

  const { summary, advice } = weather;
  const rating = RATING_STYLES[advice.walkRating];
  const [dayIcon, nightIcon] = CONDITION_ICONS[summary.condition];

  return (
    <View className='gap-3 rounded-xl border border-neutral-200 bg-white p-3'>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className='flex-row items-center gap-3 active:opacity-70'>
        <MaterialCommunityIcons
          name={summary.isDay ? dayIcon : nightIcon}
          size={30}
          color='#2563eb'
        />
        <View className='flex-1'>
          <Text
            className='text-sm font-bold text-neutral-900'
            numberOfLines={1}>
            {advice.headline}
          </Text>
          <Text
            className='text-xs text-neutral-500'
            numberOfLines={expanded ? undefined : 1}>
            {advice.summary}
          </Text>
        </View>
        <View className={`rounded-full px-2 py-0.5 ${rating.box}`}>
          <Text className={`text-xs font-semibold ${rating.text}`}>
            {WALK_RATING_LABELS[advice.walkRating]}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color='#64748b'
        />
      </Pressable>

      {expanded && (
        <>
          {advice.alerts.map((a) => (
            <View
              key={a.text}
              className={`flex-row items-center gap-2 rounded-lg px-2.5 py-2 ${
                a.level === 'warning' ? 'bg-red-50' : 'bg-amber-50'
              }`}>
              <MaterialCommunityIcons
                name={a.level === 'warning' ? 'alert' : 'information-outline'}
                size={16}
                color={a.level === 'warning' ? '#dc2626' : '#d97706'}
              />
              <Text className='flex-1 text-xs text-neutral-800'>{a.text}</Text>
            </View>
          ))}

          <View className='gap-1.5'>
            <Text className='text-xs font-semibold text-neutral-500 uppercase'>
              Co zabrać
            </Text>
            {advice.clothing.map((c) => (
              <View
                key={c.item}
                className='flex-row items-center gap-2'>
                <MaterialCommunityIcons
                  name={CLOTHING_ICONS[c.icon]}
                  size={18}
                  color='#334155'
                />
                <Text className='text-sm text-neutral-800'>{c.item}</Text>
                <Text
                  className='flex-1 text-xs text-neutral-500'
                  numberOfLines={1}>
                  {c.reason}
                </Text>
              </View>
            ))}
          </View>

          {advice.tips.map((t) => (
            <Text
              key={t}
              className='text-xs text-neutral-700'>
              {`• ${t}`}
            </Text>
          ))}

          <Text className='text-right text-[10px] text-neutral-400'>
            Pogoda: Open-Meteo.com
          </Text>
        </>
      )}
    </View>
  );
}

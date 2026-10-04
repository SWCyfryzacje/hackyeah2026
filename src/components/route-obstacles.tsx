import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { Marker, Polygon, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteObstacles } from '@/hooks/useRouteObstacles';
import { OBSTACLE_LABELS, type Obstacle } from '@/utils/obstacles';

const OBSTACLE_COLOR = '#dc2626';
const REPORTED_COLOR = '#ea580c';
const REROUTED_COLOR = '#7c3aed';
const AVOIDED_COLOR = '#16a34a';

/** 1 przeszkoda, 2 przeszkody, 5 przeszkód */
function plural(n: number, [one, few, many]: [string, string, string]) {
  if (n === 1) return `${n} ${one}`;
  const lastTwo = n % 100;
  const last = n % 10;
  const isFew = last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${n} ${isFew ? few : many}`;
}

function formatDelta(m: number) {
  const sign = m >= 0 ? '+' : '−';
  const abs = Math.abs(m);
  return abs >= 1000
    ? `${sign}${(abs / 1000).toFixed(1)} km`
    : `${sign}${Math.round(abs)} m`;
}

function ObstacleShape({
  obstacle,
  onRemove,
}: {
  obstacle: Obstacle;
  onRemove: (id: string) => void;
}) {
  const label = obstacle.name
    ? `${OBSTACLE_LABELS[obstacle.kind]}: ${obstacle.name}`
    : OBSTACLE_LABELS[obstacle.kind];

  if (obstacle.shape === 'area') {
    return (
      <Polygon
        coordinates={obstacle.points}
        strokeColor={OBSTACLE_COLOR}
        fillColor='rgba(220, 38, 38, 0.2)'
        strokeWidth={2}
      />
    );
  }

  if (obstacle.shape === 'line') {
    return (
      <Polyline
        coordinates={obstacle.points}
        strokeColor={OBSTACLE_COLOR}
        strokeWidth={6}
        lineDashPattern={[10, 6]}
        zIndex={3}
      />
    );
  }

  const reported = obstacle.kind === 'reported';
  return (
    <Marker
      coordinate={obstacle.center}
      pinColor={reported ? REPORTED_COLOR : OBSTACLE_COLOR}
      title={label}
      description={reported ? 'Dotknij, aby usunąć' : undefined}
      onCalloutPress={reported ? () => onRemove(obstacle.id) : undefined}
    />
  );
}

/**
 * Obstacles near the route and the route rerouted around them; render inside
 * the map, after the route polylines.
 */
export function RouteObstacleOverlays({
  nearby,
  rerouted,
  remove,
}: RouteObstacles) {
  return (
    <>
      {nearby.map((o) => (
        <ObstacleShape
          key={o.id}
          obstacle={o}
          onRemove={remove}
        />
      ))}
      <Polyline
        coordinates={rerouted?.coords ?? []}
        strokeWidth={rerouted ? 5 : 0}
        strokeColor={rerouted ? REROUTED_COLOR : 'transparent'}
        zIndex={2}
      />
    </>
  );
}

/** Panel card: obstacles on the route and whether the route goes around them. */
export function RouteObstacleCard({
  blocking,
  rerouted,
  original,
  avoided,
  avoid,
  setAvoid,
  loading,
  error,
  refresh,
}: RouteObstacles) {
  const [expanded, setExpanded] = useState(false);

  if (!original) return null;

  if (error && blocking.length === 0) {
    return (
      <Pressable
        onPress={refresh}
        className='flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5'>
        <Ionicons
          name='refresh'
          size={16}
          color='#64748b'
        />
        <Text className='flex-1 text-sm text-neutral-600'>
          {`${error} Dotknij, aby ponowić.`}
        </Text>
      </Pressable>
    );
  }

  if (blocking.length === 0) {
    return (
      <View className='flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5'>
        {loading ? (
          <ActivityIndicator
            size='small'
            color={REROUTED_COLOR}
          />
        ) : (
          <MaterialCommunityIcons
            name='road-variant'
            size={18}
            color={AVOIDED_COLOR}
          />
        )}
        <View className='flex-1'>
          <Text className='text-sm text-neutral-800'>
            {loading
              ? 'Sprawdzam przeszkody w okolicy…'
              : 'Brak przeszkód na trasie'}
          </Text>
          <Text className='text-[11px] text-neutral-500'>
            Przytrzymaj mapę, aby zgłosić przeszkodę
          </Text>
        </View>
      </View>
    );
  }

  const avoidedIds = new Set(avoided.map((o) => o.id));
  const left = blocking.length - avoided.length;

  let title: string;
  let subtitle: string;
  if (!avoid) {
    title = `${plural(blocking.length, ['przeszkoda', 'przeszkody', 'przeszkód'])} na trasie`;
    subtitle = 'Omijanie wyłączone';
  } else if (loading) {
    title = 'Wyznaczam objazd…';
    subtitle = `${plural(blocking.length, ['przeszkoda', 'przeszkody', 'przeszkód'])} na trasie`;
  } else if (rerouted) {
    title = `Ominięto ${plural(avoided.length, ['przeszkodę', 'przeszkody', 'przeszkód'])}`;
    subtitle =
      `Objazd ${formatDelta(rerouted.distance - original.distance)}` +
      (left > 0 ? ` · ${left} nadal na trasie` : ' · reszta trasy bez zmian');
  } else {
    title = `${plural(blocking.length, ['przeszkoda', 'przeszkody', 'przeszkód'])} na trasie`;
    subtitle = 'Brak rozsądnego objazdu';
  }

  return (
    <View className='gap-2 rounded-xl border border-neutral-200 bg-white p-3'>
      <View className='flex-row items-center gap-3'>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          className='flex-1 flex-row items-center gap-3 active:opacity-70'>
          {loading ? (
            <ActivityIndicator
              size='small'
              color={REROUTED_COLOR}
            />
          ) : (
            <MaterialCommunityIcons
              name={rerouted ? 'call-split' : 'sign-caution'}
              size={24}
              color={rerouted ? REROUTED_COLOR : OBSTACLE_COLOR}
            />
          )}
          <View className='flex-1'>
            <Text
              className='text-sm font-bold text-neutral-900'
              numberOfLines={1}>
              {title}
            </Text>
            <Text
              className='text-xs text-neutral-500'
              numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color='#64748b'
          />
        </Pressable>
        <Switch
          value={avoid}
          onValueChange={setAvoid}
          trackColor={{ true: REROUTED_COLOR, false: '#d4d4d4' }}
          thumbColor='#ffffff'
          style={{ transform: [{ scale: 0.8 }] }}
        />
      </View>

      {expanded && (
        <>
          {blocking.map((o) => {
            const ok = avoidedIds.has(o.id);
            return (
              <View
                key={o.id}
                className='flex-row items-center gap-2'>
                <MaterialCommunityIcons
                  name={ok ? 'check-circle' : 'alert'}
                  size={16}
                  color={ok ? AVOIDED_COLOR : OBSTACLE_COLOR}
                />
                <Text
                  className='flex-1 text-sm text-neutral-800'
                  numberOfLines={1}>
                  {OBSTACLE_LABELS[o.kind]}
                  {o.name ? (
                    <Text className='text-neutral-500'>{` · ${o.name}`}</Text>
                  ) : null}
                </Text>
                <Text className='text-xs text-neutral-500'>
                  {ok ? 'ominięta' : 'na trasie'}
                </Text>
              </View>
            );
          })}
          <Text className='text-[11px] text-neutral-500'>
            Przytrzymaj mapę, aby zgłosić przeszkodę. Dane: © OpenStreetMap.
          </Text>
        </>
      )}
    </View>
  );
}

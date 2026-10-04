import type { ReactNode } from 'react';
import { Linking, Switch, Text, View } from 'react-native';
import { EVENT_MARKER_COLOR, GEOCODING_ATTRIBUTION } from '@/constants/events';
import useMapLayers, { type MapLayer } from '@/hooks/useMapLayers';
import { RECREATION_MARKER_COLOR } from '@/constants/recreation';

const MONUMENT_COLOR = '#d97706';

function LayerRow({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className='flex-row items-center gap-2'>
      <View
        className='size-2.5 rounded-full'
        style={{ backgroundColor: color }}
      />
      <Text className='flex-1 text-sm font-semibold text-neutral-900'>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: color, false: '#d4d4d4' }}
        thumbColor='#ffffff'
        style={{ transform: [{ scale: 0.8 }] }}
      />
    </View>
  );
}

type Props = {
  className?: string;
};

/** Card with switches to show or hide monument, event and recreation markers on the maps. */
export default function MapLayerToggles({ className = '' }: Props) {
  const [layers, setLayer] = useMapLayers();
  // Events and recreation areas both come from LocationIQ search on OSM data
  const attribution =
    layers.events || layers.recreation ? GEOCODING_ATTRIBUTION : [];

  return (
    <View
      className={`w-48 rounded-2xl border border-neutral-300/80 bg-white/95 px-3 py-1.5 shadow-md ${className}`}>
      <LayerRow
        label='Monuments'
        color={MONUMENT_COLOR}
        value={layers.monuments}
        onChange={(v) => setLayer('monuments', v)}
      />
      <LayerRow
        label='Events'
        color={EVENT_MARKER_COLOR}
        value={layers.events}
        onChange={(v) => setLayer('events', v)}
      />
      <LayerRow
        label='Parks & recreation'
        color={RECREATION_MARKER_COLOR}
        value={layers.recreation}
        onChange={(v) => setLayer('recreation', v)}
      />
      {attribution.length > 0 && (
        <Text className='pb-0.5 text-[10px] leading-tight text-neutral-500'>
          {attribution.map((a, i) => (
            <Text
              key={a.url}
              onPress={() => void Linking.openURL(a.url)}>
              {i > 0 ? ' · ' : ''}
              <Text className='underline'>{a.label}</Text>
            </Text>
          ))}
        </Text>
      )}
    </View>
  );
}

/** Renders its markers only while the given layer is switched on. */
export function MapLayerGate({
  layer,
  children,
}: {
  layer: MapLayer;
  children: ReactNode;
}) {
  const [layers] = useMapLayers();
  return layers[layer] ? children : null;
}

import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProfile, RouteType } from '@/hooks/useRouteCalculation';
import {
  DEFAULT_ROUTE_DISTANCE_OPTIONS,
  type RoutePreset,
} from '@/constants/map';

export type RoutePreferences = {
  type: RouteType;
  minKm: number;
  maxKm: number;
  profile: RouteProfile;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (preferences: RoutePreferences) => void;
  initialPreferences?: Partial<RoutePreferences>;
};

export default function RoutePreferencesModal({
  visible,
  onClose,
  onConfirm,
  initialPreferences,
}: Props) {
  const [selectedType, setSelectedType] = useState<RouteType>(
    initialPreferences?.type ?? 'loop'
  );
  const [selectedPreset, setSelectedPreset] = useState<RoutePreset>(
    DEFAULT_ROUTE_DISTANCE_OPTIONS.find(
      (p) =>
        p.minKm === initialPreferences?.minKm &&
        p.maxKm === initialPreferences?.maxKm
    ) ?? DEFAULT_ROUTE_DISTANCE_OPTIONS[0]
  );
  const [selectedProfile, setSelectedProfile] = useState<RouteProfile>(
    initialPreferences?.profile ?? 'walking'
  );
  // Keep the sheet above the system navigation bar (edge-to-edge on Android)
  const { bottom } = useSafeAreaInsets();

  const handleGenerate = () => {
    onConfirm({
      type: selectedType,
      minKm: selectedPreset.minKm,
      maxKm: selectedPreset.maxKm,
      profile: selectedProfile,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}>
      <View className='flex-1 justify-end bg-slate-900/60 sm:justify-center sm:p-6 backdrop-blur-sm'>
        <Pressable
          className='flex-1'
          onPress={onClose}
        />
        <View
          className='overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl border border-slate-100'
          style={{ paddingBottom: 24 + bottom }}>
          {/* Header */}
          <View className='flex-row items-center justify-between border-b border-slate-100 pb-4'>
            <View className='flex-row items-center gap-2.5'>
              <View className='size-10 items-center justify-center rounded-2xl bg-indigo-50'>
                <Ionicons
                  name='options-outline'
                  size={20}
                  color='#4f46e5'
                />
              </View>
              <View>
                <Text className='text-lg font-extrabold text-slate-900'>
                  Generator trasy
                </Text>
                <Text className='text-xs text-slate-500'>
                  Dostosuj preferencje generowania
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className='size-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200'>
              <Ionicons
                name='close'
                size={18}
                color='#64748b'
              />
            </Pressable>
          </View>

          {/* Section: Route Type */}
          <View className='mt-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-slate-600 uppercase'>
              Typ trasy
            </Text>
            <View className='flex-row gap-3'>
              <Pressable
                onPress={() => setSelectedType('loop')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'loop'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <Ionicons
                    name='sync-outline'
                    size={20}
                    color={selectedType === 'loop' ? '#4f46e5' : '#64748b'}
                  />
                  {selectedType === 'loop' && (
                    <Ionicons
                      name='checkmark-circle'
                      size={18}
                      color='#4f46e5'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2 text-sm font-bold ${
                    selectedType === 'loop'
                      ? 'text-indigo-950'
                      : 'text-slate-800'
                  }`}>
                  Pętla
                </Text>
                <Text className='mt-0.5 text-[11px] text-slate-500'>
                  Start i meta w tym samym punkcie
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedType('one_way')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'one_way'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <Ionicons
                    name='arrow-forward-outline'
                    size={20}
                    color={selectedType === 'one_way' ? '#4f46e5' : '#64748b'}
                  />
                  {selectedType === 'one_way' && (
                    <Ionicons
                      name='checkmark-circle'
                      size={18}
                      color='#4f46e5'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2 text-sm font-bold ${
                    selectedType === 'one_way'
                      ? 'text-indigo-950'
                      : 'text-slate-800'
                  }`}>
                  W jedną stronę
                </Text>
                <Text className='mt-0.5 text-[11px] text-slate-500'>
                  Trasa do ciekawego celu w okolicy
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Section: Distance Range */}
          <View className='mt-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-slate-600 uppercase'>
              Dystans
            </Text>
            <View className='flex-row gap-2'>
              {DEFAULT_ROUTE_DISTANCE_OPTIONS.map((preset) => {
                const isSelected =
                  selectedPreset.minKm === preset.minKm &&
                  selectedPreset.maxKm === preset.maxKm;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => setSelectedPreset(preset)}
                    className={`flex-1 items-center justify-center rounded-xl border py-2.5 px-1 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 shadow-xs'
                        : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                    }`}>
                    {preset.tag && (
                      <Text
                        className={`text-[11px] font-semibold ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}>
                        {preset.tag}
                      </Text>
                    )}
                    <Text
                      className={`text-sm font-bold ${
                        isSelected ? 'text-white' : 'text-slate-800'
                      }`}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: Travel Mode */}
          <View className='mt-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-slate-600 uppercase'>
              Sposób podróży
            </Text>
            <View className='flex-row gap-3'>
              <Pressable
                onPress={() => setSelectedProfile('walking')}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                  selectedProfile === 'walking'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                }`}>
                <Ionicons
                  name='walk-outline'
                  size={18}
                  color={selectedProfile === 'walking' ? '#4f46e5' : '#64748b'}
                />
                <Text
                  className={`text-sm font-bold ${
                    selectedProfile === 'walking'
                      ? 'text-indigo-950'
                      : 'text-slate-700'
                  }`}>
                  Pieszo
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedProfile('driving')}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                  selectedProfile === 'driving'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                }`}>
                <Ionicons
                  name='car-outline'
                  size={18}
                  color={selectedProfile === 'driving' ? '#4f46e5' : '#64748b'}
                />
                <Text
                  className={`text-sm font-bold ${
                    selectedProfile === 'driving'
                      ? 'text-indigo-950'
                      : 'text-slate-700'
                  }`}>
                  Samochodem
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Action Button */}
          <View className='mt-7'>
            <Pressable
              onPress={handleGenerate}
              className='h-12 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 shadow-sm active:bg-indigo-700 active:scale-[0.99]'>
              <Ionicons
                name='sparkles'
                size={18}
                color='#ffffff'
              />
              <Text className='text-sm font-bold text-white'>
                Generuj trasę
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <View className='flex-1 justify-end bg-black/60 sm:justify-center sm:p-6'>
        <Pressable
          className='flex-1'
          onPress={onClose}
        />
        <View className='overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl'>
          {/* Header */}
          <View className='flex-row items-center justify-between border-b border-neutral-100 pb-4'>
            <View className='flex-row items-center gap-2.5'>
              <View className='size-9 items-center justify-center rounded-xl bg-blue-100'>
                <Ionicons
                  name='options-outline'
                  size={20}
                  color='#2563eb'
                />
              </View>
              <View>
                <Text className='text-lg font-bold text-neutral-900'>
                  Generator trasy
                </Text>
                <Text className='text-xs text-neutral-500'>
                  Dostosuj preferencje generowania
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className='size-8 items-center justify-center rounded-full bg-neutral-100 active:bg-neutral-200'>
              <Ionicons
                name='close'
                size={18}
                color='#64748b'
              />
            </Pressable>
          </View>

          {/* Section: Route Type */}
          <View className='mt-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-neutral-500 uppercase'>
              Typ trasy
            </Text>
            <View className='flex-row gap-3'>
              <Pressable
                onPress={() => setSelectedType('loop')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'loop'
                    ? 'border-blue-600 bg-blue-50/70'
                    : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <Ionicons
                    name='sync-outline'
                    size={20}
                    color={selectedType === 'loop' ? '#2563eb' : '#64748b'}
                  />
                  {selectedType === 'loop' && (
                    <Ionicons
                      name='checkmark-circle'
                      size={18}
                      color='#2563eb'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2 font-bold ${
                    selectedType === 'loop'
                      ? 'text-blue-900'
                      : 'text-neutral-800'
                  }`}>
                  Pętla
                </Text>
                <Text className='mt-0.5 text-[11px] text-neutral-500'>
                  Start i meta w tym samym punkcie
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedType('one_way')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'one_way'
                    ? 'border-blue-600 bg-blue-50/70'
                    : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <Ionicons
                    name='arrow-forward-outline'
                    size={20}
                    color={selectedType === 'one_way' ? '#2563eb' : '#64748b'}
                  />
                  {selectedType === 'one_way' && (
                    <Ionicons
                      name='checkmark-circle'
                      size={18}
                      color='#2563eb'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2 font-bold ${
                    selectedType === 'one_way'
                      ? 'text-blue-900'
                      : 'text-neutral-800'
                  }`}>
                  W jedną stronę
                </Text>
                <Text className='mt-0.5 text-[11px] text-neutral-500'>
                  Trasa do ciekawego celu w okolicy
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Section: Distance Range */}
          <View className='mt-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-neutral-500 uppercase'>
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
                        ? 'border-blue-600 bg-blue-600 shadow-sm'
                        : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100'
                    }`}>
                    {preset.tag && (
                      <Text
                        className={`text-[11px] font-semibold ${
                          isSelected ? 'text-blue-100' : 'text-neutral-500'
                        }`}>
                        {preset.tag}
                      </Text>
                    )}
                    <Text
                      className={`text-sm font-bold ${
                        isSelected ? 'text-white' : 'text-neutral-800'
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
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-neutral-500 uppercase'>
              Sposób podróży
            </Text>
            <View className='flex-row gap-3'>
              <Pressable
                onPress={() => setSelectedProfile('walking')}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                  selectedProfile === 'walking'
                    ? 'border-blue-600 bg-blue-50/70'
                    : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100'
                }`}>
                <Ionicons
                  name='walk-outline'
                  size={18}
                  color={selectedProfile === 'walking' ? '#2563eb' : '#64748b'}
                />
                <Text
                  className={`text-sm font-bold ${
                    selectedProfile === 'walking'
                      ? 'text-blue-900'
                      : 'text-neutral-700'
                  }`}>
                  Pieszo
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedProfile('driving')}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                  selectedProfile === 'driving'
                    ? 'border-blue-600 bg-blue-50/70'
                    : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100'
                }`}>
                <Ionicons
                  name='car-outline'
                  size={18}
                  color={selectedProfile === 'driving' ? '#2563eb' : '#64748b'}
                />
                <Text
                  className={`text-sm font-bold ${
                    selectedProfile === 'driving'
                      ? 'text-blue-900'
                      : 'text-neutral-700'
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
              className='flex-row items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 shadow-md active:bg-blue-700'>
              <Ionicons
                name='sparkles'
                size={18}
                color='#ffffff'
              />
              <Text className='text-base font-bold text-white'>
                Generuj trasę
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

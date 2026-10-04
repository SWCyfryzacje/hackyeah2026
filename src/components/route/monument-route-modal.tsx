import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteType } from '@/hooks/useRouteCalculation';
import type { Monument } from '@/utils/monuments';
import { formatDistance } from '@/components/monument-marker';

type Props = {
  visible: boolean;
  monument: Monument | null;
  onClose: () => void;
  onConfirm: (type: RouteType) => void;
};

export default function MonumentRouteModal({
  visible,
  monument,
  onClose,
  onConfirm,
}: Props) {
  const [selectedType, setSelectedType] = useState<RouteType>('loop');
  const [imageError, setImageError] = useState(false);

  if (!monument) return null;

  const hasImage = Boolean(monument.imageUrl) && !imageError;

  const handleConfirm = () => {
    onConfirm(selectedType);
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
                  name='compass-outline'
                  size={20}
                  color='#2563eb'
                />
              </View>
              <View>
                <Text className='text-lg font-bold text-neutral-900'>
                  Zaplanuj trasę
                </Text>
                <Text className='text-xs text-neutral-500'>
                  Wybierz rodzaj trasy do zabytku
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

          {/* Monument Preview Card */}
          <View className='mt-4 flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3'>
            {hasImage ? (
              <Image
                source={{ uri: monument.imageUrl! }}
                style={{ width: 56, height: 56, borderRadius: 12 }}
                contentFit='cover'
                transition={200}
                onError={() => setImageError(true)}
              />
            ) : (
              <View className='size-14 items-center justify-center rounded-xl bg-amber-500'>
                <MaterialCommunityIcons
                  name='pillar'
                  size={26}
                  color='#ffffff'
                />
              </View>
            )}

            <View className='flex-1'>
              <Text
                className='text-sm font-bold text-neutral-900'
                numberOfLines={1}>
                {monument.name}
              </Text>
              <View className='mt-1 flex-row items-center gap-1.5'>
                <Ionicons
                  name='location-outline'
                  size={12}
                  color='#64748b'
                />
                <Text className='text-xs font-medium text-neutral-600'>
                  {formatDistance(monument.distanceM)} od Ciebie
                </Text>
                {monument.kind && (
                  <Text className='text-xs font-semibold text-neutral-400 capitalize'>
                    • {monument.kind}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Route Type Selection (Single choice: One Way vs Loop) */}
          <View className='mt-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-neutral-500 uppercase'>
              Typ trasy
            </Text>
            <View className='flex-row gap-3'>
              {/* Loop Option */}
              <Pressable
                onPress={() => setSelectedType('loop')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'loop'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                    : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <View
                    className={`size-8 items-center justify-center rounded-lg ${
                      selectedType === 'loop' ? 'bg-blue-600' : 'bg-neutral-200'
                    }`}>
                    <Ionicons
                      name='sync-outline'
                      size={18}
                      color={selectedType === 'loop' ? '#ffffff' : '#64748b'}
                    />
                  </View>
                  {selectedType === 'loop' && (
                    <Ionicons
                      name='checkmark-circle'
                      size={18}
                      color='#2563eb'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2.5 font-bold ${
                    selectedType === 'loop'
                      ? 'text-blue-900'
                      : 'text-neutral-800'
                  }`}>
                  Pętla
                </Text>
                <Text className='mt-0.5 text-[11px] text-neutral-500'>
                  Start i meta u Ciebie, trasa przez zabytek
                </Text>
              </Pressable>

              {/* One Way Option */}
              <Pressable
                onPress={() => setSelectedType('one_way')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'one_way'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                    : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <View
                    className={`size-8 items-center justify-center rounded-lg ${
                      selectedType === 'one_way'
                        ? 'bg-blue-600'
                        : 'bg-neutral-200'
                    }`}>
                    <Ionicons
                      name='arrow-forward-outline'
                      size={18}
                      color={selectedType === 'one_way' ? '#ffffff' : '#64748b'}
                    />
                  </View>
                  {selectedType === 'one_way' && (
                    <Ionicons
                      name='checkmark-circle'
                      size={18}
                      color='#2563eb'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2.5 font-bold ${
                    selectedType === 'one_way'
                      ? 'text-blue-900'
                      : 'text-neutral-800'
                  }`}>
                  W jedną stronę
                </Text>
                <Text className='mt-0.5 text-[11px] text-neutral-500'>
                  Trasa bezpośrednio do wybranego celu
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Action Button */}
          <View className='mt-7'>
            <Pressable
              onPress={handleConfirm}
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

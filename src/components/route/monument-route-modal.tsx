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
      <View className='flex-1 justify-end bg-slate-900/60 sm:justify-center sm:p-6 backdrop-blur-sm'>
        <Pressable
          className='flex-1'
          onPress={onClose}
        />
        <View className='overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl border border-slate-100'>
          {/* Header */}
          <View className='flex-row items-center justify-between border-b border-slate-100 pb-4'>
            <View className='flex-row items-center gap-2.5'>
              <View className='size-10 items-center justify-center rounded-2xl bg-indigo-50'>
                <Ionicons
                  name='compass-outline'
                  size={20}
                  color='#4f46e5'
                />
              </View>
              <View>
                <Text className='text-lg font-extrabold text-slate-900'>
                  Zaplanuj trasę
                </Text>
                <Text className='text-xs text-slate-500'>
                  Wybierz rodzaj trasy do zabytku
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

          {/* Monument Preview Card */}
          <View className='mt-4 flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3'>
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
                className='text-sm font-bold text-slate-900'
                numberOfLines={1}>
                {monument.name}
              </Text>
              <View className='mt-1 flex-row items-center gap-1.5'>
                <Ionicons
                  name='location-outline'
                  size={12}
                  color='#64748b'
                />
                <Text className='text-xs font-medium text-slate-600'>
                  {formatDistance(monument.distanceM)} od Ciebie
                </Text>
                {monument.kind && (
                  <Text className='text-xs font-semibold text-slate-400 capitalize'>
                    • {monument.kind}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Route Type Selection (Single choice: One Way vs Loop) */}
          <View className='mt-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-slate-600 uppercase'>
              Typ trasy
            </Text>
            <View className='flex-row gap-3'>
              {/* Loop Option */}
              <Pressable
                onPress={() => setSelectedType('loop')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'loop'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <View
                    className={`size-8 items-center justify-center rounded-lg ${
                      selectedType === 'loop' ? 'bg-indigo-600' : 'bg-slate-200'
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
                      color='#4f46e5'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2.5 font-bold ${
                    selectedType === 'loop'
                      ? 'text-indigo-950'
                      : 'text-slate-800'
                  }`}>
                  Pętla
                </Text>
                <Text className='mt-0.5 text-[11px] text-slate-500'>
                  Start i meta u Ciebie, trasa przez zabytek
                </Text>
              </Pressable>

              {/* One Way Option */}
              <Pressable
                onPress={() => setSelectedType('one_way')}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  selectedType === 'one_way'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <View
                    className={`size-8 items-center justify-center rounded-lg ${
                      selectedType === 'one_way'
                        ? 'bg-indigo-600'
                        : 'bg-slate-200'
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
                      color='#4f46e5'
                    />
                  )}
                </View>
                <Text
                  className={`mt-2.5 font-bold ${
                    selectedType === 'one_way'
                      ? 'text-indigo-950'
                      : 'text-slate-800'
                  }`}>
                  W jedną stronę
                </Text>
                <Text className='mt-0.5 text-[11px] text-slate-500'>
                  Trasa bezpośrednio do wybranego celu
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Action Button */}
          <View className='mt-7'>
            <Pressable
              onPress={handleConfirm}
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

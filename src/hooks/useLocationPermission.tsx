import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { Linking, Modal, Pressable, Text, View } from 'react-native';

type ModalProps = {
  visible: boolean;
  onAllow: () => void;
  onLater: () => void;
};

export default function useLocationPermission() {
  const [visibility, setVisibility] = useState(false);
  const [granted, setGranted] = useState(false);

  const onAllow = useCallback(async () => {
    setVisibility(false);

    const { status, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') setGranted(true);
    else if (!canAskAgain) await Linking.openSettings();
  }, []);

  const onLater = useCallback(() => {
    setVisibility(false);
  }, []);

  const showModal = useCallback(() => setVisibility(true), []);
  const hideModal = useCallback(() => setVisibility(false), []);
  const grantPermission = useCallback(() => setGranted(true), []);

  return {
    granted,
    visibility,
    showModal,
    hideModal,
    grantPermission,
    onAllow,
    onLater,
  };
}

export function LocationModal({ visible, onAllow, onLater }: ModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onLater}>
      <View className='flex-1 justify-center bg-black/50 p-6'>
        <View className='gap-3 rounded-2xl bg-white p-5'>
          <Text className='text-lg font-bold'>Allow location?</Text>
          <Text className='text-[15px] text-neutral-700'>
            We use your location to show you on the map.
          </Text>
          <Pressable
            className='items-center rounded-xl bg-blue-600 p-3'
            onPress={onAllow}>
            <Text className='font-semibold text-white'>Continue</Text>
          </Pressable>
          <Pressable onPress={onLater}>
            <Text className='p-1 text-center text-neutral-500'>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

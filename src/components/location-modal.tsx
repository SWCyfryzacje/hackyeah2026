import { Modal, Pressable, Text, View } from 'react-native';

export type LocationModalProps = {
  visible: boolean;
  onAllow: () => void;
  onLater: () => void;
};

export default function LocationModal({
  visible,
  onAllow,
  onLater,
}: LocationModalProps) {
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
            className='items-center rounded-xl bg-blue-600 p-3 active:bg-blue-700'
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

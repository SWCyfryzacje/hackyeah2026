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
      <View className='flex-1 justify-center bg-slate-900/60 p-6 backdrop-blur-sm'>
        <View className='gap-4 rounded-3xl bg-white p-6 shadow-xl border border-slate-100'>
          <View className='gap-1.5'>
            <Text className='text-xl font-extrabold text-slate-900'>Allow Location Access?</Text>
            <Text className='text-sm leading-5 text-slate-600'>
              We use your location to calculate intelligent closed loops and highlight nearby cultural monuments in real time.
            </Text>
          </View>
          <View className='gap-2 pt-2'>
            <Pressable
              className='h-12 items-center justify-center rounded-xl bg-indigo-600 px-4 active:bg-indigo-700 shadow-sm'
              onPress={onAllow}>
              <Text className='text-sm font-bold text-white'>Continue with Location</Text>
            </Pressable>
            <Pressable
              className='h-11 items-center justify-center rounded-xl active:bg-slate-100'
              onPress={onLater}>
              <Text className='text-sm font-semibold text-slate-500'>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

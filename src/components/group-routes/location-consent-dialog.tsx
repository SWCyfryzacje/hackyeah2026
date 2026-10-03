import { Modal, Pressable, Text, View } from 'react-native';

export type LocationConsentDialogProps = {
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

const POINTS: { label: string; text: string }[] = [
  {
    label: 'Kto widzi:',
    text: 'tylko uczestnicy tej trasy.',
  },
  {
    label: 'Od kiedy:',
    text: 'od naciśnięcia „Rozpocznij”, gdy aplikacja jest otwarta.',
  },
  {
    label: 'Do kiedy:',
    text: 'do zakończenia trasy — wtedy pozycja jest usuwana. Nie zapisujemy historii.',
  },
];

/** Consent shown to the creator before starting the route (SPEC F5). */
export default function LocationConsentDialog({
  visible,
  onAccept,
  onCancel,
}: LocationConsentDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onCancel}>
      <View className='flex-1 justify-center bg-black/50 p-6'>
        <View className='gap-3 rounded-2xl bg-white p-5'>
          <Text className='text-lg font-bold'>Udostępnianie lokalizacji</Text>
          <Text className='text-[15px] text-neutral-700'>
            Po rozpoczęciu trasy Twoja aktualna pozycja będzie widoczna na mapie
            trasy.
          </Text>
          {POINTS.map((p) => (
            <Text
              key={p.label}
              className='text-[15px] text-neutral-700'>
              <Text className='font-semibold text-neutral-900'>{p.label}</Text>{' '}
              {p.text}
            </Text>
          ))}
          <Pressable
            className='items-center rounded-xl bg-blue-600 p-3 active:bg-blue-700'
            onPress={onAccept}>
            <Text className='font-semibold text-white'>
              Zgadzam się i rozpoczynam
            </Text>
          </Pressable>
          <Pressable onPress={onCancel}>
            <Text className='p-1 text-center text-neutral-500'>Anuluj</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

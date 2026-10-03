import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getGroupRouteDraft,
  setGroupRouteDraft,
} from '@/lib/group-route-draft';
import NewGroupRouteForm from '@/components/group-routes/new-group-route-form';

export default function NewGroupRouteScreen() {
  const router = useRouter();
  // Read once: the draft is cleared after a successful submit
  const [draft] = useState(getGroupRouteDraft);

  if (!draft) {
    return (
      <View className='flex-1 items-center justify-center gap-4 bg-neutral-50 p-6'>
        <Stack.Screen options={{ title: 'Nowa wspólna trasa' }} />
        <Ionicons
          name='map-outline'
          size={40}
          color='#64748b'
        />
        <Text className='text-center text-base text-neutral-700'>
          Najpierw wyznacz trasę w zakładce Route
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/route')}
          className='rounded-xl bg-blue-600 px-5 py-3 active:bg-blue-700'>
          <Text className='text-sm font-semibold text-white'>
            Przejdź do Route
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className='flex-1 bg-neutral-50'
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <Stack.Screen options={{ title: 'Nowa wspólna trasa' }} />
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <NewGroupRouteForm
          draft={draft}
          onCreated={(id) => {
            setGroupRouteDraft(null);
            router.replace({ pathname: '/group-routes/[id]', params: { id } });
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

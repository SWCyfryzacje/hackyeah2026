import React from 'react';
import { Text, TextInput, View } from 'react-native';

type SettingsPersonalInfoProps = {
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  hasChanges?: boolean;
};

export default function SettingsPersonalInfo({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  username,
  setUsername,
  bio,
  setBio,
  hasChanges = false,
}: SettingsPersonalInfoProps) {
  return (
    <View className='mt-6 px-5'>
      <View className='mb-2.5 flex-row items-center justify-between'>
        <Text className='text-xs font-bold tracking-wider text-slate-500 uppercase'>
          Dane osobowe
        </Text>
        {hasChanges && (
          <Text className='text-xs font-bold text-amber-600'>
            • Niezapisane zmiany
          </Text>
        )}
      </View>

      <View className='gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs'>
        {/* First Name & Last Name */}
        <View className='flex-row gap-3'>
          <View className='flex-1 gap-1.5'>
            <Text className='text-xs font-semibold text-slate-700'>
              Imię
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder='Imię'
              placeholderTextColor='#94a3b8'
              className='h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-medium text-slate-900'
            />
          </View>

          <View className='flex-1 gap-1.5'>
            <Text className='text-xs font-semibold text-slate-700'>
              Nazwisko
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder='Nazwisko'
              placeholderTextColor='#94a3b8'
              className='h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-medium text-slate-900'
            />
          </View>
        </View>

        {/* Username */}
        <View className='gap-1.5'>
          <Text className='text-xs font-semibold text-slate-700'>
            Nazwa użytkownika
          </Text>
          <View className='flex-row items-center rounded-xl border border-slate-200 bg-slate-50/50 px-3.5'>
            <Text className='mr-1 text-sm font-bold text-slate-400'>
              @
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder='nazwa_uzytkownika'
              placeholderTextColor='#94a3b8'
              autoCapitalize='none'
              className='h-12 flex-1 text-sm font-medium text-slate-900'
            />
          </View>
        </View>

        {/* Bio / About */}
        <View className='gap-1.5'>
          <Text className='text-xs font-semibold text-slate-700'>
            Bio / Motto biegowe
          </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder='np. Pasjonat maratonów i porannego biegania'
            placeholderTextColor='#94a3b8'
            multiline
            numberOfLines={3}
            className='h-20 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-medium text-slate-900'
            textAlignVertical='top'
          />
        </View>
      </View>
    </View>
  );
}

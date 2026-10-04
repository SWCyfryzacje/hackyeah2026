import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type SettingsAccountDetailsProps = {
  email: string;
  userId?: string | null;
  joinedDate?: string | number | Date | null;
};

export default function SettingsAccountDetails({
  email,
  userId,
  joinedDate,
}: SettingsAccountDetailsProps) {
  const formattedDate = joinedDate
    ? new Date(joinedDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  return (
    <View className='mt-6 px-5'>
      <Text className='mb-2.5 text-xs font-bold tracking-wider text-slate-500 uppercase'>
        Account & Security
      </Text>

      <View className='gap-3.5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs'>
        {/* Email */}
        <View className='flex-row items-center justify-between'>
          <View className='flex-row items-center gap-2.5'>
            <Ionicons
              name='mail-outline'
              size={18}
              color='#64748b'
            />
            <Text className='text-xs font-medium text-slate-600'>Email</Text>
          </View>
          <View className='flex-row items-center gap-1.5'>
            <Text
              className='text-xs font-bold text-slate-900'
              numberOfLines={1}>
              {email}
            </Text>
            <Ionicons
              name='checkmark-circle'
              size={14}
              color='#10b981'
            />
          </View>
        </View>

        <View className='h-px bg-slate-100' />

        {/* Clerk User ID */}
        <View className='flex-row items-center justify-between'>
          <View className='flex-row items-center gap-2.5'>
            <Ionicons
              name='finger-print-outline'
              size={18}
              color='#64748b'
            />
            <Text className='text-xs font-medium text-slate-600'>
              Clerk User ID
            </Text>
          </View>
          <Text
            className='font-mono text-xs font-medium text-slate-500'
            numberOfLines={1}>
            {userId ? `${userId.slice(0, 14)}...` : 'N/A'}
          </Text>
        </View>

        <View className='h-px bg-slate-100' />

        {/* Joined Date */}
        <View className='flex-row items-center justify-between'>
          <View className='flex-row items-center gap-2.5'>
            <MaterialCommunityIcons
              name='calendar-clock'
              size={18}
              color='#64748b'
            />
            <Text className='text-xs font-medium text-slate-600'>Joined</Text>
          </View>
          <Text className='text-xs font-semibold text-slate-700'>
            {formattedDate}
          </Text>
        </View>
      </View>
    </View>
  );
}

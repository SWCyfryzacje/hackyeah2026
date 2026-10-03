import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACTIVITY_LEVELS, GOAL_PRESETS } from '@/constants/settings';

type SettingsWorkoutPreferencesProps = {
  activityLevel: string;
  setActivityLevel: (val: string) => void;
  weeklyGoal: string;
  setWeeklyGoal: (val: string) => void;
  distanceUnit: 'km' | 'mi';
  setDistanceUnit: (val: 'km' | 'mi') => void;
};

export default function SettingsWorkoutPreferences({
  activityLevel,
  setActivityLevel,
  weeklyGoal,
  setWeeklyGoal,
  distanceUnit,
  setDistanceUnit,
}: SettingsWorkoutPreferencesProps) {
  return (
    <View className='mt-6 px-5'>
      <Text className='mb-2.5 text-xs font-bold tracking-wider text-neutral-400 uppercase'>
        Workout & Activity Profile
      </Text>

      <View className='gap-5 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm'>
        {/* Preferred Activity */}
        <View className='gap-2'>
          <Text className='text-xs font-semibold text-neutral-700'>
            Primary Activity Mode
          </Text>
          <View className='flex-row flex-wrap gap-2'>
            {ACTIVITY_LEVELS.map((act) => {
              const isSelected = activityLevel === act.id;
              return (
                <Pressable
                  key={act.id}
                  onPress={() => setActivityLevel(act.id)}
                  className={`flex-row items-center gap-1.5 rounded-xl border px-3.5 py-2.5 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80'
                      : 'border-neutral-200 bg-neutral-50/50'
                  }`}>
                  <Ionicons
                    name={act.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={isSelected ? '#2563eb' : '#64748b'}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-blue-700' : 'text-neutral-700'
                    }`}>
                    {act.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Weekly Distance Goal */}
        <View className='gap-2'>
          <View className='flex-row items-center justify-between'>
            <Text className='text-xs font-semibold text-neutral-700'>
              Weekly Goal ({distanceUnit})
            </Text>
            <Text className='text-xs font-bold text-blue-600'>
              {weeklyGoal} {distanceUnit} / week
            </Text>
          </View>

          {/* Preset Chips */}
          <View className='flex-row gap-2'>
            {GOAL_PRESETS.map((val) => {
              const isSelected = weeklyGoal === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => setWeeklyGoal(val)}
                  className={`flex-1 items-center justify-center rounded-xl border py-2 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-neutral-200 bg-neutral-50'
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-neutral-700'
                    }`}>
                    {val}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={weeklyGoal}
            onChangeText={setWeeklyGoal}
            keyboardType='numeric'
            placeholder='Custom distance goal'
            placeholderTextColor='#9ca3af'
            className='h-11 rounded-xl border border-neutral-300 bg-neutral-50/50 px-3.5 text-sm font-medium text-neutral-900'
          />
        </View>

        {/* Unit System */}
        <View className='gap-2'>
          <Text className='text-xs font-semibold text-neutral-700'>
            Unit Preference
          </Text>
          <View className='flex-row rounded-xl border border-neutral-200 bg-neutral-100 p-1'>
            <Pressable
              onPress={() => setDistanceUnit('km')}
              className={`flex-1 items-center justify-center rounded-lg py-2 ${
                distanceUnit === 'km' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text
                className={`text-xs font-bold ${
                  distanceUnit === 'km'
                    ? 'text-neutral-900'
                    : 'text-neutral-500'
                }`}>
                Metric (Kilometers - km)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDistanceUnit('mi')}
              className={`flex-1 items-center justify-center rounded-lg py-2 ${
                distanceUnit === 'mi' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text
                className={`text-xs font-bold ${
                  distanceUnit === 'mi'
                    ? 'text-neutral-900'
                    : 'text-neutral-500'
                }`}>
                Imperial (Miles - mi)
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

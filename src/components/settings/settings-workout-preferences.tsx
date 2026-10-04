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
      <Text className='mb-2.5 text-xs font-bold tracking-wider text-slate-500 uppercase'>
        Workout & Activity Profile
      </Text>

      <View className='gap-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs'>
        {/* Preferred Activity */}
        <View className='gap-2'>
          <Text className='text-xs font-semibold text-slate-700'>
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
                      ? 'border-indigo-600 bg-indigo-50/80'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}>
                  <Ionicons
                    name={act.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={isSelected ? '#4f46e5' : '#64748b'}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-indigo-700' : 'text-slate-700'
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
            <Text className='text-xs font-semibold text-slate-700'>
              Weekly Goal ({distanceUnit})
            </Text>
            <Text className='text-xs font-bold text-indigo-600'>
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
                      ? 'border-indigo-600 bg-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-700'
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
            placeholderTextColor='#94a3b8'
            className='h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-medium text-slate-900'
          />
        </View>

        {/* Unit System */}
        <View className='gap-2'>
          <Text className='text-xs font-semibold text-slate-700'>
            Unit Preference
          </Text>
          <View className='flex-row rounded-xl border border-slate-200 bg-slate-100 p-1'>
            <Pressable
              onPress={() => setDistanceUnit('km')}
              className={`flex-1 items-center justify-center rounded-lg py-2 ${
                distanceUnit === 'km' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text
                className={`text-xs font-bold ${
                  distanceUnit === 'km'
                    ? 'text-slate-900'
                    : 'text-slate-500'
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
                    ? 'text-slate-900'
                    : 'text-slate-500'
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

import SafeView from '@/components/safe-view';
import LoadingScreen from '@/components/loading-screen';
import { useAuth, useUser } from '@clerk/expo';
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const ACTIVITY_LEVELS = [
  { id: 'Walking', label: 'Walking', icon: 'walk-outline' },
  { id: 'Jogging', label: 'Jogging', icon: 'fitness-outline' },
  { id: 'Running', label: 'Running', icon: 'speedometer-outline' },
  { id: 'Cycling', label: 'Cycling', icon: 'bicycle-outline' },
] as const;

const GOAL_PRESETS = ['5', '10', '20', '35', '50'];

export default function Settings() {
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <LoadingScreen message='Loading settings...' />;
  }

  // Key the form component by user ID and updatedAt timestamp so initial state stays in sync
  const userKey = `${user?.id || 'guest'}-${user?.updatedAt ? new Date(user.updatedAt).getTime() : 0}`;

  return (
    <SettingsContent
      key={userKey}
      user={user}
      signOut={signOut}
    />
  );
}

type SettingsContentProps = {
  user: ReturnType<typeof useUser>['user'];
  signOut: ReturnType<typeof useAuth>['signOut'];
};

function SettingsContent({ user, signOut }: SettingsContentProps) {
  const initialMetadata = (user?.unsafeMetadata || {}) as Record<
    string,
    unknown
  >;

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State initialized from user
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(
    typeof initialMetadata.bio === 'string' ? initialMetadata.bio : ''
  );
  const [weeklyGoal, setWeeklyGoal] = useState(
    typeof initialMetadata.weeklyGoal === 'string' ||
      typeof initialMetadata.weeklyGoal === 'number'
      ? String(initialMetadata.weeklyGoal)
      : '15'
  );
  const [activityLevel, setActivityLevel] = useState(
    typeof initialMetadata.activityLevel === 'string'
      ? initialMetadata.activityLevel
      : 'Running'
  );
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>(
    initialMetadata.distanceUnit === 'mi' ? 'mi' : 'km'
  );

  const resetForm = () => {
    if (!user) return;
    const metadata = (user.unsafeMetadata || {}) as Record<string, unknown>;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setUsername(user.username || '');
    setBio(typeof metadata.bio === 'string' ? metadata.bio : '');
    setWeeklyGoal(
      typeof metadata.weeklyGoal === 'string' ||
        typeof metadata.weeklyGoal === 'number'
        ? String(metadata.weeklyGoal)
        : '15'
    );
    setActivityLevel(
      typeof metadata.activityLevel === 'string'
        ? metadata.activityLevel
        : 'Running'
    );
    setDistanceUnit(metadata.distanceUnit === 'mi' ? 'mi' : 'km');
    setErrorMessage(null);
  };

  // Check if form has unsaved modifications
  const hasChanges = useMemo(() => {
    if (!user) return false;
    const metadata = (user.unsafeMetadata || {}) as Record<string, unknown>;
    const currentBio = typeof metadata.bio === 'string' ? metadata.bio : '';
    const currentGoal =
      typeof metadata.weeklyGoal === 'string' ||
      typeof metadata.weeklyGoal === 'number'
        ? String(metadata.weeklyGoal)
        : '15';
    const currentActivity =
      typeof metadata.activityLevel === 'string'
        ? metadata.activityLevel
        : 'Running';
    const currentUnit = metadata.distanceUnit === 'mi' ? 'mi' : 'km';

    return (
      firstName.trim() !== (user.firstName || '').trim() ||
      lastName.trim() !== (user.lastName || '').trim() ||
      username.trim() !== (user.username || '').trim() ||
      bio.trim() !== currentBio.trim() ||
      weeklyGoal.trim() !== currentGoal.trim() ||
      activityLevel !== currentActivity ||
      distanceUnit !== currentUnit
    );
  }, [
    user,
    firstName,
    lastName,
    username,
    bio,
    weeklyGoal,
    activityLevel,
    distanceUnit,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    setSuccessBanner(null);
    setErrorMessage(null);
    try {
      if (user) {
        await user.reload();
      }
    } catch (error) {
      console.error('Failed to reload user:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessBanner(null);

      const updatedMetadata = {
        ...(user.unsafeMetadata || {}),
        bio: bio.trim(),
        weeklyGoal: weeklyGoal.trim() || '15',
        activityLevel,
        distanceUnit,
        updatedAt: new Date().toISOString(),
      };

      const payload: {
        firstName?: string;
        lastName?: string;
        username?: string;
        unsafeMetadata?: Record<string, unknown>;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: updatedMetadata,
      };

      // Only include username if provided
      if (username.trim()) {
        payload.username = username.trim();
      }

      await user.update(payload);

      setSuccessBanner('Personal data updated successfully in Clerk!');
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to update Clerk profile:', err);
      const clerkErr = err as {
        errors?: { message?: string; longMessage?: string }[];
        message?: string;
      };
      const msg =
        clerkErr.errors?.[0]?.longMessage ||
        clerkErr.errors?.[0]?.message ||
        clerkErr.message ||
        'Failed to update profile. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutPrompt = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await signOut();
          } catch (error) {
            console.error('Failed to log out:', error);
            setIsLoggingOut(false);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  };

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress || 'No email attached';
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    user?.fullName ||
    user?.firstName ||
    'Runner Profile';

  return (
    <SafeView className='flex-1 bg-neutral-50'>
      <StatusBar style='dark' />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className='flex-1'>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }>
          {/* Header Title */}
          <View className='px-5 pt-4 pb-2'>
            <Text className='text-3xl font-extrabold tracking-tight text-neutral-900'>
              Settings
            </Text>
            <Text className='mt-0.5 text-sm font-medium text-neutral-500'>
              Manage your personal info, fitness preferences & Clerk profile
            </Text>
          </View>

          {/* Feedback Banners */}
          {successBanner && (
            <View className='mx-5 mt-3 flex-row items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5'>
              <Ionicons
                name='checkmark-circle'
                size={20}
                color='#16a34a'
              />
              <Text className='flex-1 text-xs font-semibold text-emerald-800'>
                {successBanner}
              </Text>
            </View>
          )}

          {errorMessage && (
            <View className='mx-5 mt-3 flex-row items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5'>
              <Ionicons
                name='alert-circle'
                size={20}
                color='#dc2626'
              />
              <Text className='flex-1 text-xs font-semibold text-rose-800'>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* User Profile Overview Card */}
          <View className='mt-4 px-5'>
            <View className='rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm'>
              <View className='flex-row items-center gap-4'>
                <View className='h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-blue-50'>
                  {user?.imageUrl ? (
                    <Image
                      source={{ uri: user.imageUrl }}
                      className='h-full w-full'
                    />
                  ) : (
                    <Ionicons
                      name='person'
                      size={32}
                      color='#2563eb'
                    />
                  )}
                </View>

                <View className='flex-1'>
                  <Text
                    className='text-lg font-bold text-neutral-900'
                    numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text
                    className='text-xs font-medium text-neutral-500'
                    numberOfLines={1}>
                    {primaryEmail}
                  </Text>

                  <View className='mt-2 flex-row items-center gap-2'>
                    <View className='flex-row items-center gap-1 rounded-full border border-blue-200/60 bg-blue-50 px-2.5 py-0.5'>
                      <Ionicons
                        name='shield-checkmark'
                        size={12}
                        color='#2563eb'
                      />
                      <Text className='text-[10px] font-bold tracking-wider text-blue-700 uppercase'>
                        Clerk Auth
                      </Text>
                    </View>
                    <View className='rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5'>
                      <Text className='text-[10px] font-bold tracking-wider text-emerald-700 uppercase'>
                        {activityLevel}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Personal Information Section */}
          <View className='mt-6 px-5'>
            <View className='mb-2.5 flex-row items-center justify-between'>
              <Text className='text-xs font-bold tracking-wider text-neutral-400 uppercase'>
                Clerk Personal Information
              </Text>
              {hasChanges && (
                <Text className='text-xs font-semibold text-amber-600'>
                  • Unsaved changes
                </Text>
              )}
            </View>

            <View className='gap-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm'>
              {/* First Name & Last Name */}
              <View className='flex-row gap-3'>
                <View className='flex-1 gap-1.5'>
                  <Text className='text-xs font-semibold text-neutral-700'>
                    First Name
                  </Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder='First name'
                    placeholderTextColor='#9ca3af'
                    className='h-12 rounded-xl border border-neutral-300 bg-neutral-50/50 px-3.5 text-sm font-medium text-neutral-900'
                  />
                </View>

                <View className='flex-1 gap-1.5'>
                  <Text className='text-xs font-semibold text-neutral-700'>
                    Last Name
                  </Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder='Last name'
                    placeholderTextColor='#9ca3af'
                    className='h-12 rounded-xl border border-neutral-300 bg-neutral-50/50 px-3.5 text-sm font-medium text-neutral-900'
                  />
                </View>
              </View>

              {/* Username */}
              <View className='gap-1.5'>
                <Text className='text-xs font-semibold text-neutral-700'>
                  Username
                </Text>
                <View className='flex-row items-center rounded-xl border border-neutral-300 bg-neutral-50/50 px-3.5'>
                  <Text className='mr-1 text-sm font-semibold text-neutral-400'>
                    @
                  </Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder='username'
                    placeholderTextColor='#9ca3af'
                    autoCapitalize='none'
                    className='h-12 flex-1 text-sm font-medium text-neutral-900'
                  />
                </View>
              </View>

              {/* Bio / About */}
              <View className='gap-1.5'>
                <Text className='text-xs font-semibold text-neutral-700'>
                  Bio / Running Motto
                </Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder='e.g., Marathon enthusiast & morning jogger'
                  placeholderTextColor='#9ca3af'
                  multiline
                  numberOfLines={3}
                  className='h-20 rounded-xl border border-neutral-300 bg-neutral-50/50 p-3.5 text-sm font-medium text-neutral-900'
                  textAlignVertical='top'
                />
              </View>
            </View>
          </View>

          {/* Fitness & Workout Preferences Section */}
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

          {/* Save & Reset Actions */}
          <View className='mt-6 gap-3 px-5'>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !hasChanges}
              className={`flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3.5 shadow-sm ${
                hasChanges && !isSaving
                  ? 'bg-blue-600 active:bg-blue-700'
                  : 'bg-neutral-300 opacity-70'
              }`}>
              {isSaving ? (
                <ActivityIndicator
                  color='#ffffff'
                  size='small'
                />
              ) : (
                <>
                  <Ionicons
                    name='save-outline'
                    size={18}
                    color='#ffffff'
                  />
                  <Text className='text-sm font-bold text-white'>
                    Save Profile to Clerk
                  </Text>
                </>
              )}
            </Pressable>

            {hasChanges && (
              <Pressable
                onPress={resetForm}
                disabled={isSaving}
                className='items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 active:bg-neutral-100'>
                <Text className='text-xs font-semibold text-neutral-600'>
                  Discard Changes
                </Text>
              </Pressable>
            )}
          </View>

          {/* Account Details & Metadata Section */}
          <View className='mt-6 px-5'>
            <Text className='mb-2.5 text-xs font-bold tracking-wider text-neutral-400 uppercase'>
              Account & Security
            </Text>

            <View className='gap-3.5 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm'>
              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center gap-2.5'>
                  <Ionicons
                    name='mail-outline'
                    size={18}
                    color='#64748b'
                  />
                  <Text className='text-xs font-medium text-neutral-600'>
                    Email
                  </Text>
                </View>
                <View className='flex-row items-center gap-1.5'>
                  <Text
                    className='text-xs font-semibold text-neutral-900'
                    numberOfLines={1}>
                    {primaryEmail}
                  </Text>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color='#16a34a'
                  />
                </View>
              </View>

              <View className='h-px bg-neutral-100' />

              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center gap-2.5'>
                  <Ionicons
                    name='finger-print-outline'
                    size={18}
                    color='#64748b'
                  />
                  <Text className='text-xs font-medium text-neutral-600'>
                    Clerk User ID
                  </Text>
                </View>
                <Text
                  className='font-mono text-xs font-medium text-neutral-500'
                  numberOfLines={1}>
                  {user?.id ? `${user.id.slice(0, 14)}...` : 'N/A'}
                </Text>
              </View>

              <View className='h-px bg-neutral-100' />

              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center gap-2.5'>
                  <MaterialCommunityIcons
                    name='calendar-clock'
                    size={18}
                    color='#64748b'
                  />
                  <Text className='text-xs font-medium text-neutral-600'>
                    Joined
                  </Text>
                </View>
                <Text className='text-xs font-medium text-neutral-700'>
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recent'}
                </Text>
              </View>
            </View>
          </View>

          {/* Logout Section */}
          <View className='mt-6 px-5'>
            <Pressable
              className='flex-row items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 active:bg-rose-100 disabled:opacity-50'
              onPress={handleLogoutPrompt}
              disabled={isLoggingOut}>
              {isLoggingOut ? (
                <ActivityIndicator
                  color='#dc2626'
                  size='small'
                />
              ) : (
                <>
                  <Ionicons
                    name='log-out-outline'
                    size={20}
                    color='#dc2626'
                  />
                  <Text className='text-sm font-bold text-rose-600'>
                    Log Out of Account
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

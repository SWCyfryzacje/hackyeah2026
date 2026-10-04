import SafeView, { TAB_SCREEN_EDGES } from '@/components/safe-view';
import LoadingScreen from '@/components/loading-screen';
import {
  SettingsHeader,
  SettingsFeedbackBanner,
  SettingsProfileCard,
  SettingsPersonalInfo,
  SettingsWorkoutPreferences,
  SettingsActionButtons,
  SettingsAccountDetails,
  SettingsLogoutButton,
} from '@/components/settings';
import { useAuth, useUser } from '@clerk/expo';
import React, { useState, useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';

export default function Settings() {
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <LoadingScreen message='Wczytywanie ustawień...' />;
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
      // if (username.trim()) {
      //   payload.username = username.trim();
      // }

      await user.update(payload);

      setSuccessBanner('Dane profilu zostały pomyślnie zaktualizowane!');
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
        'Nie udało się zaktualizować profilu. Spróbuj ponownie.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutPrompt = () => {
    Alert.alert(
      'Wyloguj się',
      'Czy na pewno chcesz się wylogować ze swojego konta?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await signOut();
            } catch (error) {
              console.error('Failed to log out:', error);
              setIsLoggingOut(false);
              Alert.alert('Błąd', 'Nie udało się wylogować. Spróbuj ponownie.');
            }
          },
        },
      ]
    );
  };

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress || 'Brak przypisanego adresu email';
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    user?.fullName ||
    user?.firstName ||
    'Profil biegacza';

  return (
    <SafeView
      className='flex-1 bg-slate-50'
      edges={TAB_SCREEN_EDGES}>
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
              tintColor='#4f46e5'
            />
          }>
          {/* Header Title */}
          <SettingsHeader />

          {/* Feedback Banners */}
          <SettingsFeedbackBanner
            successMessage={successBanner}
            errorMessage={errorMessage}
          />

          {/* User Profile Overview Card */}
          <SettingsProfileCard
            imageUrl={user?.imageUrl}
            displayName={displayName}
            email={primaryEmail}
            activityLevel={activityLevel}
          />

          {/* Personal Information Section */}
          <SettingsPersonalInfo
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            username={username}
            setUsername={setUsername}
            bio={bio}
            setBio={setBio}
            hasChanges={hasChanges}
          />

          {/* Fitness & Workout Preferences Section */}
          <SettingsWorkoutPreferences
            activityLevel={activityLevel}
            setActivityLevel={setActivityLevel}
            weeklyGoal={weeklyGoal}
            setWeeklyGoal={setWeeklyGoal}
            distanceUnit={distanceUnit}
            setDistanceUnit={setDistanceUnit}
          />

          {/* Save & Reset Actions */}
          <SettingsActionButtons
            onSave={handleSave}
            onReset={resetForm}
            isSaving={isSaving}
            hasChanges={hasChanges}
          />

          {/* Account Details & Metadata Section */}
          <SettingsAccountDetails
            email={primaryEmail}
            userId={user?.id}
            joinedDate={user?.createdAt}
          />

          {/* Logout Section */}
          <SettingsLogoutButton
            onPress={handleLogoutPrompt}
            isLoggingOut={isLoggingOut}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

import { useSignUp } from '@clerk/expo';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  Field,
  GlobalErrors,
  navigateAfterAuth,
} from '@/components/auth-ui';
import SafeView from '@/components/safe-view';

export default function SignUp() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const loading = fetchStatus === 'fetching';

  const needsCode =
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0;

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) return;
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate: navigateAfterAuth });
    }
  };

  const startOver = async () => {
    await signUp.reset();
    setCode('');
  };

  return (
    <SafeView className='flex-1 bg-amber-50'>
      <ScrollView
        contentContainerClassName='gap-4 p-6'
        keyboardShouldPersistTaps='handled'>
        <Pressable onPress={() => router.back()}>
          <Text className='text-base text-blue-500'>‹ Back</Text>
        </Pressable>
        <Text className='text-3xl font-bold text-blue-500'>
          Create account
        </Text>

        {needsCode ? (
          <>
            <Text className='text-base text-gray-700'>
              We sent a verification code to {emailAddress}.
            </Text>
            <Field
              label='Code'
              value={code}
              onChangeText={setCode}
              keyboardType='number-pad'
              placeholder='123456'
              error={errors.fields.code?.message}
            />
            <GlobalErrors errors={errors.global} />
            <Button
              title='Verify'
              onPress={handleVerify}
              loading={loading}
              disabled={!code}
            />
            <Button
              title='Resend code'
              variant='secondary'
              onPress={() => signUp.verifications.sendEmailCode()}
              disabled={loading}
            />
            <Pressable onPress={startOver}>
              <Text className='text-center text-blue-500'>Start over</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Field
              label='Email'
              value={emailAddress}
              onChangeText={setEmailAddress}
              keyboardType='email-address'
              autoComplete='email'
              placeholder='you@example.com'
              error={errors.fields.emailAddress?.message}
            />
            <Field
              label='Password'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete='new-password'
              error={errors.fields.password?.message}
            />
            <GlobalErrors errors={errors.global} />
            <Button
              title='Sign up'
              onPress={handleSubmit}
              loading={loading}
              disabled={!emailAddress || !password}
            />
            <View className='flex-row justify-center gap-1'>
              <Text className='text-gray-700'>Already have an account?</Text>
              <Link
                href='/sign-in'
                replace>
                <Text className='font-semibold text-blue-500'>Sign in</Text>
              </Link>
            </View>
          </>
        )}

        {/* Required mount point for Clerk bot protection (captcha). */}
        <View nativeID='clerk-captcha' />
      </ScrollView>
    </SafeView>
  );
}

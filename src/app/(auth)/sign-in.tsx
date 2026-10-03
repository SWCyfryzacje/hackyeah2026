import { useSignIn } from '@clerk/expo';
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

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const loading = fetchStatus === 'fetching';

  const handleSubmit = async () => {
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;

    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: navigateAfterAuth });
    } else if (
      signIn.status === 'needs_second_factor' ||
      signIn.status === 'needs_client_trust'
    ) {
      // New device / 2FA: verify with a code sent to the user's email.
      const emailFactor = signIn.supportedSecondFactors?.find(
        (f) => f.strategy === 'email_code'
      );
      if (emailFactor) {
        await signIn.mfa.sendEmailCode();
        setNeedsCode(true);
      }
    }
  };

  const handleVerify = async () => {
    const { error } = await signIn.mfa.verifyEmailCode({ code });
    if (error) return;
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: navigateAfterAuth });
    }
  };

  const startOver = async () => {
    await signIn.reset();
    setNeedsCode(false);
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
        <Text className='text-3xl font-bold text-blue-500'>Sign in</Text>

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
              onPress={() => signIn.mfa.sendEmailCode()}
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
              error={errors.fields.identifier?.message}
            />
            <Field
              label='Password'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete='password'
              error={errors.fields.password?.message}
            />
            <GlobalErrors errors={errors.global} />
            <Button
              title='Sign in'
              onPress={handleSubmit}
              loading={loading}
              disabled={!emailAddress || !password}
            />
            <View className='flex-row justify-center gap-1'>
              <Text className='text-gray-700'>No account?</Text>
              <Link
                href='/sign-up'
                replace>
                <Text className='font-semibold text-blue-500'>Sign up</Text>
              </Link>
            </View>
          </>
        )}
      </ScrollView>
    </SafeView>
  );
}

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Href, Link, router } from 'expo-router';
import SafeView from '@/components/safe-view';
import { useForm } from 'react-hook-form';
import {
  SignFormData,
  SignFormSchema,
  VerifyCodeData,
  VerifyCodeSchema,
} from '@/types/zod-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, useSignUp } from '@clerk/expo';
import SignVerify from '@/components/sign-verify';
import { useEffect, useState } from 'react';
import SignForm from '@/components/sign-form';
import LoadingScreen from '@/components/loading-screen';

export default function SignUp() {
  const form = useForm<SignFormData>({ resolver: zodResolver(SignFormSchema) });

  const { signUp, errors, fetchStatus } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();

  const [processedErrors, setProcessedErrors] =
    useState<ProcessedErrors | null>(null);

  const onSubmit = async (data: SignFormData) => {
    const validation = SignFormSchema.safeParse(data);
    if (!validation.success) {
      return;
    }

    const { error } = await signUp.password({
      emailAddress: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
    }

    if (!error) {
      await signUp.verifications.sendEmailCode();
    }
  };

  const onVerify = async (data: VerifyCodeData) => {
    const validation = VerifyCodeSchema.safeParse(data);
    if (!validation.success) {
      return;
    }

    await signUp.verifications.verifyEmailCode({
      code: validation.data.code,
    });

    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }

          const url = decorateUrl('/(tabs)');
          router.replace(url as Href);
        },
      });
    } else {
      console.error('Sign-up attempt not complete:', signUp);
    }
  };

  useEffect(() => {
    Object.entries(errors.fields).forEach(([key, value]) => {
      setProcessedErrors((prevErrors) => ({
        ...prevErrors,
        [key]: value?.message,
      }));
    });
  }, [errors]);

  const handleCodeResend = () => signUp.verifications.sendEmailCode();

  if (!isLoaded || signUp.status === 'complete' || isSignedIn) {
    return <LoadingScreen />;
  }

  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  )
    return (
      <SignVerify
        errors={processedErrors}
        fetchStatus={fetchStatus}
        email={form.getValues().email}
        onVerify={onVerify}
        codeResend={handleCodeResend}
      />
    );

  return (
    <SafeView className='flex-1 bg-amber-50'>
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className='flex-1'
          contentContainerClassName='flex-grow justify-center px-6 py-8'
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}>
          <View className='mx-auto w-full max-w-md gap-6'>
            <View className='items-center gap-2'>
              <Text className='text-center text-3xl font-bold text-neutral-900'>
                Create your Account
              </Text>
              <Text className='text-center text-sm text-neutral-600'>
                Sign up to start
              </Text>
            </View>

            <SignForm
              form={form}
              onSubmit={form.handleSubmit(onSubmit)}
              fetchStatus={fetchStatus}
              errors={processedErrors}
              zodErrors={form.formState.errors}
              type='sign-up'
            />

            <View className='flex-row items-center justify-center gap-1.5'>
              <Text className='text-sm text-neutral-600'>
                Already have an account?
              </Text>
              <Link
                href='/(auth)/sign-in'
                asChild>
                <Pressable>
                  <Text className='text-sm font-semibold text-blue-600'>
                    Sign In
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

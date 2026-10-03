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
import { useAuth, useSignIn } from '@clerk/expo';
import SignVerify from '@/components/sign-verify';
import { useEffect, useState } from 'react';
import SignForm from '@/components/sign-form';
import LoadingScreen from '@/components/loading-screen';

export default function SignIn() {
  const form = useForm<SignFormData>({ resolver: zodResolver(SignFormSchema) });

  const { signIn, errors, fetchStatus } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();

  const [processedErrors, setProcessedErrors] =
    useState<ProcessedErrors | null>(null);

  const onSubmit = async (data: SignFormData) => {
    const validation = SignFormSchema.safeParse(data);
    if (!validation.success) {
      return;
    }

    const { error } = await signIn.password({
      emailAddress: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }

          const url = decorateUrl('/(tabs)');
          router.replace(url as Href);
        },
      });
    } else if (signIn.status === 'needs_client_trust') {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === 'email_code'
      );

      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    } else {
      console.error('Sign-in attempt not complete:', signIn);
    }
  };

  const onVerify = async (data: VerifyCodeData) => {
    const validation = VerifyCodeSchema.safeParse(data);
    if (!validation.success) {
      return;
    }

    await signIn.mfa.verifyEmailCode({ code: validation.data.code });

    if (signIn.status === 'complete') {
      await signIn.finalize({
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
      console.error('Sign-in attempt not complete:', signIn);
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

  const handleCodeResend = () => signIn.mfa.sendEmailCode();

  if (!isLoaded || signIn.status === 'complete' || isSignedIn) {
    return <LoadingScreen />;
  }

  if (signIn.status === 'needs_client_trust')
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
                Welcome back
              </Text>
              <Text className='text-center text-sm text-neutral-600'>
                Sign in to continue
              </Text>
            </View>

            <SignForm
              form={form}
              onSubmit={form.handleSubmit(onSubmit)}
              fetchStatus={fetchStatus}
              errors={processedErrors}
              zodErrors={form.formState.errors}
              type='sign-in'
            />

            <View className='flex-row items-center justify-center gap-1.5'>
              <Text className='text-sm text-neutral-600'>
                {"Don't have an account?"}
              </Text>
              <Link
                href='/(auth)/sign-up'
                asChild>
                <Pressable>
                  <Text className='text-sm font-semibold text-blue-600'>
                    Create Account
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

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RouteLoadingOverlayProps = {
  loading: boolean;
  hasRoute: boolean;
  loadingMessage?: string;
  successMessage?: string;
};

export default function RouteLoadingOverlay({
  loading,
  hasRoute,
  loadingMessage = 'Generowanie Twojej trasy...',
  successMessage = 'Trasa wygenerowana!',
}: RouteLoadingOverlayProps) {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.85));
  const [successScaleAnim] = useState(() => new Animated.Value(0));

  const [prevLoading, setPrevLoading] = useState(loading);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(!loading);

  if (loading !== prevLoading) {
    setPrevLoading(loading);
    if (loading) {
      setIsDismissed(false);
      setIsSuccess(false);
    } else if (hasRoute) {
      setIsSuccess(true);
    }
  }

  useEffect(() => {
    let currentAnim: Animated.CompositeAnimation | null = null;

    if (loading) {
      successScaleAnim.setValue(0);
      currentAnim = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]);
      currentAnim.start();
    } else if (isSuccess) {
      // Sequence: 1) Play pop-in spring to completion, 2) Hold, 3) Gently fade out
      currentAnim = Animated.sequence([
        Animated.spring(successScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]);

      currentAnim.start(({ finished }) => {
        if (finished) {
          setIsDismissed(true);
        }
      });
    } else {
      currentAnim = Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
      currentAnim.start(({ finished }) => {
        if (finished) {
          setIsDismissed(true);
        }
      });
    }

    return () => {
      currentAnim?.stop();
    };
  }, [loading, isSuccess, fadeAnim, scaleAnim, successScaleAnim]);

  if (isDismissed && !loading) return null;

  return (
    <Animated.View
      pointerEvents={isSuccess ? 'none' : 'auto'}
      style={{ opacity: fadeAnim }}
      className='absolute inset-0 z-50 items-center justify-center bg-black/55 px-6'>
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className='items-center justify-center rounded-3xl bg-neutral-900/90 px-8 py-6 shadow-2xl backdrop-blur-md'>
        {isSuccess ? (
          <Animated.View
            style={{ transform: [{ scale: successScaleAnim }] }}
            className='items-center justify-center'>
            <View className='size-14 items-center justify-center rounded-full bg-green-500/20'>
              <Ionicons
                name='checkmark-circle'
                size={44}
                color='#22c55e'
              />
            </View>
            <Text className='mt-3 text-center text-lg font-bold text-white'>
              {successMessage}
            </Text>
            <Text className='mt-1 text-center text-xs font-medium text-green-400'>
              Gotowy do odkrywania!
            </Text>
          </Animated.View>
        ) : (
          <View className='items-center justify-center'>
            <ActivityIndicator
              size='large'
              color='#ffffff'
              className='my-1'
            />
            <Text className='mt-3 text-center text-base font-semibold text-white'>
              {loadingMessage}
            </Text>
            <Text className='mt-1 text-center text-xs font-medium text-neutral-400'>
              Wyszukiwanie optymalnej trasy i zabytków...
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

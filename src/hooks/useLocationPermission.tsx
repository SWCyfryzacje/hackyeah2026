import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

export { default as LocationModal } from '@/components/location-modal';

export type UseLocationPermissionOptions = {
  autoRequest?: boolean;
};

export default function useLocationPermission({
  autoRequest = true,
}: UseLocationPermissionOptions = {}) {
  const [visibility, setVisibility] = useState(false);
  const [granted, setGranted] = useState(false);

  const onAllow = useCallback(async () => {
    setVisibility(false);

    const { status, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') setGranted(true);
    else if (!canAskAgain) await Linking.openSettings();
  }, []);

  const onLater = useCallback(() => {
    setVisibility(false);
  }, []);

  const showModal = useCallback(() => setVisibility(true), []);
  const hideModal = useCallback(() => setVisibility(false), []);
  const grantPermission = useCallback(() => setGranted(true), []);

  useEffect(() => {
    if (!autoRequest) return;

    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status === 'granted') {
          setGranted(true);
        } else {
          setVisibility(true);
        }
      } catch (e) {
        console.warn('Permission request error:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoRequest]);

  return {
    granted,
    visibility,
    showModal,
    hideModal,
    grantPermission,
    onAllow,
    onLater,
  };
}

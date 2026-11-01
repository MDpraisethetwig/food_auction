import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { DemoProvider, useDemo } from '../demo';
import { colors } from '../theme';
import { ToastHost } from '../ui';

const noAnimation = { animation: 'none' } as const;

// Tapping an alert always lands on the listing as a customer, even mid-demo in the kitchen view.
function AlertRouter() {
  const { setRole } = useDemo();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const listingId = response.notification.request.content.data?.listingId;
      if (typeof listingId !== 'string') return;
      setRole('customer');
      router.replace('/');
      router.push(`/listing/${listingId}`);
    });
    return () => subscription.remove();
  }, [setRole]);

  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  if (!loaded) return null;

  return (
    <DemoProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" options={noAnimation} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="kitchen" options={noAnimation} />
        <Stack.Screen name="orders" options={noAnimation} />
        <Stack.Screen name="impact" options={noAnimation} />
        <Stack.Screen name="profile" options={noAnimation} />
        <Stack.Screen name="preferences" options={{ animation: 'fade' }} />
        <Stack.Screen name="assistant" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="new-listing" options={{ presentation: 'modal' }} />
      </Stack>
      <AlertRouter />
      <ToastHost />
    </DemoProvider>
  );
}

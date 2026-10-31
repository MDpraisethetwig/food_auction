import { formatMoney } from '@food-auction/shared';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { SessionProvider, useSession } from '../session';
import { colors } from '../ui';

function Navigator() {
  const { subscribe } = useSession();

  useEffect(() => subscribe((event) => {
    if (event.type === 'bid.outbid') {
      Alert.alert('You were outbid', event.title, [
        { text: 'Later' },
        { text: 'Bid again', onPress: () => router.push(`/listing/${event.listingId}`) },
      ]);
    } else if (event.type === 'auction.won') {
      Alert.alert('You won!', `${event.title} for ${formatMoney(event.amountCents)}. Pick it up soon.`, [
        { text: 'View order', onPress: () => router.push('/orders') },
      ]);
    } else if (event.type === 'payment.failed') {
      Alert.alert('Payment failed', `Your card was declined for ${event.title}.`);
    }
  }), [subscribe]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'LastCall' }} />
      <Stack.Screen name="login" options={{ title: 'Sign in' }} />
      <Stack.Screen name="listing/[id]" options={{ title: 'Auction' }} />
      <Stack.Screen name="new-listing" options={{ title: 'New listing' }} />
      <Stack.Screen name="orders" options={{ title: 'My orders' }} />
      <Stack.Screen name="card" options={{ title: 'Payment card' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan pickup code' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Navigator />
    </SessionProvider>
  );
}

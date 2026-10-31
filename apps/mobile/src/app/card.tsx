import type { User } from '@food-auction/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { get, post } from '../api';
import { useSession } from '../session';
import { Button, colors } from '../ui';

interface AppConfig {
  paymentsMode: 'stripe' | 'mock';
  stripePublishableKey: string;
}

interface CardSetup {
  customerId: string;
  setupIntentClientSecret: string;
  ephemeralKey: string;
}

export default function CardScreen() {
  const { user, setUser } = useSession();
  const [busy, setBusy] = useState(false);

  async function saveCard(declined = false) {
    setBusy(true);
    try {
      const config = await get<AppConfig>('/config');
      if (config.paymentsMode === 'stripe') {
        const setup = await post<CardSetup>('/me/card/setup');
        // Loaded here so the offline demo card still works if Stripe's native module is missing.
        const stripe = await import('@stripe/stripe-react-native');
        await stripe.initStripe({ publishableKey: config.stripePublishableKey });
        const init = await stripe.initPaymentSheet({
          merchantDisplayName: 'LastCall',
          customerId: setup.customerId,
          customerEphemeralKeySecret: setup.ephemeralKey,
          setupIntentClientSecret: setup.setupIntentClientSecret,
        });
        if (init.error) throw new Error(init.error.message);
        const sheet = await stripe.presentPaymentSheet();
        if (sheet.error) {
          if (sheet.error.code !== 'Canceled') throw new Error(sheet.error.message);
          return;
        }
      }
      setUser(await post<User>('/me/card/confirm', { declined }));
      router.back();
    } catch (failure) {
      Alert.alert('Could not save card', (failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.text}>
        {user?.cardLast4 ? `Saved card ending in ${user.cardLast4}` : 'No card saved yet.'}
      </Text>
      <Text style={styles.muted}>Test mode only. No real money moves.</Text>
      <Button label={user?.cardLast4 ? 'Replace card' : 'Add test card'} busy={busy} onPress={() => saveCard()} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  text: { fontSize: 18, color: colors.ink },
  muted: { color: colors.muted },
});

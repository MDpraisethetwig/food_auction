import { formatMoney, type Order } from '@food-auction/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { get } from '../api';
import { timeLeft, useNow, useSession } from '../session';
import { Button, Card, colors } from '../ui';

const statusText: Record<Order['status'], string> = {
  awaiting_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  no_show: 'Missed pickup',
  payment_failed: 'Payment failed',
};

export default function Orders() {
  const { subscribe } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const now = useNow();

  const load = useCallback(async () => {
    setOrders(await get<Order[]>('/orders'));
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribe(() => void load()), [subscribe, load]);

  return (
    <FlatList
      contentContainerStyle={styles.page}
      data={orders}
      keyExtractor={(order) => order.id}
      ListEmptyComponent={<Text style={styles.muted}>No orders yet.</Text>}
      renderItem={({ item }) => (
        <Card>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.muted}>{item.restaurantName}</Text>
          <View style={styles.row}>
            <Text style={styles.amount}>{formatMoney(item.amountCents)}</Text>
            <Text style={styles.status}>{statusText[item.status]}</Text>
          </View>
          {item.refundedCents > 0 && (
            <Text style={styles.muted}>Refunded {formatMoney(item.refundedCents)}: the item was resold.</Text>
          )}
          {item.status === 'awaiting_pickup' && item.pickupDeadline && (
            <>
              <Text style={styles.deadline}>Pick up within {timeLeft(item.pickupDeadline, now)}</Text>
              <Button label="Scan pickup code" onPress={() => router.push('/scan')} />
            </>
          )}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  page: { padding: 16 },
  title: { fontSize: 17, fontWeight: '600', color: colors.ink },
  muted: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  amount: { fontSize: 18, fontWeight: '700', color: colors.ink },
  status: { color: colors.accent, fontWeight: '600' },
  deadline: { color: colors.warn, fontWeight: '600', marginBottom: 10 },
});

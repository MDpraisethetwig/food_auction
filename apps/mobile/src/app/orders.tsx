import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '@food-auction/shared';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type DemoOrder, timeLeft, useDemo, useNow } from '../demo';
import { colors, radius, softShadow, space, tabBarClearance, type } from '../theme';
import { Button, Eyebrow, Section, TabBar, Tag } from '../ui';

function PickupTicket({ order, now }: { order: DemoOrder; now: number }) {
  return (
    <View style={styles.ticket}>
      <Image source={order.image} style={styles.ticketPhoto} />
      <View style={styles.ticketBody}>
        <View style={styles.ticketHeader}>
          <Tag label="Ready for pickup" />
          <Text style={styles.ticketPrice}>{formatMoney(order.amountCents)}</Text>
        </View>
        <Text style={styles.ticketTitle}>{order.title}</Text>
        <Text style={styles.ticketPlace}>{order.restaurant}</Text>
        <View style={styles.deadline}>
          <Ionicons name="time" size={18} color={colors.clay} />
          <Text style={styles.deadlineText}>Pick up within {timeLeft(order.pickupBy ?? now, now)}</Text>
        </View>
        <Button
          icon="qr-code"
          label="Scan counter code"
          onPress={() => router.push({ pathname: '/scan', params: { id: order.id } })}
        />
      </View>
    </View>
  );
}

function PastOrder({ order }: { order: DemoOrder }) {
  return (
    <View style={styles.past}>
      <Image source={order.image} style={styles.pastPhoto} />
      <View style={styles.pastBody}>
        <Text style={styles.pastTitle} numberOfLines={1}>{order.title}</Text>
        <Text style={styles.pastMeta} numberOfLines={1}>{order.restaurant} · {order.when}</Text>
      </View>
      <View style={styles.pastRight}>
        <Text style={styles.pastPrice}>{formatMoney(order.amountCents)}</Text>
        <Text style={styles.pastSaved}>{order.kgSaved} kg saved</Text>
      </View>
    </View>
  );
}

export default function Orders() {
  const { orders } = useDemo();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const ready = orders.filter((order) => order.status === 'ready');
  const past = orders.filter((order) => order.status === 'picked_up');

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + space.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow>Your rescues</Eyebrow>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.tickets}>
          {ready.map((order) => <PickupTicket key={order.id} order={order} now={now} />)}
          {ready.length === 0 && (
            <Text style={styles.empty}>Nothing waiting for pickup. Win an auction and it lands here.</Text>
          )}
        </View>
        <Section title="Picked up">
          <View style={styles.pastList}>
            {past.map((order) => <PastOrder key={order.id} order={order} />)}
          </View>
        </Section>
      </ScrollView>
      <TabBar active="orders" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: space.xl, paddingBottom: tabBarClearance },
  title: { ...type.h1, fontSize: 30, lineHeight: 37, color: colors.ink, marginTop: space.xs },
  tickets: { marginTop: space.lg, gap: space.lg },
  ticket: {
    ...softShadow,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ticketPhoto: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  ticketBody: { padding: space.lg },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketPrice: { ...type.price, color: colors.forest },
  ticketTitle: { ...type.h2, color: colors.ink, marginTop: space.md },
  ticketPlace: { ...type.body, color: colors.muted },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginVertical: space.md,
    backgroundColor: colors.clayTint,
    borderRadius: radius.sm,
    padding: space.md,
  },
  deadlineText: { ...type.timer, fontSize: 15, color: colors.clay },
  empty: { ...type.body, color: colors.muted },
  pastList: { gap: space.sm },
  past: {
    ...softShadow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.sm,
  },
  pastPhoto: { width: 52, height: 52, borderRadius: radius.sm },
  pastBody: { flex: 1 },
  pastTitle: { ...type.h3, fontSize: 15, color: colors.ink },
  pastMeta: { ...type.small, color: colors.muted },
  pastRight: { alignItems: 'flex-end', paddingRight: space.xs },
  pastPrice: { ...type.h3, fontSize: 15, color: colors.ink },
  pastSaved: { ...type.small, color: colors.forest },
});

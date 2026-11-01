import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '@food-auction/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentPrice, RESTAURANT, timeLeft, useDemo, useNow } from '../demo';
import { colors, radius, softShadow, space, tabBarClearance, type } from '../theme';
import { Button, Card, Eyebrow, Section, TabBar, Tag, TimerBadge } from '../ui';

const recentSales = [
  { title: 'Margherita pizza', amountCents: 850, status: 'Picked up' },
  { title: 'Garlic knots', amountCents: 400, status: 'Awaiting pickup' },
  { title: 'Caesar salad', amountCents: 550, status: 'Picked up' },
];

export default function Kitchen() {
  const { listings } = useDemo();
  const [reviewed, setReviewed] = useState(false);
  const insets = useSafeAreaInsets();
  const now = useNow();
  const mine = listings.filter((listing) => listing.restaurant === RESTAURANT && !listing.settled);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + space.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow>Tonight's kitchen</Eyebrow>
        <Text style={styles.title}>{RESTAURANT}</Text>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Recovered today</Text>
          <Text style={styles.heroValue}>$86.50</Text>
          <Text style={styles.heroNote}>14 meals sold instead of binned</Text>
        </View>

        <Button
          icon="camera"
          label="List tonight's surplus"
          onPress={() => router.push('/new-listing')}
          style={styles.cta}
          variant="sun"
        />

        {!reviewed && (
          <Section title="Needs you">
            <Card style={styles.review}>
              <View style={styles.reviewHeader}>
                <Ionicons name="alert-circle" size={20} color={colors.clay} />
                <Text style={styles.reviewTitle}>Missed pickup: Veggie calzone</Text>
              </View>
              <Text style={styles.reviewBody}>Is this food still safe to sell?</Text>
              <View style={styles.reviewActions}>
                <Button label="Re-auction" onPress={() => setReviewed(true)} style={styles.flex} />
                <Button label="Discard" onPress={() => setReviewed(true)} style={styles.flex} variant="secondary" />
              </View>
            </Card>
          </Section>
        )}

        <Section title="Live auctions">
          <View style={styles.list}>
            {mine.map((listing) => (
              <View key={listing.id} style={styles.row}>
                <Image source={listing.image} style={styles.photo} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{listing.title}</Text>
                  <Text style={styles.rowMeta}>{listing.bidCount} bids</Text>
                  <TimerBadge label={timeLeft(listing.endsAt, now)} />
                </View>
                <Text style={styles.price}>{formatMoney(currentPrice(listing))}</Text>
              </View>
            ))}
            {mine.length === 0 && <Text style={styles.rowMeta}>Nothing live. List something above.</Text>}
          </View>
        </Section>

        <Section title="Recent sales">
          <View style={styles.list}>
            {recentSales.map((sale) => (
              <View key={sale.title} style={styles.sale}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{sale.title}</Text>
                  <View style={styles.saleTag}>
                    <Tag label={sale.status} tone={sale.status === 'Picked up' ? 'forest' : 'sun'} />
                  </View>
                </View>
                <Text style={styles.price}>{formatMoney(sale.amountCents)}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
      <TabBar active="kitchen" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: space.xl, paddingBottom: tabBarClearance },
  title: { ...type.h1, color: colors.ink, marginTop: space.xs },
  hero: {
    backgroundColor: colors.forest,
    borderRadius: radius.lg,
    padding: space.xl,
    marginTop: space.lg,
  },
  heroLabel: { ...type.label, color: colors.sprout },
  heroValue: { ...type.price, fontSize: 52, lineHeight: 60, color: colors.sun, marginTop: space.xs },
  heroNote: { ...type.body, color: colors.paper },
  cta: { marginTop: space.md },
  review: { borderColor: colors.clay },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reviewTitle: { ...type.h3, color: colors.ink, flex: 1 },
  reviewBody: { ...type.body, color: colors.muted, marginTop: space.xs },
  reviewActions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  list: { gap: space.sm },
  row: {
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
  photo: { width: 56, height: 56, borderRadius: radius.sm },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...type.h3, fontSize: 15, color: colors.ink },
  rowMeta: { ...type.small, color: colors.muted },
  price: { ...type.price, fontSize: 18, color: colors.forest, paddingRight: space.xs },
  sale: {
    ...softShadow,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
  },
  saleTag: { marginTop: space.xs },
});

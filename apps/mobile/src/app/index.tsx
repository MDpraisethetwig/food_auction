import { formatMoney } from '@food-auction/shared';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CATEGORIES,
  currentPrice,
  type DemoListing,
  percentOff,
  timeLeft,
  useDemo,
  useNow,
} from '../demo';
import { ListingRow } from '../listing-row';
import { colors, fonts, radius, softShadow, space, tabBarClearance, type } from '../theme';
import { Chip, Eyebrow, Section, TabBar, Tag, TimerBadge } from '../ui';

const open = (listing: DemoListing) => router.push(`/listing/${listing.id}`);

function SpotlightCard({ listing, now }: { listing: DemoListing; now: number }) {
  return (
    <Pressable onPress={() => open(listing)} style={styles.spotlight}>
      <Image source={listing.image} style={styles.spotlightPhoto} />
      <View style={styles.spotlightTop}>
        <TimerBadge label={`${timeLeft(listing.endsAt, now)} left`} large />
        <Tag label={`${percentOff(listing)}% off`} tone="sun" />
      </View>
      <View style={styles.spotlightBody}>
        <Text style={styles.spotlightTitle} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.spotlightPlace} numberOfLines={1}>{listing.restaurant}</Text>
        <Text style={styles.spotlightPrice}>{formatMoney(currentPrice(listing))}</Text>
      </View>
    </Pressable>
  );
}

export default function Discover() {
  const { role, listings, impact } = useDemo();
  const [category, setCategory] = useState('All');
  const insets = useSafeAreaInsets();
  const now = useNow();

  if (role === null) return <Redirect href="/login" />;
  if (role === 'restaurant') return <Redirect href="/kitchen" />;

  const live = listings
    .filter((listing) => !listing.settled)
    .sort((a, b) => a.endsAt - b.endsAt);
  const nearby = live.filter((listing) => category === 'All' || listing.category === category);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + space.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.padded}>
          <View style={styles.header}>
            <View>
              <Eyebrow>Pickup near</Eyebrow>
              <View style={styles.location}>
                <Ionicons name="location" size={16} color={colors.forest} />
                <Text style={styles.locationText}>Westdale, Hamilton</Text>
              </View>
            </View>
            <Pressable onPress={() => router.replace('/impact')} style={styles.impactPill}>
              <Ionicons name="leaf" size={14} color={colors.forest} />
              <Text style={styles.impactPillText}>{impact.meals} meals</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>Rescue something good tonight.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/assistant')}
            style={styles.ask}
          >
            <Ionicons name="sparkles" size={18} color={colors.forest} />
            <Text style={styles.askText}>Tell us what you're craving</Text>
            <Ionicons name="mic" size={18} color={colors.forest} />
          </Pressable>
        </View>

        <Section title="Closing soon">
          <ScrollView
            contentContainerStyle={styles.carousel}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
          >
            {live.slice(0, 3).map((listing) => <SpotlightCard key={listing.id} listing={listing} now={now} />)}
          </ScrollView>
        </Section>

        <Section title="Near you">
          <ScrollView
            contentContainerStyle={styles.carousel}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
          >
            {CATEGORIES.map((item) => (
              <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
            ))}
          </ScrollView>
          <View style={styles.list}>
            {nearby.map((listing) => <ListingRow key={listing.id} listing={listing} now={now} />)}
            {nearby.length === 0 && <Text style={styles.empty}>Nothing here right now. Try another category.</Text>}
          </View>
        </Section>
      </ScrollView>
      <TabBar active="discover" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingBottom: tabBarClearance, paddingHorizontal: space.xl },
  padded: {},
  bleed: { marginHorizontal: -space.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  location: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 },
  locationText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  impactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.sprout,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  impactPillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.forest },
  title: { ...type.h1, fontSize: 30, lineHeight: 37, color: colors.ink, marginTop: space.xl },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.field,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    minHeight: 52,
    marginTop: space.lg,
  },
  askText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  carousel: { paddingHorizontal: space.xl, gap: space.md, paddingBottom: space.xs },
  spotlight: {
    ...softShadow,
    width: 256,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  spotlightPhoto: {
    width: '100%',
    height: 168,
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  spotlightTop: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotlightBody: { padding: space.lg },
  spotlightTitle: { ...type.h3, fontSize: 17, lineHeight: 24, minHeight: 48, color: colors.ink },
  spotlightPlace: { ...type.small, color: colors.muted, marginTop: 2 },
  spotlightPrice: { ...type.price, fontSize: 24, lineHeight: 31, color: colors.forest, marginTop: space.xs },
  list: { marginTop: space.md, gap: space.md },
  empty: { ...type.body, color: colors.muted },
});

import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '@food-auction/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CO2_PER_KG, currentPrice, nextBid, percentOff, timeLeft, useDemo, useNow } from '../../demo';
import { colors, fonts, radius, shadow, space, type } from '../../theme';
import { Button, CircleButton, Eyebrow, Tag, TimerBadge } from '../../ui';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { listings, role, placeBid, buyNow } = useDemo();
  const insets = useSafeAreaInsets();
  const now = useNow();

  const listing = listings.find((item) => item.id === id);
  if (!listing) return null;

  const live = !listing.settled && listing.endsAt > now;
  const customer = role === 'customer';
  const bid = nextBid(listing);
  const label = listing.bidCents === null ? 'Starting bid' : 'Current bid';

  function buy() {
    buyNow(listing!.id);
    router.replace('/orders');
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Image source={listing.image} style={[styles.photo, { marginTop: insets.top }]} />
        <View style={styles.sheet}>
          <View style={styles.tags}>
            <Tag
              label={listing.source === 'cancelled' ? 'Cancelled order' : 'Unsold today'}
              tone={listing.source === 'cancelled' ? 'clay' : 'sun'}
            />
            <Tag label={`${percentOff(listing)}% off`} icon="pricetag" />
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.place}>{listing.restaurant} · {listing.distanceKm} km away</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <View style={styles.auction}>
            <View>
              <Text style={styles.auctionLabel}>{label}</Text>
              <Text style={styles.auctionPrice}>{formatMoney(currentPrice(listing))}</Text>
              <Text style={styles.auctionRetail}>Usually {formatMoney(listing.retailCents)}</Text>
            </View>
            <View style={styles.auctionRight}>
              <Text style={styles.auctionLabel}>{live ? 'Ends in' : 'Auction'}</Text>
              <Text style={styles.auctionTimer}>{live ? timeLeft(listing.endsAt, now) : 'Ended'}</Text>
              <Text style={styles.auctionRetail}>{listing.bidCount} bids</Text>
            </View>
          </View>
          {listing.winning && live && (
            <View style={styles.winning}>
              <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
              <Text style={styles.winningText}>You're the highest bidder</Text>
            </View>
          )}

          <View style={styles.block}>
            <Eyebrow>Allergens, confirmed by staff</Eyebrow>
            <View style={styles.allergens}>
              {listing.allergens.map((item) => <Tag key={item} label={item} tone="sun" />)}
            </View>
          </View>

          <View style={styles.impact}>
            <Ionicons name="leaf" size={20} color={colors.forest} />
            <Text style={styles.impactText}>
              Rescuing this keeps about {listing.kgSaved} kg of food out of the bin and avoids roughly{' '}
              {(listing.kgSaved * CO2_PER_KG).toFixed(1)} kg of CO₂e.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.overlay, { top: insets.top + space.sm }]}>
        <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        {live && <TimerBadge label={`${timeLeft(listing.endsAt, now)} left`} large />}
      </View>

      {live && customer && (
        <View style={[styles.bar, shadow, { paddingBottom: insets.bottom + space.sm }]}>
          {listing.buyNowCents !== null && (
            <Button
              label={`Buy ${formatMoney(listing.buyNowCents)}`}
              onPress={buy}
              style={styles.barButton}
              variant="secondary"
            />
          )}
          <Button
            disabled={listing.winning}
            label={listing.winning ? 'Winning' : `Bid ${formatMoney(bid)}`}
            onPress={() => placeBid(listing.id, bid)}
            style={styles.barButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 130 },
  photo: { width: '100%', height: 340 },
  sheet: {
    marginTop: -28,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  tags: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  title: { ...type.h1, color: colors.ink },
  place: { ...type.body, color: colors.muted, marginTop: space.xs },
  description: { ...type.body, color: colors.ink, marginTop: space.md },
  auction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.forest,
    borderRadius: radius.lg,
    padding: space.lg + 4,
    marginTop: space.xl,
  },
  auctionRight: { alignItems: 'flex-end' },
  auctionLabel: { ...type.label, color: colors.sprout },
  auctionPrice: { ...type.price, fontSize: 36, lineHeight: 44, color: colors.paper, marginTop: space.xs },
  auctionTimer: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 44,
    color: colors.sun,
    marginTop: space.xs,
    fontVariant: ['tabular-nums'],
  },
  auctionRetail: { ...type.small, color: colors.sprout },
  winning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.sprout,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },
  winningText: { ...type.h3, color: colors.forest },
  block: { marginTop: space.xl },
  allergens: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  impact: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.lg,
    marginTop: space.xl,
  },
  impactText: { ...type.small, color: colors.ink, flex: 1 },
  overlay: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  barButton: { flex: 1, paddingHorizontal: space.md },
});

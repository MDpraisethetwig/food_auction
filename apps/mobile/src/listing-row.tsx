import { formatMoney } from '@food-auction/shared';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { currentPrice, type DemoListing, timeLeft } from './demo';
import { colors, radius, softShadow, space, type } from './theme';
import { TimerBadge } from './ui';

export function ListingRow({ listing, now, showAllergens }: {
  listing: DemoListing;
  now: number;
  showAllergens?: boolean;
}) {
  return (
    <Pressable onPress={() => router.push(`/listing/${listing.id}`)} style={styles.row}>
      <View>
        <Image source={listing.image} style={styles.photo} />
        <View style={styles.badge}>
          <TimerBadge label={timeLeft(listing.endsAt, now)} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{listing.restaurant} · {listing.distanceKm} km</Text>
        {showAllergens && (
          <Text style={styles.allergens} numberOfLines={1}>Contains {listing.allergens.join(', ')}</Text>
        )}
        <View style={styles.prices}>
          <Text style={styles.price}>{formatMoney(currentPrice(listing))}</Text>
          <Text style={styles.retail}>{formatMoney(listing.retailCents)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...softShadow,
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.sm,
  },
  photo: { width: 104, height: 112, borderRadius: radius.md },
  badge: { position: 'absolute', top: 6, left: 6 },
  body: { flex: 1, paddingVertical: space.xs, paddingRight: space.sm, justifyContent: 'space-between' },
  title: { ...type.h3, color: colors.ink },
  meta: { ...type.small, color: colors.muted },
  allergens: { ...type.small, color: colors.clay },
  prices: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { ...type.price, fontSize: 20, color: colors.forest },
  retail: { ...type.small, color: colors.muted, textDecorationLine: 'line-through' },
});

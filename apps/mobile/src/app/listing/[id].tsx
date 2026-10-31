import { buyNowAvailable, formatMoney, type Listing, minimumBid } from '@food-auction/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { get, photoSource, post } from '../../api';
import { timeLeft, useNow, useSession } from '../../session';
import { Button, Card, colors } from '../../ui';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, subscribe } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow();

  const load = useCallback(async () => {
    setListing(await get<Listing>(`/listings/${id}`));
  }, [id]);

  useEffect(() => {
    void load();
    return subscribe((event) => {
      if (event.type === 'listing.updated' && event.listingId === id) void load();
    });
  }, [id, load, subscribe]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (failure) {
      const message = (failure as Error).message;
      if (message.includes('Add a card')) {
        Alert.alert('Add a card first', 'You need a saved card to bid.', [
          { text: 'Cancel' },
          { text: 'Add card', onPress: () => router.push('/card') },
        ]);
      } else {
        Alert.alert('Could not complete that', message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!listing) return null;
  const live = listing.status === 'active' && new Date(listing.endsAt).getTime() > now;
  const winning = listing.highBidderId === user?.id;
  const bid = minimumBid(listing);
  const customer = user?.role === 'customer';

  const placeBid = (amountCents: number) =>
    run(() => post(`/listings/${listing.id}/bids`, { amountCents }));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {listing.photoUrl && <Image source={photoSource(listing.photoUrl)} style={styles.photo} />}
      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.muted}>
        {listing.restaurantName}{listing.quantity > 1 ? ` · Quantity ${listing.quantity}` : ''}
      </Text>
      {!!listing.description && <Text style={styles.description}>{listing.description}</Text>}

      <Card>
        <Text style={styles.label}>Allergens, confirmed by staff</Text>
        <Text style={styles.allergens}>
          {listing.allergens.includes('none') ? 'None declared' : listing.allergens.join(', ')}
        </Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>{listing.currentBidCents === null ? 'Starting bid' : 'Current bid'}</Text>
            <Text style={styles.price}>{formatMoney(listing.currentBidCents ?? listing.reserveCents)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.label}>{live ? 'Ends in' : 'Auction'}</Text>
            <Text style={styles.timer}>{live ? timeLeft(listing.endsAt, now) : 'Ended'}</Text>
          </View>
        </View>
        {winning && live && <Text style={styles.winning}>You're the highest bidder</Text>}
      </Card>

      {live && customer && !winning && (
        <View style={styles.actions}>
          <Button busy={busy} label={`Bid ${formatMoney(bid)}`} onPress={() => placeBid(bid)} />
          <Button
            secondary
            busy={busy}
            label={`Bid ${formatMoney(bid + listing.incrementCents * 2)}`}
            onPress={() => placeBid(bid + listing.incrementCents * 2)}
          />
        </View>
      )}
      {live && customer && buyNowAvailable(listing) && (
        <View style={styles.buyNow}>
          <Button
            secondary
            busy={busy}
            label={`Buy now for ${formatMoney(listing.buyNowCents!)}`}
            onPress={() => run(() => post(`/listings/${listing.id}/buy-now`))}
          />
        </View>
      )}
      {customer && <Text style={styles.note}>Your saved card is charged automatically if you win.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16 },
  photo: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  muted: { color: colors.muted, marginTop: 2 },
  description: { color: colors.ink, fontSize: 16, marginVertical: 12, lineHeight: 22 },
  label: { color: colors.muted, fontSize: 13 },
  allergens: { color: colors.ink, fontSize: 16, fontWeight: '600', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  right: { alignItems: 'flex-end' },
  price: { fontSize: 30, fontWeight: '700', color: colors.ink },
  timer: { fontSize: 26, color: colors.warn, fontVariant: ['tabular-nums'] },
  winning: { color: colors.accent, fontWeight: '600', marginTop: 8 },
  actions: { gap: 10 },
  buyNow: { marginTop: 10 },
  note: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 14 },
});

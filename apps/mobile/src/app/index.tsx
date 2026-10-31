import { formatMoney, type Listing, minimumBid } from '@food-auction/shared';
import { Link, Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { get, photoSource } from '../api';
import { timeLeft, useNow, useSession } from '../session';
import { Button, colors } from '../ui';

function ListingCard({ listing, now }: { listing: Listing; now: number }) {
  const hasBid = listing.currentBidCents !== null;
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/listing/${listing.id}`)}>
      {listing.photoUrl
        ? <Image source={photoSource(listing.photoUrl)} style={styles.photo} />
        : <View style={[styles.photo, styles.noPhoto]}><Text style={styles.noPhotoText}>{listing.category}</Text></View>}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.muted} numberOfLines={1}>{listing.restaurantName}</Text>
        {listing.source === 'cancelled' && <Text style={styles.tag}>Cancelled order</Text>}
        <View style={styles.footer}>
          <Text style={styles.price}>{formatMoney(hasBid ? listing.currentBidCents! : minimumBid(listing))}</Text>
          <Text style={styles.time}>{timeLeft(listing.endsAt, now)}</Text>
        </View>
        <Text style={styles.muted}>{hasBid ? 'Current bid' : 'Starting bid'}</Text>
      </View>
    </Pressable>
  );
}

export default function Home() {
  const { user, ready, signOut, subscribe } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();

  const load = useCallback(async () => {
    try {
      setListings(await get<Listing[]>('/listings'));
      setError('');
    } catch {
      setError("Can't reach the server. Pull down to retry.");
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribe((event) => {
    if (event.type === 'listing.updated') void load();
  }), [subscribe, load]);

  if (!ready) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <FlatList
      contentContainerStyle={styles.page}
      data={listings}
      keyExtractor={(listing) => listing.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.heading}>Hi {user.name}</Text>
          {user.role === 'restaurant'
            ? <Button label="Photograph food to list" onPress={() => router.push('/new-listing')} />
            : (
              <View style={styles.links}>
                <Link href="/orders" style={styles.link}>My orders</Link>
                <Link href="/scan" style={styles.link}>Scan pickup</Link>
                <Link href="/card" style={styles.link}>Card</Link>
              </View>
            )}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={!error ? <Text style={styles.muted}>No food up for auction right now.</Text> : undefined}
      ListFooterComponent={<Text style={styles.signOut} onPress={signOut}>Sign out</Text>}
      renderItem={({ item }) => <ListingCard listing={item} now={now} />}
    />
  );
}

const styles = StyleSheet.create({
  page: { padding: 16 },
  header: { marginBottom: 14, gap: 10 },
  heading: { fontSize: 24, fontWeight: '700', color: colors.ink },
  links: { flexDirection: 'row', gap: 18 },
  link: { color: colors.accent, fontSize: 16, fontWeight: '600', paddingVertical: 6 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    overflow: 'hidden',
  },
  photo: { width: 112, alignSelf: 'stretch', minHeight: 124 },
  noPhoto: { backgroundColor: '#e7efe9', alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { color: colors.accent, fontWeight: '600' },
  body: { flex: 1, padding: 12 },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink },
  muted: { color: colors.muted, fontSize: 13 },
  tag: { color: colors.warn, fontSize: 12, fontWeight: '600', marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  price: { fontSize: 18, fontWeight: '700', color: colors.ink },
  time: { fontSize: 16, color: colors.warn, fontVariant: ['tabular-nums'] },
  error: { color: colors.warn },
  signOut: { color: colors.muted, textAlign: 'center', padding: 16 },
});

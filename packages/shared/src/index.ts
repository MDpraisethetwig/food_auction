export const ALLERGENS = [
  'none',
  'milk',
  'eggs',
  'peanuts',
  'tree nuts',
  'wheat',
  'soy',
  'sesame',
  'fish',
  'shellfish',
  'mustard',
] as const;

export const CATEGORIES = [
  'pizza',
  'sandwich',
  'bowl',
  'bakery',
  'sushi',
  'salad',
  'hot meal',
  'other',
] as const;

export const BUY_NOW_CUTOFF = 0.8;

export type Role = 'customer' | 'restaurant';
export type ListingStatus = 'active' | 'closing' | 'sold' | 'unsold' | 'no_show_review' | 'closed';
export type OrderStatus = 'awaiting_pickup' | 'picked_up' | 'no_show' | 'payment_failed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  cardLast4: string | null;
}

export interface Listing {
  id: string;
  restaurantId: string;
  restaurantName: string;
  title: string;
  description: string;
  category: string;
  allergens: string[];
  quantity: number;
  source: 'cancelled' | 'surplus';
  photoUrl: string | null;
  reserveCents: number;
  incrementCents: number;
  buyNowCents: number | null;
  currentBidCents: number | null;
  highBidderId: string | null;
  endsAt: string;
  expiresAt: string;
  status: ListingStatus;
  round: number;
}

export interface Order {
  id: string;
  listingId: string;
  title: string;
  restaurantName: string;
  amountCents: number;
  kind: 'auction' | 'buy_now';
  status: OrderStatus;
  pickupDeadline: string | null;
  refundedCents: number;
}

export interface ListingDraft {
  title: string;
  description: string;
  category: string;
  ingredientsToCheck: string[];
  aiGenerated: boolean;
}

export type ServerEvent =
  | { type: 'listing.updated'; listingId: string }
  | { type: 'bid.outbid'; listingId: string; title: string }
  | { type: 'auction.won'; listingId: string; title: string; amountCents: number }
  | { type: 'payment.failed'; listingId: string; title: string };

export const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function minimumBid(listing: Pick<Listing, 'currentBidCents' | 'reserveCents' | 'incrementCents'>) {
  return listing.currentBidCents === null
    ? listing.reserveCents
    : listing.currentBidCents + listing.incrementCents;
}

export function buyNowAvailable(listing: Pick<Listing, 'buyNowCents' | 'currentBidCents'>) {
  if (listing.buyNowCents === null) return false;
  return (listing.currentBidCents ?? 0) < listing.buyNowCents * BUY_NOW_CUTOFF;
}

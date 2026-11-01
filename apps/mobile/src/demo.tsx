import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { formatMoney } from '@food-auction/shared';
import type { ImageSourcePropType } from 'react-native';
import { sendAlert } from './alerts';

// Hardcoded data for the design pass. Nothing here talks to the server.

export const food = {
  bowl: require('../assets/food/bowl.jpg'),
  bread: require('../assets/food/bread.jpg'),
  burger: require('../assets/food/burger.jpg'),
  curry: require('../assets/food/curry.jpg'),
  hero: require('../assets/food/hero.jpg'),
  pastry: require('../assets/food/pastry.jpg'),
  pizza: require('../assets/food/pizza.jpg'),
  salad: require('../assets/food/salad.jpg'),
  sushi: require('../assets/food/sushi.jpg'),
  wrap: require('../assets/food/wrap.jpg'),
};

export type Role = 'customer' | 'restaurant';

export interface DemoListing {
  id: string;
  title: string;
  restaurant: string;
  distanceKm: number;
  image: ImageSourcePropType;
  category: string;
  description: string;
  allergens: string[];
  source: 'cancelled' | 'surplus';
  startCents: number;
  incrementCents: number;
  buyNowCents: number | null;
  retailCents: number;
  bidCents: number | null;
  bidCount: number;
  endsAt: number;
  kgSaved: number;
  winning: boolean;
  settled: boolean;
}

export interface DemoOrder {
  id: string;
  title: string;
  restaurant: string;
  image: ImageSourcePropType;
  amountCents: number;
  retailCents: number;
  kgSaved: number;
  status: 'ready' | 'picked_up';
  pickupBy: number | null;
  when: string;
}

export interface Toast {
  id: number;
  title: string;
  body: string;
  tone: 'good' | 'warn';
  listingId?: string;
}

export const RESTAURANT = 'Westdale Slice House';
export const CATEGORIES = ['All', 'Pizza', 'Sushi', 'Hot meals', 'Bowls', 'Bakery', 'Wraps', 'Burgers', 'Salads'];
export const CO2_PER_KG = 2.5;

export const INTERESTS: { name: string; image: ImageSourcePropType }[] = [
  { name: 'Pizza', image: food.pizza },
  { name: 'Sushi', image: food.sushi },
  { name: 'Hot meals', image: food.curry },
  { name: 'Bowls', image: food.bowl },
  { name: 'Bakery', image: food.pastry },
  { name: 'Wraps', image: food.wrap },
  { name: 'Burgers', image: food.burger },
  { name: 'Salads', image: food.salad },
];

// Foods that scratch a similar itch, used for "close to what you love" alerts.
const closeTo: Record<string, string[]> = {
  Pizza: ['Burgers', 'Wraps'],
  Sushi: ['Bowls', 'Salads'],
  'Hot meals': ['Bowls', 'Wraps'],
  Bowls: ['Salads', 'Sushi', 'Hot meals'],
  Bakery: [],
  Wraps: ['Burgers', 'Hot meals'],
  Burgers: ['Pizza', 'Wraps'],
  Salads: ['Bowls'],
};

export function matchFor(category: string, interests: string[]) {
  if (interests.includes(category)) return { kind: 'exact' as const, because: category };
  const because = interests.find((interest) => closeTo[interest]?.includes(category));
  return because ? { kind: 'close' as const, because } : null;
}

const MINUTE = 60 * 1000;
const opened = Date.now();

const seedListings: DemoListing[] = [
  {
    id: 'pizza', title: 'Rosemary pepperoni pizza', restaurant: RESTAURANT, distanceKm: 0.4, image: food.pizza,
    category: 'Pizza', description: 'Six slices made this afternoon and never left the kitchen.',
    allergens: ['milk', 'wheat'], source: 'surplus', startCents: 500, incrementCents: 50, buyNowCents: 1200,
    retailCents: 1800, bidCents: 650, bidCount: 4, endsAt: opened + 4 * MINUTE, kgSaved: 0.9, winning: false,
    settled: false,
  },
  {
    id: 'sushi', title: 'Salmon roll platter', restaurant: 'Hana Sushi Bar', distanceKm: 1.1, image: food.sushi,
    category: 'Sushi', description: 'A cancelled order for two, rolled fresh at six o\'clock.',
    allergens: ['fish', 'soy', 'sesame'], source: 'cancelled', startCents: 900, incrementCents: 100,
    buyNowCents: 1800, retailCents: 3200, bidCents: 1100, bidCount: 6, endsAt: opened + 6.3 * MINUTE, kgSaved: 0.7,
    winning: false, settled: false,
  },
  {
    id: 'curry', title: 'Butter chicken and naan', restaurant: 'Spice Route Kitchen', distanceKm: 0.8,
    image: food.curry, category: 'Hot meals', description: 'Delivery fell through, so this one is still hot.',
    allergens: ['milk', 'wheat'], source: 'cancelled', startCents: 700, incrementCents: 50, buyNowCents: 1300,
    retailCents: 2200, bidCents: null, bidCount: 0, endsAt: opened + 12.7 * MINUTE, kgSaved: 0.8, winning: false,
    settled: false,
  },
  {
    id: 'bowl', title: 'Harvest grain bowl', restaurant: 'Green Fork', distanceKm: 1.4, image: food.bowl,
    category: 'Bowls', description: 'Roasted tofu, corn, cabbage and greens from tonight\'s prep.',
    allergens: ['soy', 'eggs'], source: 'surplus', startCents: 600, incrementCents: 50, buyNowCents: 1100,
    retailCents: 1700, bidCents: 700, bidCount: 2, endsAt: opened + 24 * MINUTE, kgSaved: 0.6, winning: false,
    settled: false,
  },
  {
    id: 'wrap', title: 'Spiced chicken wraps', restaurant: RESTAURANT, distanceKm: 0.4, image: food.wrap,
    category: 'Wraps', description: 'Two wraps from the lunch rush, packed and chilled.',
    allergens: ['wheat', 'sesame'], source: 'surplus', startCents: 500, incrementCents: 50, buyNowCents: 900,
    retailCents: 1500, bidCents: 550, bidCount: 1, endsAt: opened + 31 * MINUTE, kgSaved: 0.5, winning: false,
    settled: false,
  },
  {
    id: 'pastry', title: 'Butter croissants, box of six', restaurant: 'Oat & Ember Bakehouse', distanceKm: 1.9,
    image: food.pastry, category: 'Bakery', description: 'This morning\'s last tray, still flaky.',
    allergens: ['eggs', 'milk', 'wheat'], source: 'surplus', startCents: 400, incrementCents: 25, buyNowCents: 800,
    retailCents: 1500, bidCents: null, bidCount: 0, endsAt: opened + 47 * MINUTE, kgSaved: 0.4, winning: false,
    settled: false,
  },
];

const seedOrders: DemoOrder[] = [
  {
    id: 'bread', title: 'Seeded sourdough loaves', restaurant: 'Oat & Ember Bakehouse', image: food.bread,
    amountCents: 650, retailCents: 1400, kgSaved: 1.2, status: 'ready', pickupBy: opened + 18 * MINUTE, when: 'Today',
  },
  {
    id: 'salad', title: 'Citrus garden salad', restaurant: 'Green Fork', image: food.salad, amountCents: 500,
    retailCents: 1300, kgSaved: 0.4, status: 'picked_up', pickupBy: null, when: 'Yesterday',
  },
  {
    id: 'burger', title: 'Double smash burger', restaurant: 'Cedar Grill', image: food.burger, amountCents: 700,
    retailCents: 1600, kgSaved: 0.5, status: 'picked_up', pickupBy: null, when: 'Tuesday',
  },
];

// What this customer had already rescued before the orders listed above.
const pastImpact = { meals: 21, kg: 7.7, savedCents: 12800 };

export const weeklyMeals = [
  { label: 'M', meals: 1 }, { label: 'T', meals: 3 }, { label: 'W', meals: 2 }, { label: 'T', meals: 4 },
  { label: 'F', meals: 2 }, { label: 'S', meals: 5 }, { label: 'S', meals: 3 },
];

export interface AlertSettings {
  enabled: boolean;
  closeMatches: boolean;
}

interface Demo {
  role: Role | null;
  setRole: (role: Role | null) => void;
  listings: DemoListing[];
  orders: DemoOrder[];
  toast: Toast | null;
  dismissToast: () => void;
  impact: { meals: number; kg: number; co2: number; savedCents: number };
  interests: string[];
  toggleInterest: (name: string) => void;
  alerts: AlertSettings;
  setAlerts: (settings: AlertSettings) => void;
  placeBid: (id: string, cents: number) => void;
  buyNow: (id: string) => void;
  confirmPickup: (id: string) => void;
  publish: (listing: Pick<DemoListing, 'title' | 'description' | 'category' | 'allergens' | 'source' | 'image'
    | 'startCents' | 'incrementCents' | 'buyNowCents'> & { biddingMinutes: number }) => void;
}

const DemoContext = createContext<Demo | null>(null);

const orderFrom = (listing: DemoListing, amountCents: number): DemoOrder => ({
  id: `${listing.id}-${Date.now()}`,
  title: listing.title,
  restaurant: listing.restaurant,
  image: listing.image,
  amountCents,
  retailCents: listing.retailCents,
  kgSaved: listing.kgSaved,
  status: 'ready',
  pickupBy: Date.now() + 30 * MINUTE,
  when: 'Today',
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [listings, setListings] = useState(seedListings);
  const [orders, setOrders] = useState(seedOrders);
  const [toast, setToast] = useState<Toast | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<AlertSettings>({ enabled: true, closeMatches: true });
  const rivalled = useRef(new Set<string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const show = useCallback((next: Omit<Toast, 'id'>) => setToast({ ...next, id: Date.now() }), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setListings((current) => {
        const due = current.filter((listing) => !listing.settled && listing.endsAt <= Date.now());
        if (!due.length) return current;
        for (const listing of due.filter((item) => item.winning)) {
          setOrders((existing) => [orderFrom(listing, listing.bidCents!), ...existing]);
          show({ title: 'You won!', body: `${listing.title} is yours. Pick it up soon.`, tone: 'good' });
        }
        return current.map((listing) => (due.includes(listing) ? { ...listing, settled: true } : listing));
      });
    }, 1000);
    const pending = timers.current;
    return () => {
      clearInterval(interval);
      pending.forEach(clearTimeout);
    };
  }, [show]);

  const placeBid = useCallback((id: string, cents: number) => {
    setListings((current) => current.map((listing) => (listing.id === id
      ? { ...listing, bidCents: cents, bidCount: listing.bidCount + 1, winning: true }
      : listing)));
    if (rivalled.current.has(id)) return;
    rivalled.current.add(id);
    // One rival per listing, so the outbid moment shows up in every demo.
    timers.current.push(setTimeout(() => {
      setListings((current) => current.map((listing) => {
        if (listing.id !== id || listing.settled || !listing.winning) return listing;
        return {
          ...listing,
          bidCents: listing.bidCents! + listing.incrementCents,
          bidCount: listing.bidCount + 1,
          winning: false,
        };
      }));
      show({ title: 'You were outbid', body: 'Another neighbour raised the price.', tone: 'warn', listingId: id });
    }, 7000));
  }, [show]);

  const buyNow = useCallback((id: string) => {
    const listing = listings.find((item) => item.id === id);
    if (!listing?.buyNowCents) return;
    setListings((current) => current.map((item) => (item.id === id ? { ...item, settled: true } : item)));
    setOrders((current) => [orderFrom(listing, listing.buyNowCents!), ...current]);
  }, [listings]);

  const confirmPickup = useCallback((id: string) => {
    setOrders((current) => current.map((order) => (order.id === id
      ? { ...order, status: 'picked_up', pickupBy: null }
      : order)));
  }, []);

  const toggleInterest = useCallback((name: string) => {
    setInterests((current) => (current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name]));
  }, []);

  const publish = useCallback<Demo['publish']>(({ biddingMinutes, ...listing }) => {
    const id = `new-${Date.now()}`;
    setListings((current) => [{
      ...listing,
      id,
      restaurant: RESTAURANT,
      distanceKm: 0.4,
      retailCents: (listing.buyNowCents ?? listing.startCents) * 2,
      bidCents: null,
      bidCount: 0,
      endsAt: Date.now() + biddingMinutes * MINUTE,
      kgSaved: 0.8,
      winning: false,
      settled: false,
    }, ...current]);

    const match = alerts.enabled ? matchFor(listing.category, interests) : null;
    if (!match || (match.kind === 'close' && !alerts.closeMatches)) return;
    const title = match.kind === 'exact' ? `${listing.category} just dropped nearby` : 'Close to what you love';
    const body = match.kind === 'exact'
      ? `${listing.title} at ${RESTAURANT}. Bidding starts at ${formatMoney(listing.startCents)}.`
      : `${listing.title} at ${RESTAURANT}, because you like ${match.because.toLowerCase()}.`;
    void sendAlert(title, body, id).then((sent) => {
      if (!sent) show({ title, body, tone: 'good', listingId: id });
    });
  }, [alerts, interests, show]);

  const impact = useMemo(() => {
    const kg = orders.reduce((total, order) => total + order.kgSaved, pastImpact.kg);
    return {
      meals: pastImpact.meals + orders.length,
      kg,
      co2: kg * CO2_PER_KG,
      savedCents: orders.reduce((total, order) => total + order.retailCents - order.amountCents, pastImpact.savedCents),
    };
  }, [orders]);

  const value = useMemo(() => ({
    role,
    setRole,
    listings,
    orders,
    toast,
    dismissToast: () => setToast(null),
    impact,
    interests,
    toggleInterest,
    alerts,
    setAlerts,
    placeBid,
    buyNow,
    confirmPickup,
    publish,
  }), [
    role, listings, orders, toast, impact, interests, toggleInterest, alerts, placeBid, buyNow, confirmPickup, publish,
  ]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error('DemoProvider is missing');
  return demo;
}

export function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function timeLeft(at: number, now: number) {
  const seconds = Math.max(0, Math.floor((at - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const nextBid = (listing: DemoListing) => (listing.bidCents === null
  ? listing.startCents
  : listing.bidCents + listing.incrementCents);

export const currentPrice = (listing: DemoListing) => listing.bidCents ?? listing.startCents;

export const percentOff = (listing: DemoListing) =>
  Math.round((1 - currentPrice(listing) / listing.retailCents) * 100);

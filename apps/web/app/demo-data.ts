// Hardcoded data for the design pass. Nothing here talks to the server.

export const restaurant = { name: 'Westdale Slice House', address: 'King St W, Hamilton' };

export const hero = { recoveredCents: 128450, meals: 214, kgSaved: 96, co2Kg: 240, sellThrough: 72 };

export const missedPickups = [{ id: 'calzone', title: 'Veggie calzone', buyer: 'Sam' }];

export const liveAuctions = [
  { id: 'pizza', title: 'Rosemary pepperoni pizza', image: '/food/pizza.jpg', bids: 4, priceCents: 650, minutes: 6 },
  { id: 'wrap', title: 'Spiced chicken wraps', image: '/food/wrap.jpg', bids: 1, priceCents: 550, minutes: 14 },
  { id: 'curry', title: 'Butter chicken and naan', image: '/food/curry.jpg', bids: 0, priceCents: 700, minutes: 23 },
];

export const orders = [
  { id: '1', title: 'Margherita pizza', buyer: 'Alex', amountCents: 850, status: 'picked_up' },
  { id: '2', title: 'Garlic knots', buyer: 'Sam', amountCents: 400, status: 'awaiting_pickup' },
  { id: '3', title: 'Caesar salad', buyer: 'Priya', amountCents: 550, status: 'picked_up' },
  { id: '4', title: 'Veggie calzone', buyer: 'Sam', amountCents: 725, status: 'no_show' },
  { id: '5', title: 'Pepperoni slices', buyer: 'Jordan', amountCents: 350, status: 'picked_up' },
] as const;

export const statusText = {
  picked_up: 'Picked up',
  awaiting_pickup: 'Awaiting pickup',
  no_show: 'No-show',
};

export const daily = [
  { label: 'Oct 18', dollars: 62 }, { label: 'Oct 19', dollars: 88 }, { label: 'Oct 20', dollars: 74 },
  { label: 'Oct 21', dollars: 96 }, { label: 'Oct 22', dollars: 81 }, { label: 'Oct 23', dollars: 118 },
  { label: 'Oct 24', dollars: 104 }, { label: 'Oct 25', dollars: 92 }, { label: 'Oct 26', dollars: 77 },
  { label: 'Oct 27', dollars: 123 }, { label: 'Oct 28', dollars: 109 }, { label: 'Oct 29', dollars: 134 },
  { label: 'Oct 30', dollars: 121 }, { label: 'Oct 31', dollars: 86 },
];

export const byCategory = [
  { category: 'Pizza', sold: 58, unsold: 12 },
  { category: 'Hot meals', sold: 41, unsold: 13 },
  { category: 'Sandwiches', sold: 33, unsold: 9 },
  { category: 'Bakery', sold: 19, unsold: 16 },
  { category: 'Salads', sold: 11, unsold: 18 },
];

export const unsoldByHour = [
  { label: '14:00', unsold: 2 }, { label: '15:00', unsold: 3 }, { label: '16:00', unsold: 5 },
  { label: '17:00', unsold: 4 }, { label: '18:00', unsold: 7 }, { label: '19:00', unsold: 11 },
  { label: '20:00', unsold: 9 }, { label: '21:00', unsold: 6 },
];

import type { ChatMessage, Recommendation, RecommendationRequest } from '@food-auction/shared';
import { post, setAuthToken, uploadVoice } from './api';
import { currentPrice, type DemoListing } from './demo';

// The rest of the demo runs without sign-in, but AI routes stay behind an account, so use a seeded customer.
const demoCustomer = { email: 'alex@demo.test', password: 'demo1234' };

async function signIn() {
  const { token } = await post<{ token: string }>('/auth/login', demoCustomer);
  setAuthToken(token);
}

export async function askForFood(messages: ChatMessage[], listings: DemoListing[], likes: string[]) {
  await signIn();
  const request: RecommendationRequest = {
    messages,
    likes,
    listings: listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      restaurant: listing.restaurant,
      allergens: listing.allergens,
      priceCents: currentPrice(listing),
      distanceKm: listing.distanceKm,
      minutesLeft: Math.round((listing.endsAt - Date.now()) / 60000),
    })),
  };
  return post<Recommendation>('/ai/recommend', request);
}

export async function speechToText(uri: string) {
  await signIn();
  const { text } = await uploadVoice<{ text: string }>(uri);
  return text;
}

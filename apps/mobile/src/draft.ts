import type { ListingDraft } from '@food-auction/shared';
import { post, setAuthToken, uploadPhoto } from './api';

// The rest of the demo runs without sign-in, but the draft route stays restaurant-only, so use the seeded owner.
const demoOwner = { email: 'owner@demo.test', password: 'demo1234' };

export async function draftFromPhoto(uri: string) {
  const { token } = await post<{ token: string }>('/auth/login', demoOwner);
  setAuthToken(token);
  const { draft } = await uploadPhoto<{ draft: ListingDraft }>(uri);
  return draft;
}

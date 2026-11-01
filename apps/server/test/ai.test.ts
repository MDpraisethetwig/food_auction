import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draftListing, recommendFood, transcribeSpeech } from '../src/ai.js';
import { config } from '../src/config.js';

const photo = Buffer.from('photo');
const draft = {
  title: 'Margherita pizza',
  description: 'Eight slices from tonight.',
  category: 'pizza',
  ingredientsToCheck: ['cheese'],
};

function stubOpenAi(body: unknown, status = 200) {
  const send = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', send);
  return send;
}

describe('draftListing', () => {
  beforeEach(() => {
    config.openaiApiKey = 'test-key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    config.openaiApiKey = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends the photo and reads the draft past any reasoning output', async () => {
    const send = stubOpenAi({
      output: [
        { type: 'reasoning', summary: [] },
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(draft) }] },
      ],
    });

    expect(await draftListing(photo, 'image/jpeg')).toEqual({ ...draft, aiGenerated: true });

    const [url, request] = send.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(request.body as string);
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(body.input[0].content[1].image_url).toBe(`data:image/jpeg;base64,${photo.toString('base64')}`);
    expect(body.text.format.strict).toBe(true);
  });

  it('skips OpenAI without a key', async () => {
    config.openaiApiKey = '';
    const send = stubOpenAi({});
    expect((await draftListing(photo, 'image/jpeg')).aiGenerated).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('falls back to a blank draft on a refusal', async () => {
    stubOpenAi({
      output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'I cannot help with that.' }] }],
    });
    expect((await draftListing(photo, 'image/jpeg')).aiGenerated).toBe(false);
  });

  it('falls back to a blank draft on an API error', async () => {
    stubOpenAi({ error: { message: 'Invalid model' } }, 400);
    expect((await draftListing(photo, 'image/jpeg')).aiGenerated).toBe(false);
  });
});

describe('recommendFood', () => {
  const listing = (id: string, allergens: string[]) => ({
    id,
    title: id,
    description: '',
    category: 'Bowls',
    restaurant: 'Green Fork',
    allergens,
    priceCents: 700,
    distanceKm: 1,
    minutesLeft: 20,
  });
  const request = {
    messages: [{ role: 'user' as const, text: 'No dairy please' }],
    listings: [listing('curry', ['milk', 'wheat']), listing('bowl', ['soy']), listing('wrap', ['wheat'])],
    likes: [],
  };
  const answer = (reply: string, listingIds: string[], avoidAllergens: string[] = []) => ({
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: JSON.stringify({ reply, listingIds, avoidAllergens }) }],
    }],
  });

  beforeEach(() => {
    config.openaiApiKey = 'test-key';
  });

  afterEach(() => {
    config.openaiApiKey = '';
    vi.unstubAllGlobals();
  });

  it('keeps the order the model chose and never returns more than three', async () => {
    const many = { ...request, listings: [...request.listings, listing('pizza', [])] };
    stubOpenAi(answer('Try these.', ['wrap', 'bowl', 'pizza', 'curry']));
    const result = await recommendFood(many);
    expect(result.listingIds).toEqual(['wrap', 'bowl', 'pizza']);
    expect(result.reply).toBe('Try these.');
  });

  it('drops listings that are not available', async () => {
    stubOpenAi(answer('Try the lasagne.', ['lasagne', 'bowl']));
    expect((await recommendFood(request)).listingIds).toEqual(['bowl']);
  });

  it('removes a listing with an avoided allergen and replaces the reply that named it', async () => {
    stubOpenAi(answer('The curry is great.', ['curry', 'bowl'], ['milk']));
    const result = await recommendFood(request);
    expect(result.listingIds).toEqual(['bowl']);
    expect(result.reply).not.toContain('curry');
  });

  it('says so when every match lists an avoided allergen', async () => {
    stubOpenAi(answer('The curry is great.', ['curry'], ['milk']));
    const result = await recommendFood(request);
    expect(result.listingIds).toEqual([]);
    expect(result.reply).not.toContain('curry');
  });

  it('passes on an OpenAI failure', async () => {
    stubOpenAi({ error: { message: 'Rate limited' } }, 429);
    await expect(recommendFood(request)).rejects.toThrow('429');
  });
});

describe('transcribeSpeech', () => {
  beforeEach(() => {
    config.openaiApiKey = 'test-key';
  });

  afterEach(() => {
    config.openaiApiKey = '';
    vi.unstubAllGlobals();
  });

  it('returns the transcript', async () => {
    const send = stubOpenAi({ text: ' Something spicy. ', languages: [{ code: 'en' }] });
    expect(await transcribeSpeech(Buffer.from('audio'))).toBe('Something spicy.');
    expect((send.mock.calls[0] as unknown as [string])[0]).toBe('https://api.openai.com/v1/audio/transcriptions');
  });
});

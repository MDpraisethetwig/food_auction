import { CATEGORIES, type ListingDraft } from '@food-auction/shared';
import { config } from './config.js';

const blankDraft: ListingDraft = {
  title: '',
  description: '',
  category: 'other',
  ingredientsToCheck: [],
  aiGenerated: false,
};

const prompt = `You write short listings for leftover restaurant food.
Look at the photo and describe only what is visible. Title: at most 6 words.
Description: one appetising sentence. Do not state or guess whether the food is safe for
people with allergies. ingredientsToCheck lists likely ingredients that staff should verify.`;

const responseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    category: { type: 'STRING', enum: [...CATEGORIES] },
    ingredientsToCheck: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'description', 'category', 'ingredientsToCheck'],
};

// A failed or slow AI call returns a blank draft, so staff can always fill the listing in by hand.
export async function draftListing(image: Buffer, mimeType: string): Promise<ListingDraft> {
  if (!config.geminiApiKey) return blankDraft;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: image.toString('base64') } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json', responseSchema },
        }),
      },
    );
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const body = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no text');
    return { ...blankDraft, ...JSON.parse(text), aiGenerated: true };
  } catch (error) {
    console.error('AI draft failed', error);
    return blankDraft;
  }
}

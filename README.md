# Full for Less

Restaurants photograph unsold food or cancelled orders, AI drafts a listing, and nearby customers bid on it. Winners are charged automatically and confirm pickup with a QR code.

- `apps/mobile`: Expo app for customers and restaurant staff
- `apps/web`: restaurant dashboard (Next.js)
- `apps/server`: API, auctions, WebSockets (Fastify, PostgreSQL)
- `packages/shared`: shared types and rules

## Run it

This runs on Macs. The bundled PostgreSQL is the macOS build.

```bash
npm install
```

Copy `.env.example` to `.env` and add any keys you have. Then use one terminal per command:

```bash
npm run db
```

```bash
npm run seed
```

```bash
npm run server
```

```bash
npm run web
```

`npm run db` runs PostgreSQL from `node_modules`, so no system install is needed. `npm run seed` wipes the database and reloads the demo data; use it to reset between rehearsals.

The site is at http://localhost:3000. Demo accounts use the password `demo1234`:

| Account | Use |
|---|---|
| `owner@demo.test` | Restaurant |
| `alex@demo.test`, `sam@demo.test` | Customers with a working mock card |
| `casey@demo.test` | Customer whose card is declined |

## AI listing drafts

Add `OPENAI_API_KEY` to `.env` and restart the server. Staff photograph the food in the app and OpenAI drafts the title, description, category and ingredients to check. Without a key, or if the call fails, staff fill the listing in by hand. Allergens are always confirmed by staff.

Customers can tap **Tell us what you're craving** on Discover to type or say what they want. Speech goes through OpenAI transcription, and the assistant recommends only from food listed right now. The server removes anything listing an allergen the customer mentioned, but restaurants' allergen lists are all it can check, so the app tells customers to confirm with the restaurant.

Try voice on a real phone. The microphone froze the iOS Simulator in testing.

The app uses the same address for the API as Expo, so a phone on the same network needs `HOST=0.0.0.0` in `.env`. Use `127.0.0.1` on public Wi-Fi.

## Reach it from phones

Install cloudflared once:

```bash
brew install cloudflared
```

Start a tunnel for the API and copy the `https://...trycloudflare.com` URL it prints:

```bash
cloudflared tunnel --url http://localhost:4000
```

Put that URL in `apps/mobile/.env`, then start Expo and scan its QR code with Expo Go:

```
EXPO_PUBLIC_API_URL=https://your-url.trycloudflare.com
```

```bash
npm run mobile
```

To show the site on another device, tunnel it the same way and set `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` to the API tunnel URL. The tunnel URL changes whenever cloudflared restarts, so leave it running.

Phones on the same Wi-Fi as the laptop can load the app directly. If the venue Wi-Fi blocks that, use a phone hotspot.

## Demo script

1. Sign in on the laptop as `owner@demo.test` to show the dashboard.
2. On phone 1, sign in as the owner, photograph food, check the draft, confirm allergens and publish.
3. On phones 2 and 3, sign in as Alex and Sam and open the listing.
4. Bid from both phones. The outbid alert and new price appear live.
5. Let the 60-second auction end. The winner is charged and sees a win alert.
6. Scan the QR code on the dashboard from the winner's phone.
7. Show the sale on the dashboard.

For the no-show story, buy an item with Buy Now and let the 30-second window lapse. The dashboard asks whether the food is still safe. Choose Re-auction, buy it from the other account, and the first buyer's order shows the refund.

## Tests

```bash
npm test
```

## Not built for the hackathon

Stripe Connect payouts to restaurants, push notifications, location checks on pickup, AI trend insights, and production security and hosting.

# Full4Less pitch deck: brief for slide authors

Product: **Full4Less (F4L)**. Restaurants and cafeterias photograph unsold food or cancelled orders, AI drafts the listing, staff confirm allergens, nearby customers bid or Buy Now, the winner is charged automatically and picks up by scanning a QR code. No-shows stay charged and the food can be re-auctioned. Restaurants get an analytics site. First market: Hamilton, Ontario, starting at McMaster. Never write "LastCall".

## How it fits together
- `deck/src/deck.css` and `deck/src/deck.js` are the shared engine. READ THEM FIRST. Do not edit them, `build.mjs`, or anything outside your own slide files.
- You write only `slides/NN.html`, `slides/NN.css`, and if truly needed `slides/NN.js`. Run `node build.mjs` from `deck/` to check it assembles.
- Stage is a fixed **1920x1080** canvas: use px. No responsive work. Keep content inside 96px side margins, 88px top, and above y=1000 (the progress bar sits at the bottom).
- Each file holds exactly one section:

```html
<section class="slide" id="s03" data-plate="1560 300 620 .45">
  <p class="kicker">Problem</p>
  <h2 data-split>Title here</h2>
  <div data-beat="1">appears on first click</div>
  <aside class="notes">What the presenter says.</aside>
</section>
```

- Scope ALL CSS under the slide id (`#s03 .thing`). Prefix keyframes with the id (`s03-pulse`). JS must be scoped too and wrapped in an IIFE; listen for `enter`, `leave` and `beat` events on your section (`beat` has `detail.step`). Use JS only for what CSS cannot do, such as a live number. Prefer CSS.
- Start animations with `#s03.is-active ...` or `#s03 .x.on`, so they replay on arrival.
- `data-plate="x y size opacity"` positions the ambient plate ring, which glides between slides. Choose a place that frames your content and never sits behind body text at high opacity. Keep opacity .15 to .6.
- `class="slide light"` gives the paper background. Use it on no more than the slides your section lists.
- `data-tone="bare"` on a section hides the progress bar.

## Design
Palette tokens: `--ink --ink-2 --ink-3 --line --fog --paper --green --leaf --amber --red`. Green means F4L and good news; amber means auction, bids and time; red only for waste. Fonts: h1 to h3 and `.display` use the display face. `.card` is the shared panel. Motif: the plate ring and fanned translucent rounded rectangles from the logo.

One message per slide. Few words, large type: body at least 26px, notes under charts at least 20px. No accent bars or underlines beneath titles, no edge stripes on cards. Each slide must look different from its neighbours, and each needs a real visual idea, not a title with bullets. Do not show template prompts or "Judges score this".

Agents building other slides share this design. Do not center body paragraphs.

## Motion: be generous, stay purposeful
A pitch should feel smooth, and motion should explain something: numbers count up, charts draw, things move like the thing they depict. Use these modern features where they fit, because the engine supports them and the audience will see them in Chrome:
- `@property` registered values `--n` (integer), `--pct` (number), `--angle`: animate them for count-ups (`counter-reset: x var(--n); content: counter(x)`) and for pies with `conic-gradient`.
- `linear()` springs: `--spring`, `--bounce`, plus `--out`, `--inout`.
- `sibling-index()` stagger: put `data-stagger` on a parent, children get `--i`.
- `@starting-style`, `transition-behavior: allow-discrete`, `color-mix()`, `offset-path` for elements moving along a path, SVG `stroke-dashoffset` draw-ons, `animation-composition`, `backdrop-filter`, `mask`, `text-wrap: balance`, `corner-shape: squircle`.
- Nested `view-transition-name` on your hero element for it to morph between its neighbouring slides, only where agreed in your assignment.
Everything must still look right with no animation support. `prefers-reduced-motion` and print are handled globally for `[data-beat]` and `[data-split]`; make sure custom animations end in a visible state, and any element that starts hidden has an `@media print` rule in your CSS that shows it.

Three to five beats a slide at most: the presenter has limited time. Mark anything that loops as slow and subtle.

## Logos
`<img class="logo" src="assets/logos/NAME.svg" alt="Name">`, available: expo, stripe, postgresql, cloudflare, nextdotjs, fastify, nodedotjs, googlegemini, apple. They are monochrome and recoloured by `.logo`. Too Good To Go has no logo file: use its name as text. Show logos only where the platform is actually mentioned.

## Honesty rules
Use only facts given in your assignment. Do not invent numbers, names, quotes, partners, customers or traction. Text in [square brackets] is a placeholder the team must fill: keep it visibly bracketed. Label estimates as estimates.

Speaker notes: write natural first-person lines for a roughly 30 to 45 second slide, in `<aside class="notes">`.

## Done means
`node build.mjs` runs and your slide fills the stage without overflow. Report back in under 80 words: what you built and anything you could not do.

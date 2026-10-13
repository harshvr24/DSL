# DSL Hyperscale Advisory: website

A one-page Astro site with static output. Plain CSS, self-hosted fonts, GSAP for scroll motion, and three hand-built 3D pieces (no 3D library).

```
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview
```

## Where things are

| What | Where |
|---|---|
| Company facts and placeholders | `src/config.ts` |
| All page copy (sections, FAQ, roles, steps…) | `src/content.ts` |
| Page order | `src/pages/index.astro` |
| One file per section | `src/components/sections/` |
| Scroll motion (GSAP) and the sky's camera path | `src/scripts/motion.ts` |
| Cloud sky (WebGL shader) | `src/scripts/sky.ts` |
| Globe (Canvas 2D) and sun maths | `src/scripts/globe.ts`, `src/scripts/sun.ts` |
| Exploded stack drawing (CSS 3D + SVG) | `src/components/Stack.astro` |
| Colours, type, shared styles | `src/styles/global.css` |

## The three 3D pieces

- **Sky.** Volumetric clouds raymarched in one fragment shader, drawn at reduced resolution behind the page. `motion.ts` holds a list of keyframes (scroll position → camera height, pitch, cloud cover, sun angle); edit that list to change what the sky does in each section.
- **Globe.** Line-drawn Earth with today's real day/night line. Scrolling the "Follow the sun" section runs 24 hours in the visitor's time zone. Locations and working hours are the `places` array in `src/content.ts`.
- **Stack.** Seven plates, one per capability, in `Stack.astro`. The plate for the capability being read lifts and tints.

### Fallbacks

The sky turns itself off and the static gradient backdrop stays when: the visitor prefers reduced motion, Save-Data is on, WebGL2 is missing, the GPU is a software renderer, or frames are too slow. It also steps down through three quality tiers before giving up. With reduced motion nothing is pinned or scrubbed and all content is visible; without JavaScript the page is fully readable.

Debug switches: `?debug=fps` (frame rate and tier), `?sky=off`, `?sky=force`.

## Contact form

The form posts JSON `{ name, email, company, need }` to `PUBLIC_FORM_ENDPOINT`. Set the endpoint at build time:

```
PUBLIC_FORM_ENDPOINT=https://xxxx.execute-api.ap-south-1.amazonaws.com/contact npm run build
```

or put it in `.env` (see `.env.example`). If it is empty, the form runs in stub mode: it validates the fields, logs the payload to the console, and tells the visitor nothing was sent. The submit logic is in `src/components/sections/Contact.astro`.

Any HTTPS endpoint that accepts a JSON `POST` and allows CORS from the site's origin will work, for example API Gateway + Lambda + SES, or a form service.

## Coastline data

`public/data/land.json` is Natural Earth 110 m land, converted by `node scripts/build-coastline.mjs` (needs the dev dependencies `world-atlas` and `topojson-client`). The output is committed; you only need the script to regenerate it.

## Deploy (S3 + CloudFront)

```
npm run build
aws s3 sync dist/ s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

Use a private bucket behind CloudFront with Origin Access Control, set the default root object to `index.html`, and turn on compression.

## Before launch

- Search the repo for `PLACEHOLDER`: registered address, AWS partner tier and the AWS Partner badge file (`src/config.ts`). The page leaves these out until they are filled in.
- Search `src/content.ts` for `SUGGESTED`: drafted commitments (durations, rates, support hours, team shapes, FAQ answers, access practices) that need confirming.

# Parkpath — National Park Trip Planner

MVP website that turns a few trip details into a daily itinerary and an artistic route map.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## What it does

1. You enter **home**, **national park**, **people**, **days**, and a start date.
2. The app builds a day-by-day plan (activities, drives, suggested stays).
3. It draws a poster-style map with the driving line, overnight pins, and photo callouts.

The Arizona family demo (New York → Grand Canyon, 4 people, 7 days) follows the same shape as a Sedona → Page → South Rim loop.

Itineraries are generated from curated park knowledge in the app — no API key required. Driving lines use the public OSRM router when available.

## Share a public demo (no domain required)

GitHub Pages is enough. You do **not** need to buy a domain. After this repo is on GitHub, the site is typically:

`https://<your-github-username>.github.io/NationalParkPlanner/`

1. Create a **public** GitHub repo named `NationalParkPlanner` and push `main`.
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` builds and publishes on every push to `main`.

A custom domain (parkpath.com, etc.) is optional later, under the same Pages settings.

### OpenAI key stays private

Do **not** put `OPENAI_API_KEY` in the frontend, in GitHub Pages, or in a `VITE_` env var. Those all end up in the browser.

- **This laptop:** copy `.env.example` to `.env` and add the key. Vite’s `/api/estimate-cost` plugin reads it on the server only.
- **GitHub Pages:** there is no server, so the cost card uses the built-in price heuristic. The itinerary and map still work.

If you later want live OpenAI costs on a public URL, use a host with a backend (Vercel, Netlify, or similar) and keep the key as a **server secret**, never in client JavaScript.

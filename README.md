# Rimfold — National Park Trip Planner

MVP website that turns a few trip details into a daily itinerary and an artistic route map. Named for the Grand Canyon rim and the folded poster from the first family trip.

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

Itineraries come from curated park knowledge in the app. Cost is a ballpark from typical US prices, not a live quote. Driving lines use the public OSRM router when available. No API keys are required.

## Share a public demo (no domain required)

GitHub Pages is enough. You do **not** need to buy a domain. After this repo is on GitHub, the site is typically:

`https://<your-github-username>.github.io/NationalParkPlanner/`

1. Create a **public** GitHub repo named `NationalParkPlanner` and push `main`.
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` builds and publishes on every push to `main`.

A custom domain is optional later, under the same Pages settings.

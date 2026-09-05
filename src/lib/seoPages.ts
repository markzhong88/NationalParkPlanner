import {
  CLASSIC_TRIPS,
  classicOutline,
  classicTripBySlug,
  classicTripCards,
  type ClassicOutline,
  type ClassicTrip,
} from "../data/classicTrips";

const FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Oswald:wght@500;600&display=swap";

const GA = `G-QJC93RLB29`;

export function matchClassicPath(urlPath: string): string | null {
  const path =
    urlPath
      .split("?")[0]
      .replace(/\/index\.html$/, "")
      .replace(/\/$/, "") || "/";
  if (path === "/trips") return renderClassicHub();
  const match = path.match(/^\/trips\/([^/]+)$/);
  if (!match) return null;
  const trip = classicTripBySlug(match[1]);
  if (!trip) return null;
  return renderClassicTripPage(trip);
}

export function renderClassicHub(): string {
  const cards = classicTripCards();
  return layout({
    path: "/trips/",
    title: "Classic national park trips — Rimfold",
    description:
      "Curated 7-day road trips for Grand Canyon, Zion, Yellowstone, Yosemite, and Great Smoky Mountains, plus an 8-day Zion and Grand Canyon loop. Daily plans and a map.",
    jsonLd: hubJsonLd(),
    body: `
      <p class="kicker">Classic trips</p>
      <h1>Classic loops people actually drive.</h1>
      <p class="lede">Seven-day loops for Grand Canyon, Zion, Yellowstone, Yosemite, and the Smokies — plus one 8-day Zion and Grand Canyon drive. Overnight towns, a sane daily pace, and a map you can open and print.</p>
      <ul class="cards">
        ${cards
          .map(
            ({ trip, parkName, blurb, photos }) => `
          <li>
            <a class="card" href="${esc(`/trips/${trip.slug}/`)}">
              ${
                photos.length
                  ? `<div class="card-media${photos.length > 1 ? " pair" : ""}">${photos
                      .map(
                        (photo) =>
                          `<img src="${esc(photo.src)}" alt="${esc(photo.alt)}" width="640" height="360">`,
                      )
                      .join("")}</div>`
                  : ""
              }
              <div class="card-body">
                <p class="card-kicker">${esc(trip.days + "-day loop")}</p>
                <h2>${esc(trip.title)}</h2>
                <p>${esc(parkName)} · from ${esc(trip.home)}</p>
                <p class="card-blurb">${esc(blurb)}</p>
              </div>
            </a>
          </li>`,
          )
          .join("")}
      </ul>
      <p class="foot-link"><a href="/">Or plan a different park from home →</a></p>
    `,
  });
}

export function renderClassicTripPage(trip: ClassicTrip): string {
  const outline = classicOutline(trip);
  if (!outline) return renderClassicHub();
  return layout({
    path: `/trips/${trip.slug}/`,
    title: `${trip.title} — Rimfold`,
    description: trip.description,
    jsonLd: tripJsonLd(outline),
    body: tripBody(outline),
  });
}

export function renderSitemap(origin: string): string {
  const urls = ["/", "/trips/", ...CLASSIC_TRIPS.map((trip) => `/trips/${trip.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (path) => `  <url>
    <loc>${origin}${path}</loc>
    <changefreq>weekly</changefreq>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
}

export function renderRobots(origin: string): string {
  return `User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml
`;
}

function tripBody(outline: ClassicOutline): string {
  const { trip, park, days, stops, photos, plannerHref } = outline;
  const bbox = mapBbox(stops.length ? stops.map((s) => s.coord) : [park.coord]);
  const marker = stops[0] ?? { coord: park.coord, name: park.shortName };
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker.coord.lat}%2C${marker.coord.lng}`;
  return `
    <nav class="crumbs"><a href="/trips/">Classic trips</a> / ${esc(park.shortName)}</nav>
    <p class="kicker">${esc(trip.days + " days")} · from ${esc(trip.home)}</p>
    <h1>${esc(trip.title)}</h1>
    <p class="lede">${esc(trip.description)}</p>
    <p class="cta-row">
      <a class="btn" href="${esc(plannerHref)}">Open this trip with the map</a>
      <a class="btn-quiet" href="/">Plan a different park</a>
    </p>
    <figure class="map">
      <iframe title="Map of ${esc(park.shortName)} overnight towns" src="${mapSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <figcaption>Overnight bases: ${esc(stops.map((s) => s.name).join(" · ") || park.shortName)}. Open the live trip for the driving line and photo cards.</figcaption>
    </figure>
    ${
      photos.length
        ? `<ul class="photos">${photos
            .map(
              (photo) =>
                `<li><img src="${esc(photo.src)}" alt="${esc(photo.name)}" width="320" height="200"><span>${esc(photo.name)}</span></li>`,
            )
            .join("")}</ul>`
        : ""
    }
    <h2>The days</h2>
    <ol class="days">
      ${days
        .map(
          (day) => `
        <li>
          <p class="day-num">${String(day.day).padStart(2, "0")}</p>
          <div>
            <h3>${esc(day.title)}</h3>
            <ul>${day.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            <p class="stay">${esc(day.stay)}</p>
          </div>
        </li>`,
        )
        .join("")}
    </ol>
    <p class="note">Stays are a base, not a booking. Open the trip to download a poster, adjust days, or add a nearby park.</p>
    <p class="cta-row"><a class="btn" href="${esc(plannerHref)}">Open this trip with the map</a></p>
  `;
}

function hubJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Classic national park trips",
    itemListElement: CLASSIC_TRIPS.map((trip, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: trip.title,
      url: `https://rimfold.com/trips/${trip.slug}/`,
    })),
  });
}

function tripJsonLd(outline: ClassicOutline): string {
  const { trip, park, days } = outline;
  const data = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: trip.title,
    description: trip.description,
    touristType: "Family",
    itinerary: days.map((day) => ({
      "@type": "TouristAttraction",
      name: `Day ${day.day}: ${day.title}`,
      description: day.items.join(". "),
    })),
    provider: {
      "@type": "Organization",
      name: "Rimfold",
      url: "https://rimfold.com/",
    },
    url: `https://rimfold.com/trips/${trip.slug}/`,
    about: park.name,
  };
  return JSON.stringify(data);
}

function mapBbox(coords: { lng: number; lat: number }[]): string {
  const lngs = coords.map((c) => c.lng);
  const lats = coords.map((c) => c.lat);
  const padLng = Math.max(0.45, (Math.max(...lngs) - Math.min(...lngs)) * 0.35 + 0.35);
  const padLat = Math.max(0.3, (Math.max(...lats) - Math.min(...lats)) * 0.35 + 0.25);
  const minLng = Math.min(...lngs) - padLng;
  const minLat = Math.min(...lats) - padLat;
  const maxLng = Math.max(...lngs) + padLng;
  const maxLat = Math.max(...lats) + padLat;
  return [minLng, minLat, maxLng, maxLat].map((n) => n.toFixed(4)).join("%2C");
}

function layout(opts: {
  path: string;
  title: string;
  description: string;
  body: string;
  jsonLd?: string;
}): string {
  const canonical = `https://rimfold.com${opts.path}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", "${GA}");
  </script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="sitemap" type="application/xml" href="https://rimfold.com/sitemap.xml" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(opts.title)}" />
  <meta property="og:description" content="${esc(opts.description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="https://rimfold.com/photos/hero-canyon.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONTS}" rel="stylesheet" />
  ${opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : ""}
  <style>${pageCss()}</style>
</head>
<body>
  <header class="top">
    <a class="brand" href="/">RIMFOLD</a>
    <a class="top-link" href="/trips/">Classic trips</a>
  </header>
  <main>${opts.body}</main>
  <footer class="site-foot">
    <p>Rimfold turns a park, a home city, and a few days into a daily plan you can print. Stays are a base, not a booking.</p>
    <p><a href="/">Plan a trip</a> · <a href="/trips/">Classic trips</a> · rimfold.com</p>
  </footer>
</body>
</html>
`;
}

function pageCss(): string {
  return `
    :root { --paper:#f3ede0; --ink:#1a2332; --soft:#3d4a5c; --pine:#1f3a2e; --gold:#c4a574; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.5 "DM Sans", system-ui, sans-serif; }
    a { color:var(--pine); }
    .top { display:flex; justify-content:space-between; align-items:center; max-width:920px; margin:0 auto; padding:22px 24px 0; }
    .brand { font-family:Oswald,sans-serif; letter-spacing:.32em; font-size:13px; text-decoration:none; color:var(--gold); }
    .top-link { font-size:13px; color:var(--pine); }
    main { max-width:920px; margin:0 auto; padding:28px 24px 64px; }
    .kicker, .card-kicker, .crumbs { font-family:Oswald,sans-serif; letter-spacing:.18em; text-transform:uppercase; font-size:12px; color:var(--gold); }
    .crumbs { margin-bottom:18px; }
    .crumbs a { color:var(--gold); }
    h1 { font-family:Fraunces,Georgia,serif; font-size:clamp(32px,5vw,48px); line-height:1.1; font-weight:600; margin:8px 0 0; color:var(--pine); }
    h2 { font-family:Fraunces,Georgia,serif; font-size:28px; margin:40px 0 16px; color:var(--pine); }
    .lede { max-width:640px; font-size:17px; color:var(--soft); }
    .cta-row { display:flex; flex-wrap:wrap; gap:12px; margin:22px 0 28px; align-items:center; }
    .btn { display:inline-block; background:var(--pine); color:#f4efe4; text-decoration:none; padding:12px 18px; border-radius:999px; font-weight:600; font-size:14px; }
    .btn-quiet { font-size:14px; }
    .map { margin:0; border:1px solid rgba(31,58,46,.18); background:rgba(196,165,116,.2); padding:7px; }
    .map iframe { display:block; width:100%; height:320px; border:0; background:#e7dcc8; }
    .map figcaption { margin:8px 2px 0; font-size:13px; color:var(--soft); }
    .photos { list-style:none; display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; padding:0; margin:22px 0 0; }
    .photos li { margin:0; }
    .photos img { width:100%; height:96px; object-fit:cover; display:block; background:#e7dcc8; }
    .photos span { display:block; margin-top:4px; font-size:12px; color:var(--soft); }
    .days { list-style:none; padding:0; margin:0; display:grid; gap:22px; }
    .days > li { display:grid; grid-template-columns:52px 1fr; gap:12px; padding-left:12px; border-left:3px solid var(--gold); }
    .day-num { font-family:Oswald,sans-serif; font-size:22px; color:var(--pine); margin:0; }
    .days h3 { margin:0; font-size:18px; }
    .days ul { margin:8px 0 0; padding:0 0 0 18px; color:var(--soft); }
    .stay { margin:8px 0 0; font-size:13px; color:rgba(26,35,50,.55); }
    .note { color:var(--soft); font-size:14px; }
    .cards { list-style:none; padding:0; display:grid; gap:16px; }
    @media (min-width:720px) { .cards { grid-template-columns:1fr 1fr; } }
    .card { display:block; text-decoration:none; color:inherit; background:#fff; border-radius:16px; border:1px solid rgba(26,35,50,.08); overflow:hidden; min-height:100%; }
    .card-media { position:relative; height:168px; background:#e7dcc8; overflow:hidden; }
    .card-media.pair { display:grid; grid-template-columns:1fr 1fr; }
    .card-media img { width:100%; height:168px; object-fit:cover; display:block; transition:transform .35s ease; }
    .card:hover .card-media img { transform:scale(1.04); }
    .card-body { padding:16px 18px 18px; }
    .card h2 { font-family:Fraunces,Georgia,serif; font-size:22px; margin:8px 0 6px; }
    .card-blurb { color:var(--soft); font-size:14px; margin-bottom:0; }
    .foot-link { margin-top:28px; }
    .site-foot { max-width:920px; margin:0 auto; padding:0 24px 40px; color:var(--soft); font-size:13px; }
  `;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { CLASSIC_TRIPS };

import {
  CLASSIC_TRIPS,
  classicOutline,
  classicTripBySlug,
  classicTripCards,
  type ClassicOutline,
  type ClassicTrip,
} from "../data/classicTrips";
import { getPark, PARKS_BY_POPULARITY } from "../data/parks";
import {
  allParkDaysGuides,
  parkDaysGuide,
  type LengthPlan,
  type ParkDaysGuide,
} from "./howManyDays";
import {
  allParkPairGuides,
  parkPairGuide,
  parksThatPair,
  uniqueTwoParkLoops,
  type ParkPairGuide,
  type TwoParkLoop,
} from "./twoParkLoops";

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
  const tripMatch = path.match(/^\/trips\/([^/]+)$/);
  if (tripMatch) {
    const trip = classicTripBySlug(tripMatch[1]);
    if (!trip) return null;
    return renderClassicTripPage(trip);
  }
  if (path === "/days") return renderDaysHub();
  const daysMatch = path.match(/^\/days\/([^/]+)$/);
  if (daysMatch) {
    const page = renderDaysParkPage(daysMatch[1]);
    return page ?? renderDaysHub();
  }
  if (path === "/together") return renderTogetherHub();
  const togetherMatch = path.match(/^\/together\/([^/]+)$/);
  if (togetherMatch) {
    const page = renderTogetherParkPage(togetherMatch[1]);
    return page ?? renderTogetherHub();
  }
  return null;
}

export function renderClassicHub(): string {
  const cards = classicTripCards();
  const onePark = cards.filter(({ trip }) => !trip.alsoParkId);
  const twoPark = cards.filter(({ trip }) => trip.alsoParkId);
  return layout({
    path: "/trips/",
    title: "National park road trips — Rimfold",
    description:
      "Plan a national park road trip with a day-by-day itinerary, overnight towns, and a printable map. Classic one-park weeks plus two-park loops: Zion and Grand Canyon, Yellowstone and Grand Teton, Yosemite and Sequoia.",
    jsonLd: hubJsonLd(),
    body: `
      <p class="kicker">National park road trips</p>
      <h1>National park road trips you can actually drive.</h1>
      <p class="lede">A national park road trip should have overnight towns, a sane daily pace, and a map you can fold. Start with one park for a week, or pick two that share a real drive — not a 12-hour interstate.</p>
      <p class="lede">Each itinerary starts from a gateway city. Open one for the days and the map, or generate a trip from your own home.</p>
      <h2>One park, a full week</h2>
      <ul class="cards">
        ${onePark.map((card) => classicCard(card)).join("")}
      </ul>
      <h2>Two parks, one drive</h2>
      <ul class="cards">
        ${twoPark.map((card) => classicCard(card)).join("")}
      </ul>
      <p class="cta-row">
        <a class="btn" href="/together/">Which parks can I combine?</a>
      </p>
      <p class="cta-row">
        <a class="btn" href="/">Plan a national park road trip from home</a>
        <a class="btn-quiet" href="/days/">How many days do you need?</a>
      </p>
      <p class="foot-link"><a href="/">Or pick a different park and days →</a></p>
    `,
  });
}

function classicCard({
  trip,
  parkName,
  blurb,
  photos,
}: ReturnType<typeof classicTripCards>[number]): string {
  return `
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
          </li>`;
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
  const urls = [
    "/",
    "/trips/",
    "/days/",
    "/together/",
    ...CLASSIC_TRIPS.map((trip) => `/trips/${trip.slug}/`),
    ...PARKS_BY_POPULARITY.map((park) => `/days/${park.id}/`),
    ...parksThatPair().map((park) => `/together/${park.id}/`),
  ];
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

const FEATURED_DAYS_PARKS = [
  "grand-canyon",
  "zion",
  "glacier",
  "yellowstone",
  "yosemite",
  "great-smoky",
];

export function renderDaysHub(): string {
  const guides = allParkDaysGuides();
  const featured = FEATURED_DAYS_PARKS.map((id) => guides.find((g) => g.park.id === id)).filter(
    (g): g is ParkDaysGuide => Boolean(g),
  );
  return layout({
    path: "/days/",
    title: "How many days in a national park? — Rimfold",
    description:
      "See whether you need 3, 5, or 7 days in a national park. Overnight towns and a sane daily pace for Grand Canyon, Zion, Glacier, Yellowstone, and more — then open the trip as a printable plan.",
    jsonLd: daysHubJsonLd(guides),
    body: `
      <p class="kicker">How many days</p>
      <h1>How many days do you need?</h1>
      <p class="lede">Not a packing contest. Three days stays in one town. Five or seven nights add the next overnight on the same loop we use for the poster. Pick a park, compare 3 / 5 / 7, then open it as a trip.</p>
      <h2>Start with a classic</h2>
      <ul class="cards">
        ${featured
          .map((guide) => {
            const photo = guide.park.landmarks.find((lm) => lm.photo);
            const rec = guide.options.find((o) => o.days === guide.recommended) ?? guide.options[0];
            return `
          <li>
            <a class="card" href="${esc(`/days/${guide.park.id}/`)}">
              ${
                photo?.photo
                  ? `<div class="card-media"><img src="${esc(photo.photo)}" alt="${esc(photo.name)}" width="640" height="360"></div>`
                  : ""
              }
              <div class="card-body">
                <p class="card-kicker">${esc(guide.recommended + " days is the sane loop")}</p>
                <h2>${esc(guide.park.shortName)}</h2>
                <p>${esc(guide.park.state)} · from ${esc(guide.home)}</p>
                <p class="card-blurb">${esc(rec ? `Nights in ${rec.nights.join(" · ") || guide.park.shortName}.` : guide.park.blurb)}</p>
              </div>
            </a>
          </li>`;
          })
          .join("")}
      </ul>
      <h2>Every park we plan</h2>
      <ul class="park-index">
        ${guides
          .map(
            (guide) => `
          <li>
            <a href="${esc(`/days/${guide.park.id}/`)}">
              <span>${esc(guide.park.shortName)}</span>
              <span>${esc(guide.recommended + " days · " + guide.home.split(",")[0])}</span>
            </a>
          </li>`,
          )
          .join("")}
      </ul>
      <p class="cta-row"><a class="btn" href="/">Or generate a trip from home</a></p>
    `,
  });
}

export function renderDaysParkPage(parkId: string): string | null {
  const guide = parkDaysGuide(parkId);
  if (!guide) return null;
  const rec = guide.options.find((o) => o.days === guide.recommended) ?? guide.options[0];
  const longest = guide.options[guide.options.length - 1];
  return layout({
    path: `/days/${guide.park.id}/`,
    title: `How many days in ${guide.park.name}? — Rimfold`,
    description: daysParkDescription(guide, rec),
    jsonLd: daysParkJsonLd(guide, rec),
    body: `
      <nav class="crumbs"><a href="/days/">How many days</a> / ${esc(guide.park.shortName)}</nav>
      <p class="kicker">${esc(guide.park.state)} · from ${esc(guide.home)}</p>
      <h1>How many days in ${esc(guide.park.name)}?</h1>
      <p class="lede">${esc(daysParkLede(guide, rec))}</p>
      <label class="jump">
        <span>Park</span>
        <select onchange="location.href='/days/'+this.value+'/'">
          ${PARKS_BY_POPULARITY.map(
            (park) =>
              `<option value="${esc(park.id)}"${park.id === guide.park.id ? " selected" : ""}>${esc(park.shortName)} — ${esc(park.state)}</option>`,
          ).join("")}
        </select>
      </label>
      <div class="compare">
        ${guide.options.map((plan) => lengthCard(plan, guide, longest)).join("")}
      </div>
      <p class="note">Last day is the drive (or flight) home. Stays are a base, not a booking. Open a length to see the map and print the plan.</p>
      <p class="cta-row">
        <a class="btn" href="${esc(rec.plannerHref)}">Open the ${esc(String(guide.recommended))}-day trip</a>
        <a class="btn-quiet" href="/trips/">Classic road trips</a>
      </p>
    `,
  });
}

function daysParkDescription(guide: ParkDaysGuide, rec: LengthPlan): string {
  const towns = rec.nights.join(", ") || guide.park.shortName;
  return `How many days in ${guide.park.shortName}? ${guide.recommended} days is the sane loop from ${guide.home}: nights in ${towns}. Compare 3, 5, and 7 day itineraries, then open a printable plan.`;
}

function daysParkLede(guide: ParkDaysGuide, rec: LengthPlan): string {
  const towns = rec.nights.length ? rec.nights.join(" and ") : guide.park.shortName;
  return `${guide.recommended} days from ${guide.home.split(",")[0]} is the loop that hits ${towns} without stuffing extra mornings. Three days keeps you in fewer towns. Seven days uses the full set of overnights on this park.`;
}

function lengthCard(plan: LengthPlan, guide: ParkDaysGuide, longest: LengthPlan): string {
  const best = plan.days === guide.recommended;
  const missing = longest.nights.filter((name) => !plan.nights.includes(name));
  const extra =
    missing.length && plan.days !== longest.days
      ? `${missing.join(" and ")} ${missing.length === 1 ? "shows" : "show"} up at ${plan.days === 3 ? "5+" : "7"} days.`
      : "";
  return `
    <article class="compare-card${best ? " is-best" : ""}">
      ${best ? `<p class="card-kicker">Sane loop</p>` : `<p class="card-kicker">${esc(plan.days + " days")}</p>`}
      <h2>${esc(String(plan.days))} days</h2>
      <p class="towns">${esc(plan.nights.length ? `Nights in ${plan.nights.join(" · ")}.` : "Overnight near the park.")}</p>
      ${extra ? `<p class="card-blurb">${esc(extra)}</p>` : ""}
      <ol class="mini-days">
        ${plan.titles
          .map(
            (day) =>
              `<li><span>${esc(String(day.day))}</span><strong>${esc(day.title)}</strong></li>`,
          )
          .join("")}
      </ol>
      <a class="btn" href="${esc(plan.plannerHref)}">Open this ${esc(String(plan.days))}-day trip</a>
    </article>`;
}

function daysHubJsonLd(guides: ParkDaysGuide[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "How many days in a national park",
    itemListElement: guides.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `How many days in ${guide.park.name}?`,
      url: `https://rimfold.com/days/${guide.park.id}/`,
    })),
  });
}

function daysParkJsonLd(guide: ParkDaysGuide, rec: LengthPlan): string {
  const name = guide.park.name;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How many days in ${name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${guide.recommended} days from ${guide.home} is the sane loop, with nights in ${rec.nights.join(", ") || name}. Last day is the trip home.`,
        },
      },
      {
        "@type": "Question",
        name: `Is 3 days enough for ${name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Three days from ${guide.home.split(",")[0]} keeps you in ${
            guide.options[0]?.nights.join(" and ") || "one overnight town"
          }. It is a taste, not the full loop.`,
        },
      },
      {
        "@type": "Question",
        name: `What do you do with 7 days in ${name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Seven days uses the overnight towns on this park’s Rimfold loop: ${
            guide.options[guide.options.length - 1]?.nights.join(", ") || name
          }. Extra days slow the pace rather than invent a new route.`,
        },
      },
    ],
  });
}

export function renderTogetherHub(): string {
  const loops = uniqueTwoParkLoops();
  const guides = allParkPairGuides();
  return layout({
    path: "/together/",
    title: "Two national parks on one trip — Rimfold",
    description:
      "Which national parks can you visit on the same road trip? Zion and Grand Canyon, Yellowstone and Grand Teton, Yosemite and Sequoia — pairs that share a real drive, with days and overnight towns.",
    jsonLd: togetherHubJsonLd(loops),
    body: `
      <p class="kicker">Two parks, one drive</p>
      <h1>Can you visit two national parks on one trip?</h1>
      <p class="lede">Yes — if they share a drive you would actually do between breakfast and dinner. Zion to the Grand Canyon is 4.5 hours. Jackson to Old Faithful is not a weekend add-on to Yosemite. Pick a pair, see the overnight towns, then open the loop.</p>
      <h2>Classic two-park loops</h2>
      <ul class="cards">
        ${loops
          .filter((loop) => loop.classic)
          .map((loop) => togetherCard(loop))
          .join("")}
      </ul>
      <h2>Every pair we will route</h2>
      <ul class="park-index">
        ${guides
          .map(
            (guide) => `
          <li>
            <a href="${esc(`/together/${guide.park.id}/`)}">
              <span>${esc(guide.park.shortName)}</span>
              <span>${esc(togetherIndexLabel(guide))}</span>
            </a>
          </li>`,
          )
          .join("")}
      </ul>
      <h2>Common questions</h2>
      <div class="faq">
        <h3>Can I do Zion and Grand Canyon in one trip?</h3>
        <p>Yes. It is a 4.5-hour drive. Budget 8 days from Las Vegas so Zion (and Bryce) and the South Rim each get real mornings. <a href="/trips/zion-grand-canyon-8-day/">Open the 8-day loop</a>.</p>
        <h3>Yellowstone and Grand Teton?</h3>
        <p>Those two are the easiest pair in the system — about 2.5 hours. A week from Bozeman covers Old Faithful, then Jenny Lake. <a href="/trips/yellowstone-grand-teton-7-day/">Open the 7-day loop</a>.</p>
        <h3>What about the Mighty 5 in one week?</h3>
        <p>Don’t. Five Utah parks is a windshield tour. Pick two that share a drive — Zion and Bryce, or Arches and Capitol Reef — and leave the rest for the next trip.</p>
        <h3>Glacier and Yellowstone?</h3>
        <p>That is a long interstate, not a same-loop drive. We will not stitch them. Do Glacier from Kalispell, or Yellowstone from Bozeman or Jackson.</p>
      </div>
      <p class="cta-row">
        <a class="btn" href="/">Generate a two-park trip from home</a>
        <a class="btn-quiet" href="/trips/">All classic trips</a>
      </p>
    `,
  });
}

export function renderTogetherParkPage(parkId: string): string | null {
  const guide = parkPairGuide(parkId);
  if (!guide) return null;
  const pairParks = parksThatPair();
  return layout({
    path: `/together/${guide.park.id}/`,
    title: `Parks to combine with ${guide.park.shortName} — Rimfold`,
    description: togetherParkDescription(guide),
    jsonLd: togetherParkJsonLd(guide),
    body: `
      <nav class="crumbs"><a href="/together/">Two parks</a> / ${esc(guide.park.shortName)}</nav>
      <p class="kicker">${esc(guide.park.state)}</p>
      <h1>What can you add to ${esc(guide.park.shortName)}?</h1>
      <p class="lede">${esc(togetherParkLede(guide))}</p>
      <label class="jump">
        <span>Park</span>
        <select onchange="location.href='/together/'+this.value+'/'">
          ${pairParks
            .map(
              (park) =>
                `<option value="${esc(park.id)}"${park.id === guide.park.id ? " selected" : ""}>${esc(park.shortName)} — ${esc(park.state)}</option>`,
            )
            .join("")}
        </select>
      </label>
      ${
        guide.bakedIn
          ? `<p class="note">${esc(guide.bakedIn)} That is already on the one-park loop — not a second park to add.</p>`
          : ""
      }
      ${
        guide.loops.length
          ? `<div class="compare pairs">${guide.loops.map((loop) => pairLengthCard(loop, guide.park.id)).join("")}</div>`
          : `<p class="note">We do not add a second national park to this loop. Stay with ${esc(guide.park.shortName)}.</p>`
      }
      <p class="cta-row">
        <a class="btn" href="${esc(`/?park=${guide.park.id}`)}">Plan ${esc(guide.park.shortName)} from home</a>
        <a class="btn-quiet" href="/trips/">Classic two-park trips</a>
      </p>
    `,
  });
}

function togetherCard(loop: TwoParkLoop): string {
  const photoA = loop.park.landmarks.find((lm) => lm.photo);
  const photoB = loop.extra.landmarks.find((lm) => lm.photo);
  const href = loop.classic ? `/trips/${loop.classic.slug}/` : `/together/${loop.parkId}/`;
  return `
          <li>
            <a class="card" href="${esc(href)}">
              ${
                photoA?.photo && photoB?.photo
                  ? `<div class="card-media pair"><img src="${esc(photoA.photo)}" alt="${esc(photoA.name)}" width="640" height="360"><img src="${esc(photoB.photo)}" alt="${esc(photoB.name)}" width="640" height="360"></div>`
                  : photoA?.photo
                    ? `<div class="card-media"><img src="${esc(photoA.photo)}" alt="${esc(photoA.name)}" width="640" height="360"></div>`
                    : ""
              }
              <div class="card-body">
                <p class="card-kicker">${esc(loop.days + " days · " + loop.driveLabel)}</p>
                <h2>${esc(loop.park.shortName)} &amp; ${esc(loop.extra.shortName)}</h2>
                <p>from ${esc(loop.home)}</p>
                <p class="card-blurb">${esc(loop.nights.length ? `Nights in ${loop.nights.join(" · ")}.` : loop.park.blurb)}</p>
              </div>
            </a>
          </li>`;
}

function otherPark(loop: TwoParkLoop, parkId: string) {
  return loop.parkId === parkId ? loop.extra : loop.park;
}

function pairLengthCard(loop: TwoParkLoop, fromParkId: string): string {
  const leftPark = getPark(fromParkId) ?? loop.park;
  const right = otherPark(loop, fromParkId);
  const href = loop.classic ? `/trips/${loop.classic.slug}/` : loop.plannerHref;
  const cta = loop.classic ? "Open this classic loop" : `Open this ${loop.days}-day trip`;
  return `
    <article class="compare-card is-best">
      <p class="card-kicker">${esc(loop.driveLabel)}</p>
      <h2>${esc(leftPark.shortName)} &amp; ${esc(right.shortName)}</h2>
      <p class="towns">${esc(`${loop.days} days from ${loop.home}. Nights in ${loop.nights.join(" · ") || "the two parks"}.`)}</p>
      <ol class="mini-days">
        ${loop.titles
          .map(
            (day) =>
              `<li><span>${esc(String(day.day))}</span><strong>${esc(day.title)}</strong></li>`,
          )
          .join("")}
      </ol>
      <a class="btn" href="${esc(href)}">${esc(cta)}</a>
    </article>`;
}

function togetherIndexLabel(guide: ParkPairGuide): string {
  if (guide.loops.length) {
    return guide.loops.map((loop) => otherPark(loop, guide.park.id).shortName).join(" · ");
  }
  return "Already a full loop";
}

function togetherParkDescription(guide: ParkPairGuide): string {
  if (guide.loops[0]) {
    const loop = guide.loops[0];
    const extra = otherPark(loop, guide.park.id);
    return `Can you add a second park to ${guide.park.shortName}? ${extra.shortName} is a ${loop.driveLabel} — ${loop.days} days from ${loop.home}. Compare pairs, then open a printable plan.`;
  }
  return `${guide.park.shortName} is already a full Rimfold loop. ${guide.bakedIn ?? "We do not stitch on a distant second park."}`;
}

function togetherParkLede(guide: ParkPairGuide): string {
  if (guide.loops.length === 1) {
    const loop = guide.loops[0];
    const extra = otherPark(loop, guide.park.id);
    return `${extra.shortName} is the add-on that shares a ${loop.driveLabel} with ${guide.park.shortName}. Budget ${loop.days} days from ${loop.home.split(",")[0]}.`;
  }
  if (guide.loops.length > 1) {
    const names = guide.loops.map((loop) => otherPark(loop, guide.park.id).shortName).join(" or ");
    return `You can add ${names} — only parks on the same drive, not a wish list.`;
  }
  return guide.bakedIn ?? `${guide.park.shortName} stays a one-park trip on Rimfold.`;
}

function togetherHubJsonLd(loops: TwoParkLoop[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can you visit two national parks on one trip?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, if they share a drive you would actually do in a day. Rimfold only pairs parks like Zion and Grand Canyon (4.5 hours) or Yellowstone and Grand Teton (2.5 hours).",
        },
      },
      {
        "@type": "Question",
        name: "How many days for two national parks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Usually 6 to 8 days. One park is a 5-day taste. Two parks need extra mornings so you are not driving every afternoon.",
        },
      },
      {
        "@type": "Question",
        name: "Can I do Zion and Grand Canyon together?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. An 8-day loop from Las Vegas covers Zion Canyon, a Bryce side trip, and the Grand Canyon South Rim.",
        },
      },
    ],
    name: "Two national parks on one trip",
    url: "https://rimfold.com/together/",
    about: loops.map((loop) => ({
      "@type": "TouristTrip",
      name: `${loop.park.shortName} and ${loop.extra.shortName}`,
      url: loop.classic
        ? `https://rimfold.com/trips/${loop.classic.slug}/`
        : `https://rimfold.com/together/${loop.parkId}/`,
    })),
  });
}

function togetherParkJsonLd(guide: ParkPairGuide): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Parks to combine with ${guide.park.name}`,
    itemListElement: guide.loops.map((loop, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${guide.park.shortName} and ${otherPark(loop, guide.park.id).shortName}`,
      url: loop.classic
        ? `https://rimfold.com/trips/${loop.classic.slug}/`
        : `https://rimfold.com/together/${loop.parkId}/`,
    })),
  });
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
    name: "National park road trips",
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
  <script src="https://analytics.ahrefs.com/analytics.js" data-key="9/Dz6lvvNsgH5rTRNFNqMg" async></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="sitemap" type="application/xml" href="https://rimfold.com/sitemap.xml" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(opts.title)}" />
  <meta property="og:description" content="${esc(opts.description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:site_name" content="Rimfold" />
  <meta property="og:image" content="https://rimfold.com/og.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Rimfold national park trip planner. Tell us the park. We'll draw the trip." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(opts.title)}" />
  <meta name="twitter:description" content="${esc(opts.description)}" />
  <meta name="twitter:image" content="https://rimfold.com/og.jpg" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="theme-color" content="#1F3A2E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONTS}" rel="stylesheet" />
  ${opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : ""}
  <style>${pageCss()}</style>
</head>
<body>
  <header class="top">
    <a class="brand" href="/"><img src="/favicon.svg" width="22" height="22" alt="">RIMFOLD</a>
    <nav class="top-nav">
      <a class="top-link" href="/trips/">Classic trips</a>
      <a class="top-link" href="/days/">How many days</a>
      <a class="top-link" href="/together/">Two parks</a>
    </nav>
  </header>
  <main>${opts.body}</main>
  <footer class="site-foot">
    <p>Rimfold turns a park, a home city, and a few days into a daily plan you can print. Stays are a base, not a booking.</p>
    <p><a href="/">Plan a trip</a> · <a href="/trips/">Classic trips</a> · <a href="/days/">How many days</a> · <a href="/together/">Two parks</a> · rimfold.com</p>
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
    .top { display:flex; justify-content:space-between; align-items:center; max-width:1080px; margin:0 auto; padding:22px 24px 0; gap:16px; }
    .brand { display:flex; align-items:center; gap:8px; font-family:Oswald,sans-serif; letter-spacing:.32em; font-size:13px; text-decoration:none; color:var(--gold); }
    .brand img { width:22px; height:22px; }
    .top-nav { display:flex; flex-wrap:wrap; gap:14px; justify-content:flex-end; }
    .top-link { font-size:13px; color:var(--pine); }
    main { max-width:1080px; margin:0 auto; padding:28px 24px 64px; }
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
    .site-foot { max-width:1080px; margin:0 auto; padding:0 24px 40px; color:var(--soft); font-size:13px; }
    .jump { display:flex; flex-direction:column; gap:6px; max-width:320px; margin:22px 0 28px; font-size:12px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--soft); }
    .jump select { font:15px/1.4 "DM Sans", system-ui, sans-serif; padding:10px 12px; border-radius:12px; border:1px solid rgba(26,35,50,.12); background:#fff; color:var(--ink); text-transform:none; letter-spacing:0; font-weight:500; }
    .compare { display:grid; gap:16px; }
    @media (min-width:880px) { .compare { grid-template-columns:1fr 1fr 1fr; } .compare.pairs { grid-template-columns:1fr 1fr; } }
    .compare-card { background:#fff; border-radius:16px; border:1px solid rgba(26,35,50,.08); padding:18px 18px 20px; display:flex; flex-direction:column; gap:8px; }
    .compare-card.is-best { border-color:rgba(31,58,46,.45); }
    .compare-card h2 { margin:0; font-size:28px; }
    .towns { margin:0; font-size:14px; color:var(--soft); }
    .mini-days { list-style:none; padding:0; margin:10px 0 16px; display:grid; gap:8px; }
    .mini-days li { display:grid; grid-template-columns:22px 1fr; gap:8px; align-items:start; font-size:14px; }
    .mini-days span { font-family:Oswald,sans-serif; color:var(--gold); }
    .mini-days strong { font-weight:600; color:var(--ink); }
    .compare-card .btn { margin-top:auto; text-align:center; }
    .park-index { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
    @media (min-width:720px) { .park-index { grid-template-columns:1fr 1fr; } }
    .park-index a { display:flex; justify-content:space-between; gap:12px; text-decoration:none; color:inherit; background:#fff; border-radius:12px; border:1px solid rgba(26,35,50,.08); padding:12px 14px; }
    .park-index a span:last-child { color:var(--soft); font-size:13px; }
    .faq h3 { font-family:Fraunces,Georgia,serif; font-size:20px; margin:22px 0 8px; color:var(--pine); }
    .faq p { max-width:640px; color:var(--soft); margin:0; }
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

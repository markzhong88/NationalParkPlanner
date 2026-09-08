import type { RefObject } from "react";
import type { DayPlan, Landmark, TripPlan } from "../types";
import { formatDayHeading } from "../lib/format";
import { exportMapAspect } from "../lib/geo";
import { POSTER_H } from "../lib/exportPoster";

export function PrintPoster({
  plan,
  mapImage,
  sheetRef,
}: {
  plan: TripPlan;
  mapImage: string | null;
  sheetRef: RefObject<HTMLDivElement | null>;
}) {
  const dayCount = plan.days.length;
  const columns = dayCount >= 9 ? 2 : 1;
  const rows = Math.ceil(dayCount / columns);
  const strip = dayCount <= 4;
  const stack = columns === 1 && dayCount >= 6;
  const dense = columns === 2;
  const photos = posterPhotos(plan.landmarks, 3);
  const mapAspect = exportMapAspect(plan.bounds);
  const destinations = destinationLine(plan);
  const quote = dayCount <= 5 ? firstSentence(plan.styleNote) : "";
  const bookings = [plan.flightNote, plan.rentalNote].filter(Boolean).join("  ·  ");
  const how = plan.flying ? `Flying via ${plan.gateway}` : `From ${plan.homeLabel}`;
  const titleLines = posterTitleLines(prettyTitle(plan.title));
  const railW = columns > 1 ? RAIL_W_SPLIT : RAIL_W;
  const mapHeight = posterRailMapHeight(mapAspect, railW);
  const photoHeight = posterPhotoImageHeight(
    mapHeight,
    photos.length,
    titleLines.length,
    Boolean(quote),
    Boolean(bookings),
  );

  return (
    <div ref={sheetRef} className="print-poster paper-grid" aria-hidden="true">
      <div className="print-rule print-rule-top" />

      <div className="print-mast">
        <p className="print-brand-name">RIMFOLD</p>
        <p className="print-brand-url">rimfold.com</p>
      </div>

      <header className="print-head">
        <h1 className={`print-title${titleLines.length > 1 ? " is-stacked" : ""}`}>
          {titleLines.map((line) => (
            <span key={line} className="print-title-line">
              {line}
            </span>
          ))}
        </h1>
        {destinations ? <p className="print-dest">{destinations}</p> : null}
        <p className="print-meta">
          <span>{plan.dateRange}</span>
          <span className="print-dot">·</span>
          <span>{plan.travelers}</span>
          <span className="print-dot">·</span>
          <span>{plan.totalMiles} miles</span>
          <span className="print-dot">·</span>
          <span>{how}</span>
        </p>
        {quote ? <p className="print-quote">{quote}</p> : null}
        {bookings ? <p className="print-bookings">{bookings}</p> : null}
      </header>

      <div className={`print-body${columns > 1 ? " is-split" : ""}`}>
        <div className="print-days-col">
          <p className="print-days-label">The days</p>
          <div
            className={`print-days${strip ? " is-strip" : ""}${stack ? " is-stack" : ""}${dense ? " is-dense" : ""}`}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(${columns > 1 ? "min-content" : "0"}, ${columns > 1 ? "auto" : "1fr"}))`,
              gridAutoFlow: columns > 1 ? "column" : "row",
            }}
          >
            {plan.days.map((day) => (
              <PrintDayCard
                key={day.day}
                day={day}
                activityLimit={posterActivityLimit(dayCount)}
              />
            ))}
          </div>
        </div>

        <div className="print-rail">
          <div className="print-map-mat">
            <div
              data-print-map-slot
              className="print-map"
              style={{ height: mapHeight, aspectRatio: "auto" }}
            >
              {mapImage ? (
                <img data-print-map="true" src={mapImage} alt="" />
              ) : (
                <div className="print-map-fallback">Map</div>
              )}
            </div>
          </div>

          {photos.length ? (
            <div className="print-photos">
              {photos.map((lm) => (
                <figure key={lm.id} className="print-photo">
                  <img
                    data-print-photo="true"
                    className="print-photo-img"
                    src={lm.photo}
                    alt=""
                    style={{ height: photoHeight }}
                  />
                  <p data-print-photo-caption="true" className="print-photo-caption">
                    {lm.name}
                  </p>
                </figure>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="print-foot">
        <p>
          {plan.hotelNights} nights
          <span className="print-dot">·</span>
          {plan.parkName}
          <span className="print-dot">·</span>
          A printed plan, not a booking
        </p>
        <p className="print-foot-brand">RIMFOLD · rimfold.com</p>
      </footer>
    </div>
  );
}

function PrintDayCard({
  day,
  activityLimit,
}: {
  day: DayPlan;
  activityLimit: number;
}) {
  const activities = day.activities.map((item) => item.trim()).filter(Boolean).slice(0, activityLimit);

  return (
    <article className="print-day" style={{ borderLeftColor: day.color }}>
      <div className="print-day-top">
        <span className="print-day-num" style={{ color: day.color }}>
          {String(day.day).padStart(2, "0")}
        </span>
        <span className="print-day-date">{printDayKicker(day)}</span>
      </div>
      <p className="print-day-title">{day.route ?? day.title}</p>
      <ul className="print-day-list">
        {activities.map((item) => (
          <li key={item} className="print-day-item">
            {item}
          </li>
        ))}
      </ul>
      <p className="print-day-stay">{stayLine(day.stay)}</p>
    </article>
  );
}

function printDayKicker(day: DayPlan): string {
  const date = formatDayHeading(day.date);
  const drive = day.driveHours >= 1 ? day.driveLabel : "";
  return oneLine(drive ? `${date} · ${drive}` : date);
}

function oneLine(value: string): string {
  return value.replace(/ /g, "\u00a0");
}

function stayLine(stay: string): string {
  if (/overnight flight/i.test(stay) || /^home in /i.test(stay)) return stay;
  return `Overnight · ${stay}`;
}

function destinationLine(plan: TripPlan): string {
  const fromSubtitle = plan.subtitle
    .split("•")
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && part.length < 42)
    .slice(0, 6);
  if (fromSubtitle.length >= 2) return fromSubtitle.join("  ·  ");
  if (plan.highlights.length) return plan.highlights.slice(0, 5).join("  ·  ");
  return "";
}

function firstSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^.*?[.!?](?=\s|$)/);
  const sentence = (match ? match[0] : trimmed).trim();
  return sentence.length > 220 ? `${sentence.slice(0, 210).trim()}…` : sentence;
}

function posterTitleLines(pretty: string): string[] {
  for (const suffix of ["Family Road Trip", "Weekend Road Trip", "Road Trip"]) {
    const tail = ` ${suffix}`;
    if (!pretty.endsWith(tail)) continue;
    const head = pretty.slice(0, -tail.length);
    if (pretty.includes("&") || pretty.length > 42) return [head, suffix];
    return [pretty];
  }
  return [pretty];
}

function prettyTitle(value: string): string {
  return value.toLowerCase().replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

function posterActivityLimit(dayCount: number) {
  if (dayCount <= 4) return 6;
  if (dayCount <= 5) return 5;
  if (dayCount <= 7) return 4;
  if (dayCount === 8) return 3;
  return 4;
}

function posterPhotos(landmarks: Landmark[], max: number): (Landmark & { photo: string })[] {
  const withPhoto = landmarks.filter((lm): lm is Landmark & { photo: string } => Boolean(lm.photo));
  const unique: (Landmark & { photo: string })[] = [];
  for (const lm of withPhoto) {
    if (unique.some((pick) => pick.photo === lm.photo)) continue;
    unique.push(lm);
  }
  if (unique.length <= max) return unique;

  const pinned = unique.filter((lm) => POSTER_ALWAYS.has(lm.id));
  const rest = unique.filter((lm) => !POSTER_ALWAYS.has(lm.id));
  const slots = Math.max(0, max - pinned.length);
  const picks: (Landmark & { photo: string })[] = [...pinned.slice(0, max)];
  for (let i = 0; i < slots; i++) {
    const idx = Math.round((i * (rest.length - 1)) / Math.max(1, slots - 1));
    const lm = rest[idx];
    if (lm && !picks.some((pick) => pick.id === lm.id)) picks.push(lm);
  }
  return picks.slice(0, max);
}

/** Always keep these on the save-trip poster when the park has them. */
const POSTER_ALWAYS = new Set(["prismatic"]);

/** Keep in sync with `.print-body` rail width and `.print-map-mat` padding. */
const RAIL_W = 418;
const RAIL_W_SPLIT = 360;
const MAP_MAT_PAD = 7;

function posterRailMapHeight(aspect: number, railW = RAIL_W) {
  const mapW = railW - MAP_MAT_PAD * 2;
  return Math.round(mapW / Math.max(0.5, aspect));
}

function posterPhotoImageHeight(
  mapHeight: number,
  photoCount: number,
  titleLines: number,
  hasQuote: boolean,
  hasBookings = false,
) {
  if (photoCount < 1) return 0;
  const header = (hasQuote ? 196 : 164) + Math.max(0, titleLines - 1) * 64 + (hasBookings ? 24 : 0);
  const body = POSTER_H - 36 - header - 46;
  const leftover = body - (mapHeight + 14) - 10 - 8 * (photoCount - 1) - 21 * photoCount;
  return Math.max(80, Math.floor(leftover / photoCount));
}

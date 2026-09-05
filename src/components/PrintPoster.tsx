import type { RefObject } from "react";
import type { DayPlan, TripPlan } from "../types";
import { formatDayHeading } from "../lib/format";
import { exportMapAspect } from "../lib/geo";
import { POSTER_H, POSTER_W } from "../lib/exportPoster";

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
  const columns = dayCount <= 5 ? dayCount : dayCount > 8 ? 3 : 2;
  const rows = Math.ceil(dayCount / columns);
  const compact = dayCount > 6;
  const strip = dayCount <= 5;
  const mapAspect = exportMapAspect(plan.bounds);
  const mapHeight = posterMapHeight(mapAspect, dayCount, columns);
  const destinations = destinationLine(plan);
  const quote = firstSentence(plan.styleNote);
  const how = plan.flying ? `Flying via ${plan.gateway}` : `From ${plan.homeLabel}`;

  return (
    <div ref={sheetRef} className="print-poster paper-grid" aria-hidden="true">
      <div className="print-rule print-rule-top" />

      <div className="print-mast">
        <p className="print-brand-name">RIMFOLD</p>
        <p className="print-brand-url">rimfold.com</p>
      </div>

      <header className="print-head">
        <h1 className="print-title">{prettyTitle(plan.title)}</h1>
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
      </header>

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

      <p className="print-days-label">The days</p>
      <div
        className={`print-days${strip ? " is-strip" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, auto))`,
          gridAutoFlow: "column",
        }}
      >
        {plan.days.map((day) => (
          <PrintDayCard key={day.day} day={day} compact={compact} strip={strip} />
        ))}
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
  compact,
  strip,
}: {
  day: DayPlan;
  compact: boolean;
  strip: boolean;
}) {
  const limit = strip ? 4 : compact ? 3 : 4;
  const activities = day.activities.slice(0, limit);

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

function prettyTitle(value: string): string {
  return value.toLowerCase().replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

function posterMapHeight(aspect: number, dayCount: number, columns: number) {
  const innerW = POSTER_W - 56;
  const natural = innerW / Math.max(0.5, aspect);
  const rows = Math.ceil(dayCount / columns);
  const rowH = dayCount <= 5 ? 188 : dayCount > 8 ? 172 : 144;
  const header = 200;
  const footer = 46;
  const daysBlock = 24 + rows * rowH + Math.max(0, rows - 1) * 10;
  const maxH = POSTER_H - 36 - header - footer - daysBlock;
  return Math.round(Math.max(420, Math.min(natural, maxH, 720)));
}

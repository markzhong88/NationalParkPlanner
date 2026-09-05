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
  const compact = plan.days.length > 6;
  const columns = plan.days.length > 8 ? 3 : 2;
  const rows = Math.ceil(plan.days.length / columns);
  const mapAspect = exportMapAspect(plan.bounds);
  const mapHeight = posterMapHeight(mapAspect, rows, compact);

  return (
    <div ref={sheetRef} className="print-poster paper-grid" aria-hidden="true">
      <header className="print-head">
        <div className="print-head-copy">
          <h1 className="print-title">{prettyTitle(plan.title)}</h1>
          <p className="print-meta">
            {plan.dateRange}
            <span className="print-dot">·</span>
            {plan.travelers}
          </p>
        </div>
        <div className="print-brand">
          <p className="print-brand-name" style={{ color: "#1f3a2e" }}>
            RIMFOLD
          </p>
          <p className="print-brand-url">rimfold.com</p>
        </div>
      </header>

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

      <div className="print-days" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {plan.days.map((day) => (
          <PrintDayCard key={day.day} day={day} compact={compact} />
        ))}
      </div>
    </div>
  );
}

function PrintDayCard({ day, compact }: { day: DayPlan; compact: boolean }) {
  const activities = compact ? day.activities.slice(0, 4) : day.activities;

  return (
    <article className="print-day">
      <div className="print-day-top" style={{ padding: "10px 10px 0" }}>
        <span
          className="print-day-badge"
          style={{
            background: day.color,
            display: "inline-block",
            whiteSpace: "nowrap",
            minWidth: 64,
            height: 26,
            boxSizing: "border-box",
            lineHeight: "26px",
            padding: "0 10px",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#fff",
            textAlign: "center",
          }}
        >
          DAY&nbsp;{day.day}
        </span>
        <span className="print-day-date">{formatDayHeading(day.date)}</span>
      </div>
      <p className="print-day-title">{day.route ?? day.title}</p>
      <ul className="print-day-list">
        {activities.map((item) => (
          <li key={item} className="print-day-item" style={{ display: "block", lineHeight: "18px" }}>
            {item}
          </li>
        ))}
      </ul>
      <p
        className="print-day-stay"
        style={{
          background: day.color,
          display: "block",
          height: 36,
          lineHeight: "36px",
          padding: "0 12px",
          margin: 0,
          borderRadius: "0 0 8px 8px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#fff",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {day.stay}
      </p>
    </article>
  );
}

function prettyTitle(value: string): string {
  return value.toLowerCase().replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

function posterMapHeight(aspect: number, rows: number, compact: boolean) {
  const innerW = POSTER_W - 56;
  const natural = innerW / Math.max(0.5, aspect);
  const cardH = compact ? 200 : 218;
  const daysH = rows * cardH + Math.max(0, rows - 1) * 8;
  const reserved = 48 + 64 + 14 + 12;
  const maxH = POSTER_H - reserved - daysH;
  return Math.round(Math.max(280, Math.min(natural, maxH)));
}

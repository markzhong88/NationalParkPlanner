import type { RefObject } from "react";
import type { DayPlan, TripPlan } from "../types";
import { formatDayHeading } from "../lib/format";
import { exportMapAspect } from "../lib/geo";

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
  const mapAspect = exportMapAspect(plan.bounds);

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

      <div data-print-map-slot className="print-map" style={{ aspectRatio: String(mapAspect) }}>
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
      <div className="print-day-top">
        <span className="print-day-badge" style={{ background: day.color }}>
          DAY {day.day}
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
      <p className="print-day-stay" style={{ background: day.color }}>
        {day.stay}
      </p>
    </article>
  );
}

function prettyTitle(value: string): string {
  return value.toLowerCase().replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

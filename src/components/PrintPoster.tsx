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
    <div ref={sheetRef} className="print-poster paper-grid text-ink" aria-hidden="true">
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-serif text-[30px] leading-[1.05] text-pine">{prettyTitle(plan.title)}</h1>
          <p className="mt-1 text-[13.5px] leading-snug text-ink/70">
            {plan.dateRange}
            <span className="mx-1.5 text-gold">·</span>
            {plan.travelers}
            <span className="mx-1.5 text-gold">·</span>
            {plan.homeLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[13px] tracking-[0.32em] text-gold">RIMFOLD</p>
          <p className="mt-0.5 text-[11px] tracking-wide text-ink/45">rimfold.com</p>
        </div>
      </header>

      <div
        data-print-map-slot
        className="relative mt-3 w-full shrink-0 overflow-hidden rounded-xl border border-ink/12 bg-paper-deep"
        style={{ aspectRatio: String(mapAspect) }}
      >
        {mapImage ? (
          <img
            data-print-map="true"
            src={mapImage}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-ink/40">Map</div>
        )}
        <p className="pointer-events-none absolute bottom-3 left-3 font-display text-[10px] tracking-[0.28em] text-pine/70">
          RIMFOLD
        </p>
      </div>

      <div
        className="mt-3 grid min-h-0 flex-1 content-start gap-x-3 gap-y-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
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
    <article className="overflow-hidden rounded-md bg-white/80 ring-1 ring-ink/8">
      <div className="flex items-center gap-2 px-2.5 pt-[7px]">
        <span
          className="shrink-0 whitespace-nowrap rounded px-1.5 py-[3px] font-display text-[12px] leading-none tracking-wide text-white"
          style={{ background: day.color }}
        >
          DAY {day.day}
        </span>
        <span className="min-w-0 truncate whitespace-nowrap text-[13px] leading-none text-ink/60">
          {formatDayHeading(day.date)}
        </span>
      </div>
      <p className="px-2.5 pt-[5px] text-[14.5px] font-semibold leading-tight text-ink">
        {day.route ?? day.title}
      </p>
      <ul className="space-y-[3px] px-2.5 pt-[5px] pb-[6px]">
        {activities.map((item) => (
          <li key={item} className="flex gap-1.5 text-[13px] leading-[1.35] text-ink-soft">
            <span className="mt-[0.48em] h-[3.5px] w-[3.5px] shrink-0 rounded-full bg-gold/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p
        className="flex items-center gap-1.5 truncate px-2.5 py-[7px] text-[12px] font-medium leading-tight text-white"
        style={{ background: day.color }}
      >
        <BedIcon />
        <span className="truncate">{day.stay}</span>
      </p>
    </article>
  );
}

function prettyTitle(value: string): string {
  return value.toLowerCase().replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

function BedIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 11V5h2v6h12V8a3 3 0 0 0-3-3h-2v2h2a1 1 0 0 1 1 1v3H4zm-1 2h18v7h-2v-3H5v3H3v-7z" />
    </svg>
  );
}

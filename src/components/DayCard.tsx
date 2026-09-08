import type { DayPlan } from "../types";
import { formatDayHeading } from "../lib/format";

export function DayCard({
  day,
  selected,
  onSelect,
  places = [],
  editing = false,
  onChangeHeading,
  onChangeStay,
  onChangeActivities,
}: {
  day: DayPlan;
  selected: boolean;
  onSelect: () => void;
  places?: string[];
  editing?: boolean;
  onChangeHeading?: (value: string) => void;
  onChangeStay?: (value: string) => void;
  onChangeActivities?: (value: string[]) => void;
}) {
  if (editing) {
    return (
      <article
        id={`day-card-${day.day}`}
        className={`relative rounded-xl px-3 py-3 ring-1 ${
          selected ? "bg-white ring-pine/20 shadow-[0_8px_24px_rgba(26,35,50,0.08)]" : "bg-white/70 ring-ink/8"
        }`}
      >
        <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              aria-label={`Show day ${day.day} on the map`}
              className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-[13px] tracking-wide ${
                selected ? "bg-pine text-[#f4efe4]" : "bg-paper-deep text-pine"
              }`}
            >
              {day.day}
            </button>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-soft">{formatDayHeading(day.date)}</p>
            <label className="mt-1 block">
              <span className="sr-only">Day {day.day} title</span>
              <input
                value={day.route || day.title}
                onChange={(e) => onChangeHeading?.(e.target.value)}
                className="w-full rounded-lg bg-white px-2 py-1.5 text-[13.5px] font-semibold leading-snug text-ink ring-1 ring-ink/10 outline-none focus:ring-pine/30"
              />
            </label>
            <ul className="mt-2 space-y-1.5">
              {day.activities.map((item, index) => (
                <li key={`${day.day}-${index}`} className="flex gap-1.5">
                  <input
                    value={item}
                    onChange={(e) =>
                      onChangeActivities?.(
                        day.activities.map((line, i) => (i === index ? e.target.value : line)),
                      )
                    }
                    className="min-w-0 flex-1 rounded-lg bg-white px-2 py-1 text-[12px] leading-relaxed text-ink ring-1 ring-ink/10 outline-none focus:ring-pine/30"
                  />
                  <button
                    type="button"
                    aria-label={`Remove line ${index + 1}`}
                    onClick={() =>
                      onChangeActivities?.(day.activities.filter((_, i) => i !== index))
                    }
                    className="shrink-0 rounded-lg px-1.5 text-[11px] text-ink/45 transition hover:text-pine"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onChangeActivities?.([...day.activities, ""])}
              className="mt-2 text-[11px] font-medium text-pine/80 underline decoration-gold/60 underline-offset-4"
            >
              Add a line
            </button>
            {places.length > 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
                <span className="font-semibold tracking-wide text-ink/55">Places </span>
                {places.join(" · ")}
              </p>
            ) : null}
            <label className="mt-2.5 flex items-center gap-1.5">
              <BedIcon />
              <span className="sr-only">Overnight</span>
              <input
                value={day.stay}
                onChange={(e) => onChangeStay?.(e.target.value)}
                placeholder="Hotel or area"
                className="min-w-0 flex-1 rounded-lg bg-white px-2 py-1 text-[11px] text-ink/80 ring-1 ring-ink/10 outline-none focus:ring-pine/30"
              />
            </label>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      id={`day-card-${day.day}`}
      className={`relative cursor-pointer rounded-xl px-3 py-3 transition ${
        selected
          ? "bg-white shadow-[0_8px_24px_rgba(26,35,50,0.08)] ring-1 ring-pine/15"
          : "hover:bg-white/55"
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
        <div className="flex flex-col items-center">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-[13px] tracking-wide ${
              selected ? "bg-pine text-[#f4efe4]" : "bg-paper-deep text-pine"
            }`}
          >
            {day.day}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-ink-soft">{formatDayHeading(day.date)}</p>
          {day.route ? (
            <p className="mt-0.5 text-[13.5px] font-semibold leading-snug text-ink">{day.route}</p>
          ) : (
            <p className="mt-0.5 text-[13.5px] font-semibold leading-snug text-ink">{day.title}</p>
          )}
          <ul className="mt-2 space-y-1">
            {day.activities
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-gold/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {places.length > 0 ? (
            <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
              <span className="font-semibold tracking-wide text-ink/55">Places </span>
              {places.join(" · ")}
            </p>
          ) : null}
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-ink/55">
            <BedIcon />
            <span className="truncate">{day.stay}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function BedIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 11V5h2v6h12V8a3 3 0 0 0-3-3h-2v2h2a1 1 0 0 1 1 1v3H4zm-1 2h18v7h-2v-3H5v3H3v-7z" />
    </svg>
  );
}

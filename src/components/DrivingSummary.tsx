import type { DriveLeg } from "../types";

export function DrivingSummary({
  legs,
  totalMiles,
  totalKm,
  selectedDay,
}: {
  legs: DriveLeg[];
  totalMiles: number;
  totalKm: number;
  selectedDay?: number | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-paper/92 text-ink shadow-[0_12px_32px_rgba(26,35,50,0.12)] ring-1 ring-ink/10 backdrop-blur-md">
      <div className="flex items-baseline justify-between px-3.5 pt-3 pb-2">
        <p className="font-display text-[11px] tracking-[0.18em] text-gold">DRIVING</p>
        <p className="text-[11px] font-medium text-ink/50">
          {totalMiles} mi · {totalKm} km
        </p>
      </div>
      <ul className="px-1.5 pb-2">
        {legs.map((leg) => {
          const on = selectedDay === leg.day;
          return (
            <li
              key={leg.day}
              className={`flex items-baseline gap-2 rounded-lg px-2 py-1.5 text-[11.5px] ${
                on ? "bg-white text-ink" : "text-ink/70"
              }`}
            >
              <span className={`w-7 shrink-0 font-display tracking-wide ${on ? "text-pine" : "text-ink/40"}`}>
                D{leg.day}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {leg.from} → {leg.to}
              </span>
              <span className="shrink-0 font-medium">{leg.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

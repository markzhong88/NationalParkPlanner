import { useEffect, useState } from "react";
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
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <details
      className="driving-card overflow-hidden rounded-xl bg-paper/92 text-ink shadow-[0_12px_32px_rgba(26,35,50,0.12)] ring-1 ring-ink/10 backdrop-blur-md"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="driving-head flex cursor-pointer list-none items-baseline justify-between px-3.5 pt-3 pb-2 marker:hidden max-lg:px-2.5 max-lg:py-2 lg:pointer-events-none lg:cursor-default">
        <p className="font-display text-[11px] tracking-[0.18em] text-gold">DRIVING</p>
        <p className="text-[11px] font-medium text-ink/50 max-lg:text-[10px]">
          <span className="max-lg:hidden">
            {totalMiles} mi · {totalKm} km
          </span>
          <span className="lg:hidden">{totalMiles} mi</span>
        </p>
      </summary>
      <ul className="driving-legs px-1.5 pb-2">
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
    </details>
  );
}

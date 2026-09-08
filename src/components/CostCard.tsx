import type { CostEstimate } from "../types";
import { usd } from "../lib/estimateCost";

export function CostCard({
  cost,
  flightNote,
  rentalNote,
}: {
  cost: CostEstimate;
  flightNote?: string;
  rentalNote?: string;
}) {
  const mid = Math.round((cost.totalLow + cost.totalHigh) / 2);
  const rows = [
    ["Flights", cost.flights, flightNote],
    ["Hotels", cost.hotels, undefined],
    ["Rental car", cost.rental, rentalNote],
    ["Food", cost.food, undefined],
    ["Park & extras", cost.extras, undefined],
  ] as const;

  return (
    <div className="rounded-xl bg-white/70 px-4 py-4 ring-1 ring-ink/8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] tracking-[0.2em] text-gold">ESTIMATED COST</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            {usd(cost.totalLow)} – {usd(cost.totalHigh)}
          </p>
        </div>
        <p className="font-serif text-[28px] leading-none text-pine">{usd(mid)}</p>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-ink/8 pt-3">
        {rows.map(([label, line, note]) => (
          <li key={label} className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="min-w-0 text-ink-soft">
              {label}
              {note ? <span className="mt-0.5 block truncate text-[11px] text-ink/55">{note}</span> : null}
            </span>
            <span className="shrink-0 font-medium text-ink">
              {line.low === 0 && line.high === 0 ? "—" : `${usd(line.low)}–${usd(line.high)}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10.5px] leading-relaxed text-ink/45">{cost.disclaimer}</p>
    </div>
  );
}

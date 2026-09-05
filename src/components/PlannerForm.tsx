import type { FormEvent } from "react";
import { PARKS_BY_POPULARITY } from "../data/parks";
import type { TripInput } from "../types";
import { HomeSearch } from "./HomeSearch";

type Props = {
  value: TripInput;
  onChange: (next: TripInput) => void;
  onSubmit: () => void;
  onDemo: () => void;
};

export function PlannerForm({ value, onChange, onSubmit, onDemo }: Props) {
  const patch = (partial: Partial<TripInput>) => onChange({ ...value, ...partial });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Home
        </span>
        <HomeSearch value={value.home} onChange={(home) => patch({ home })} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          National park
        </span>
        <select
          required
          value={value.parkId}
          onChange={(e) => patch({ parkId: e.target.value })}
          className="rounded-xl border border-ink/10 bg-white/90 px-3.5 py-3 text-[15px] outline-none ring-pine/30 transition focus:ring-2"
        >
          {PARKS_BY_POPULARITY.map((p) => (
            <option key={p.id} value={p.id}>
              {p.shortName} — {p.state}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Adults"
          value={value.adults}
          min={1}
          max={8}
          onChange={(adults) => patch({ adults })}
        />
        <NumberField
          label="Kids"
          value={value.kids}
          min={0}
          max={8}
          onChange={(kids) => patch({ kids })}
        />
      </div>

      <NumberField
        label="Days"
        value={value.days}
        min={3}
        max={10}
        onChange={(days) => patch({ days })}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Start date
        </span>
        <input
          type="date"
          required
          value={value.startDate}
          onChange={(e) => patch({ startDate: e.target.value })}
          className="rounded-xl border border-ink/10 bg-white/90 px-3.5 py-3 text-[15px] outline-none ring-pine/30 transition focus:ring-2"
        />
      </label>

      <button
        type="submit"
        className="mt-1 rounded-xl bg-pine px-4 py-3.5 text-[15px] font-semibold text-[#f4efe4] shadow-sm transition hover:bg-[#182e24]"
      >
        Generate my trip
      </button>

      <button
        type="button"
        onClick={onDemo}
        className="text-sm font-medium text-pine underline decoration-gold/80 underline-offset-4 hover:decoration-pine"
      >
        Try Grand Canyon Family Road Trip
      </button>
    </form>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <div className="flex items-center overflow-hidden rounded-xl border border-ink/10 bg-white/90">
        <button
          type="button"
          className="px-3 py-3 text-lg text-ink-soft hover:bg-paper-deep"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center text-[15px] font-semibold">{value}</span>
        <button
          type="button"
          className="px-3 py-3 text-lg text-ink-soft hover:bg-paper-deep"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}

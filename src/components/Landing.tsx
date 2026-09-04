import { PARKS } from "../data/parks";
import { PlannerForm } from "./PlannerForm";
import type { TripInput } from "../types";

type Props = {
  value: TripInput;
  onChange: (next: TripInput) => void;
  onSubmit: () => void;
  onDemo: () => void;
};

export function Landing({ value, onChange, onSubmit, onDemo }: Props) {
  const selected = PARKS.find((p) => p.id === value.parkId);

  return (
    <div className="paper-grid min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <p className="font-display text-sm tracking-[0.32em] text-gold">NATIONAL PARK PLANNER</p>
          <h1 className="mt-4 max-w-xl font-display text-5xl uppercase leading-[0.9] tracking-wide text-pine sm:text-6xl lg:text-7xl">
            Tell us the park.
            <span className="block text-ink">We’ll draw the trip.</span>
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
            A few details — home, park, adults, kids, days — become a daily plan, a cost
            range, and an artistic map.
          </p>
          {selected ? (
            <p className="mt-8 max-w-md border-l-2 border-gold pl-4 text-sm text-ink-soft">
              {selected.blurb}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-white/70 p-6 shadow-[0_20px_50px_rgba(26,35,50,0.08)] ring-1 ring-ink/10 backdrop-blur">
          <h2 className="font-display text-2xl tracking-wide text-pine">Plan a trip</h2>
          <p className="mt-1 mb-5 text-sm text-ink-soft">
            We’ll build the days, a cost estimate, and a poster-style map.
          </p>
          <PlannerForm value={value} onChange={onChange} onSubmit={onSubmit} onDemo={onDemo} />
        </div>
      </div>
    </div>
  );
}

import { PARKS } from "../data/parks";
import { publicUrl } from "../lib/assets";
import { FeedbackLink } from "./FeedbackLink";
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
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      <img
        src={publicUrl("photos/hero-canyon.jpg")}
        alt="Grand Canyon from the South Rim"
        className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/82 via-ink/50 to-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/35" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-6 lg:px-8">
        <p className="font-display text-sm tracking-[0.32em] text-gold">RIMFOLD</p>
        <FeedbackLink className="text-[12px] font-medium text-[#f4efe4]/80 underline decoration-gold/50 underline-offset-4 transition hover:text-[#f4efe4]" />
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <p className="font-display text-sm tracking-[0.32em] text-gold">NATIONAL PARK PLANNER</p>
          <h1 className="mt-4 max-w-xl font-display text-5xl uppercase leading-[0.9] tracking-wide text-[#f4efe4] sm:text-6xl lg:text-7xl">
            Tell us the park.
            <span className="block text-gold">We’ll draw the trip.</span>
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[#f4efe4]/80">
            A few details — home, park, adults, kids, days — become a daily plan, a cost
            range, and an artistic map.
          </p>
          {selected ? (
            <p className="mt-8 max-w-md border-l-2 border-gold pl-4 text-sm text-[#f4efe4]/75">
              {selected.blurb}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-[#f4efe4]/95 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-white/40 backdrop-blur">
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

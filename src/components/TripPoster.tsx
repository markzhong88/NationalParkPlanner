import { useEffect, useRef, useState } from "react";
import type { TripPlan } from "../types";
import { DayCard } from "./DayCard";
import { ArtisticMap } from "./ArtisticMap";
import { CostCard } from "./CostCard";

type Props = {
  plan: TripPlan;
  onReset: () => void;
};

export function TripPoster({ plan, onReset }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const skipScroll = useRef(true);

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    if (selectedDay == null) return;
    document
      .getElementById(`day-card-${selectedDay}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedDay]);

  const pickDay = (day: number) => {
    setSelectedDay((current) => (current === day ? null : day));
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.querySelector(".map-canvas")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="paper-grid min-h-screen">
      <div className="mx-auto grid max-w-[1680px] grid-cols-1 gap-6 p-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:p-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="poster-scroll flex flex-col gap-5 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-2">
          <div className="no-print flex items-center justify-between">
            <p className="font-display text-[11px] tracking-[0.32em] text-gold">RIMFOLD</p>
            <button
              type="button"
              onClick={onReset}
              className="text-[12px] font-medium text-pine/80 underline decoration-gold/60 underline-offset-4 transition hover:text-pine"
            >
              Plan another trip
            </button>
          </div>

          <header className="px-0.5">
            <h1 className="font-serif text-[34px] leading-[1.05] text-pine">
              {prettyTitle(plan.title)}
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{plan.subtitle}</p>
            <p className="mt-3 text-[12px] tracking-wide text-ink/55">
              {plan.dateRange}
              <span className="mx-2 text-gold">·</span>
              {plan.travelers}
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">{plan.styleNote}</p>
          </header>

          {plan.cost ? <CostCard cost={plan.cost} /> : null}

          <section>
            <div className="mb-2 flex items-baseline justify-between px-0.5">
              <p className="font-display text-[11px] tracking-[0.2em] text-gold">ITINERARY</p>
              <p className="text-[11px] text-ink/40">{plan.days.length} days</p>
            </div>
            <p className="mb-2 px-0.5 text-[11px] leading-relaxed text-ink/40">
              Stays are a base, not a booking. We name a lodge only when rooms inside the park are scarce.
            </p>
            <div className="relative">
              <div className="pointer-events-none absolute top-6 bottom-6 left-[27px] w-px bg-ink/10" />
              <div className="flex flex-col gap-1">
                {plan.days.map((day) => (
                  <DayCard
                    key={day.day}
                    day={day}
                    selected={selectedDay === day.day}
                    onSelect={() => pickDay(day.day)}
                    places={plan.landmarks
                      .filter((lm) => lm.days?.includes(day.day))
                      .map((lm) => lm.name)}
                  />
                ))}
              </div>
            </div>
          </section>
        </aside>
        <section className="min-h-[560px] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <ArtisticMap plan={plan} selectedDay={selectedDay} onSelectDay={pickDay} />
        </section>
      </div>
    </div>
  );
}

function prettyTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

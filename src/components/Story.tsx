import { publicUrl } from "../lib/assets";

export function Story({ onBack }: { onBack: () => void }) {
  return (
    <div className="paper-grid min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6 lg:px-8">
        <p className="font-display text-sm tracking-[0.32em] text-gold">RIMFOLD</p>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium tracking-wide text-ink-soft underline decoration-gold/60 underline-offset-4 hover:text-pine"
        >
          Back to planner
        </button>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <p className="font-display text-sm tracking-[0.32em] text-gold">FOUNDER STORY</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-pine sm:text-4xl">
          It started with a ChatGPT plan and a poster we carried to the rim.
        </h1>

        <img
          src={publicUrl("founder/arizona-print.jpg")}
          alt="Printed day-by-day Arizona itinerary poster from August 2026"
          className="mt-10 w-full rounded-2xl object-cover shadow-[0_20px_50px_rgba(26,35,50,0.12)] ring-1 ring-ink/10"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <img
            src={publicUrl("photos/horseshoe.jpg")}
            alt="Horseshoe Bend from the rim"
            className="h-40 w-full rounded-xl object-cover ring-1 ring-ink/10 sm:h-52"
          />
          <img
            src={publicUrl("photos/hero-canyon.jpg")}
            alt="Grand Canyon from the South Rim"
            className="h-40 w-full rounded-xl object-cover ring-1 ring-ink/10 sm:h-52"
          />
        </div>

        <div className="mt-8 space-y-4 text-[16px] leading-relaxed text-ink-soft">
          <p>
            Last August I flew my family to Phoenix with a week sketched in ChatGPT: Sedona’s
            red rocks, Horseshoe Bend at sunset, Lower Antelope Canyon, then the Grand Canyon
            South Rim. I turned that chat into a one-page poster, printed it, and folded it
            into the rental car.
          </p>
          <p>
            The trip worked. The planning did not. Hotel lists, drive times, which viewpoints
            actually fit a day with kids — it was tabs and guesswork until the poster existed.
            Standing on the rim, I wanted that same folded sheet for the next park, without
            starting from a blank chat.
          </p>
          <p>
            Rimfold is that sheet. The name is the canyon rim and the fold of the map we
            carried. You tell us home, park, and days. We draw a daily plan, a cost range, and
            a map. The Arizona loop is still the demo — the trip that started this.
          </p>
        </div>

        <p className="mt-10 font-display text-[11px] tracking-[0.22em] text-gold">
          AUGUST 8–14, 2026
        </p>
        <h2 className="mt-2 font-serif text-2xl text-pine">The poster we actually used</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
          Phoenix to Sedona, Page, the South Rim, and home. About 900 miles, seven days, two
          adults and two kids. Rimfold builds that same kind of page for whatever park you
          pick next.
        </p>
        <img
          src={publicUrl("founder/arizona-plan.jpg")}
          alt="2026 Arizona family road trip poster with map, days, and photos"
          className="mt-6 w-full rounded-2xl object-cover shadow-[0_20px_50px_rgba(26,35,50,0.12)] ring-1 ring-ink/10"
        />

        <p className="mt-8 text-[13px] leading-relaxed text-ink/50">
          Itineraries are curated from park knowledge in the app, not generated live by a
          chatbot. ChatGPT helped plan the first trip. Rimfold is built so you don’t have to
          wrangle one.
        </p>
      </article>
    </div>
  );
}

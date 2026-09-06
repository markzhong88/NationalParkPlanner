import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { TripPlan } from "../types";
import { DayCard } from "./DayCard";
import { ArtisticMap, type ArtisticMapHandle } from "./ArtisticMap";
import { BrandMark } from "./BrandMark";
import { CostCard } from "./CostCard";
import { FeedbackLink } from "./FeedbackLink";
import { PrintPoster } from "./PrintPoster";
import { TripFeedback } from "./TripFeedback";
import {
  captureNodeJpeg,
  captureNodePng,
  downloadBlob,
  downloadDataUrl,
  jpegDataUrlToPdf,
  posterFilename,
  waitForImage,
  waitFrames,
} from "../lib/exportPoster";
import { copyTripText } from "../lib/tripText";
import { trackCopyTrip, trackDownload } from "../lib/analytics";
import {
  canOfferFeedback,
  feedbackForced,
  markFeedbackOffered,
  type FeedbackSource,
} from "../lib/tripFeedback";
import type { TripInput } from "../types";

type Props = {
  plan: TripPlan;
  trip: TripInput;
  returning: boolean;
  forceFeedback?: boolean;
  onReset: () => void;
};

export function TripPoster({ plan, trip, returning, forceFeedback = false, onReset }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | "text" | null>(null);
  const [copied, setCopied] = useState<"copied" | "downloaded" | false>(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackSource | null>(null);
  const skipScroll = useRef(true);
  const feedbackTimer = useRef<number>(0);
  const idleArmed = useRef(false);
  const openedForced = useRef(false);
  const offerFeedbackRef = useRef<(source: FeedbackSource) => void>(() => undefined);
  const saveRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ArtisticMapHandle>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    document.body.classList.toggle("has-print-sheet", Boolean(mapImage));
    return () => document.body.classList.remove("has-print-sheet");
  }, [mapImage]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${prettyTitle(plan.title)} — Rimfold`;
    return () => {
      document.title = previous;
    };
  }, [plan.title]);

  useEffect(() => {
    if (forceFeedback || feedbackForced()) {
      if (!openedForced.current && !feedback) {
        openedForced.current = true;
        setFeedback("idle");
      }
    }
  }, [feedback, forceFeedback]);

  useEffect(() => {
    const onScroll = () => {
      if (idleArmed.current) return;
      if (forceFeedback || feedbackForced() || !canOfferFeedback()) return;
      idleArmed.current = true;
      window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => offerFeedbackRef.current("idle"), 20000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      window.clearTimeout(feedbackTimer.current);
    };
  }, [forceFeedback]);

  useEffect(() => {
    if (!saveOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!saveRef.current?.contains(event.target as Node)) setSaveOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSaveOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [saveOpen]);

  const clearFeedbackTimer = () => {
    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = 0;
  };

  const offerFeedback = (source: FeedbackSource) => {
    if (feedback || !canOfferFeedback()) return;
    idleArmed.current = true;
    clearFeedbackTimer();
    markFeedbackOffered();
    setFeedback(source);
  };
  offerFeedbackRef.current = offerFeedback;

  const pickDay = (day: number) => {
    setSelectedDay((current) => (current === day ? null : day));
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.querySelector(".map-canvas")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const prepareSheet = async () => {
    const shot = await mapRef.current?.snapshot();
    if (!shot) throw new Error("The map is still drawing.");
    flushSync(() => setMapImage(shot));
    await waitFrames(2);
    const img = sheetRef.current?.querySelector<HTMLImageElement>("img[data-print-map]");
    if (img) await waitForImage(img);
    await waitFrames(1);
    const sheet = sheetRef.current;
    if (!sheet) throw new Error("Couldn’t build the poster.");
    return { sheet, mapImage: shot };
  };

  const exportPoster = async (kind: "png" | "pdf") => {
    if (busy) return;
    setBusy(kind);
    setExportError(null);
    clearFeedbackTimer();
    try {
      const { sheet, mapImage: shot } = await prepareSheet();
      if (kind === "png") {
        downloadDataUrl(await captureNodePng(sheet, shot), posterFilename(plan, "png"));
        trackDownload("png", trip, plan.parkName);
        offerFeedback("save");
        return;
      }
      const jpeg = await captureNodeJpeg(sheet, shot);
      downloadBlob(await jpegDataUrlToPdf(jpeg), posterFilename(plan, "pdf"));
      trackDownload("pdf", trip, plan.parkName);
      offerFeedback("save");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Couldn’t export the poster.");
    } finally {
      setBusy(null);
    }
  };

  const copyText = async () => {
    if (busy) return;
    setBusy("text");
    setExportError(null);
    clearFeedbackTimer();
    try {
      const result = await copyTripText(plan);
      setCopied(result);
      trackCopyTrip(trip, plan.parkName, result);
      offerFeedback("save");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setExportError("Couldn’t copy the itinerary. Try again, or download the PDF.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="paper-grid min-h-screen">
      <div className="screen-app mx-auto grid max-w-[1680px] grid-cols-1 gap-6 p-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:p-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="poster-scroll flex flex-col gap-5 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-2">
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 font-display text-[11px] tracking-[0.32em] text-gold transition hover:text-pine"
              aria-label="Rimfold home"
            >
              <BrandMark className="h-5 w-5" />
              RIMFOLD
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative" ref={saveRef}>
                <button
                  type="button"
                  disabled={busy != null}
                  aria-haspopup="menu"
                  aria-expanded={saveOpen}
                  onClick={() => setSaveOpen((open) => !open)}
                  className="rounded-full bg-pine px-3 py-1.5 text-[12px] font-medium text-[#f4efe4] transition hover:bg-pine/90 disabled:opacity-50"
                >
                  {busy
                    ? "Saving…"
                    : copied === "copied"
                      ? "Copied"
                      : copied === "downloaded"
                        ? "Saved"
                        : "Save trip"}
                </button>
                {saveOpen && busy == null ? (
                  <div
                    role="menu"
                    aria-label="Save trip"
                    className="absolute right-0 z-20 mt-1.5 w-[11.5rem] rounded-xl bg-[#f4efe4] p-1 shadow-[0_12px_32px_rgba(26,35,50,0.18)] ring-1 ring-pine/12"
                  >
                    <SaveChoice
                      label="Poster image"
                      hint="share or print later"
                      onClick={() => {
                        setSaveOpen(false);
                        void exportPoster("png");
                      }}
                    />
                    <SaveChoice
                      label="PDF"
                      hint="one page to print"
                      onClick={() => {
                        setSaveOpen(false);
                        void exportPoster("pdf");
                      }}
                    />
                    <SaveChoice
                      label="Copy text"
                      hint="paste into notes"
                      onClick={() => {
                        setSaveOpen(false);
                        void copyText();
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onReset}
                className="text-[12px] font-medium text-pine/80 underline decoration-gold/60 underline-offset-4 transition hover:text-pine"
              >
                Plan another trip
              </button>
            </div>
          </div>

          {exportError ? (
            <p className="no-print rounded-lg bg-[#9f1239] px-3 py-2 text-[12px] text-white">{exportError}</p>
          ) : null}

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

          {plan.cost ? (
            <div className="no-print">
              <CostCard cost={plan.cost} />
            </div>
          ) : null}

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

          <p className="no-print px-0.5 text-[12px] text-ink/45">
            Something off?{" "}
            <FeedbackLink className="font-medium text-pine/80 underline decoration-gold/60 underline-offset-4 transition hover:text-pine" />
          </p>
        </aside>
        <section className="min-h-[560px] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <ArtisticMap ref={mapRef} plan={plan} selectedDay={selectedDay} onSelectDay={pickDay} />
        </section>
      </div>
      <PrintPoster plan={plan} mapImage={mapImage} sheetRef={sheetRef} />
      {feedback ? (
        <TripFeedback
          trip={trip}
          parkName={plan.parkName}
          returning={returning}
          source={feedback}
          testing={forceFeedback || feedbackForced()}
          onClose={() => setFeedback(null)}
        />
      ) : null}
    </div>
  );
}

function SaveChoice({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-white/70"
    >
      <span className="text-[13px] font-medium text-pine">{label}</span>
      <span className="text-[11px] text-ink/45">{hint}</span>
    </button>
  );
}

function prettyTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

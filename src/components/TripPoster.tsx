import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { TripPlan } from "../types";
import { DayCard } from "./DayCard";
import { ArtisticMap, type ArtisticMapHandle } from "./ArtisticMap";
import { CostCard } from "./CostCard";
import { FeedbackLink } from "./FeedbackLink";
import { PrintPoster } from "./PrintPoster";
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
import type { TripInput } from "../types";

type Props = {
  plan: TripPlan;
  trip: TripInput;
  onReset: () => void;
};

export function TripPoster({ plan, trip, onReset }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | "text" | null>(null);
  const [copied, setCopied] = useState<"copied" | "downloaded" | false>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const skipScroll = useRef(true);
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
    try {
      const { sheet, mapImage: shot } = await prepareSheet();
      if (kind === "png") {
        downloadDataUrl(await captureNodePng(sheet, shot), posterFilename(plan, "png"));
        trackDownload("png", trip, plan.parkName);
        return;
      }
      const jpeg = await captureNodeJpeg(sheet, shot);
      downloadBlob(await jpegDataUrlToPdf(jpeg), posterFilename(plan, "pdf"));
      trackDownload("pdf", trip, plan.parkName);
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
    try {
      const result = await copyTripText(plan);
      setCopied(result);
      trackCopyTrip(trip, plan.parkName, result);
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
              className="font-display text-[11px] tracking-[0.32em] text-gold transition hover:text-pine"
              aria-label="Rimfold home"
            >
              RIMFOLD
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void exportPoster("png")}
                className="rounded-full bg-pine px-3 py-1.5 text-[12px] font-medium text-[#f4efe4] transition hover:bg-pine/90 disabled:opacity-50"
              >
                {busy === "png" ? "Preparing…" : "Download image"}
              </button>
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void exportPoster("pdf")}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-pine ring-1 ring-pine/20 transition hover:bg-white/60 disabled:opacity-50"
              >
                {busy === "pdf" ? "Preparing…" : "Download PDF"}
              </button>
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void copyText()}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-pine ring-1 ring-pine/20 transition hover:bg-white/60 disabled:opacity-50"
              >
                {copied === "copied" ? "Copied" : copied === "downloaded" ? "Saved .txt" : "Copy trip"}
              </button>
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
    </div>
  );
}

function prettyTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

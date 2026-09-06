import { useState } from "react";
import { FEEDBACK_EMAIL } from "./FeedbackLink";
import { trackItineraryFeedback } from "../lib/analytics";
import {
  FEEDBACK_RATINGS,
  markFeedbackDismissed,
  markFeedbackSubmitted,
  type FeedbackRating,
  type FeedbackSource,
} from "../lib/tripFeedback";
import type { TripInput } from "../types";

type Props = {
  trip: TripInput;
  parkName: string;
  returning: boolean;
  source: FeedbackSource;
  testing?: boolean;
  onClose: () => void;
};

export function TripFeedback({
  trip,
  parkName,
  returning,
  source,
  testing = false,
  onClose,
}: Props) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"ask" | "sending" | "thanks" | "mailto">("ask");

  const submit = async () => {
    if (!rating || status !== "ask") return;
    const trimmed = note.trim().slice(0, 600);
    setStatus("sending");
    trackItineraryFeedback({
      rating,
      parkName,
      parkId: trip.parkId,
      days: trip.days,
      returning,
      source,
      hasNote: Boolean(trimmed),
      note: trimmed || undefined,
    });
    const result = await sendFeedbackEmail({
      rating: FEEDBACK_RATINGS.find((item) => item.id === rating)?.label ?? rating,
      note: trimmed,
      parkName,
      days: trip.days,
      home: trip.home,
    });
    if (!testing) markFeedbackSubmitted();
    setStatus(result);
    window.setTimeout(onClose, 2400);
  };

  return (
    <aside
      className="no-print fixed right-4 bottom-4 left-4 z-30 mx-auto w-auto max-w-[380px] rounded-2xl bg-[#f4efe4] p-4 shadow-[0_18px_50px_rgba(26,35,50,0.22)] ring-1 ring-pine/12 lg:right-auto lg:left-6"
      role="dialog"
      aria-labelledby="trip-feedback-title"
    >
      {status === "thanks" || status === "mailto" || status === "sending" ? (
        <p className="font-serif text-[20px] leading-snug text-pine">{thanksCopy(status)}</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="trip-feedback-title" className="font-serif text-[20px] leading-tight text-pine">
                Your itinerary is ready
              </h2>
              <p className="mt-1 text-[13px] text-ink-soft">
                One quick question — how useful was this itinerary?
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!testing) markFeedbackDismissed();
                onClose();
              }}
              className="shrink-0 text-[12px] font-medium text-ink/45 transition hover:text-pine"
            >
              Not now
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-1.5" role="radiogroup" aria-label="How useful was this itinerary?">
            {FEEDBACK_RATINGS.map((item) => {
              const selected = rating === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRating(item.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition ${
                    selected
                      ? "bg-pine text-[#f4efe4]"
                      : "bg-white/70 text-ink ring-1 ring-ink/8 hover:bg-white"
                  }`}
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <label className="mt-3 block">
            <span className="font-serif text-[13px] italic text-ink-soft">What would make it better?</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="Optional"
              className="mt-1.5 w-full resize-none rounded-xl bg-white/80 px-3 py-2 text-[13px] text-ink ring-1 ring-ink/10 outline-none placeholder:text-ink/35 focus:ring-pine/30"
            />
          </label>

          <button
            type="button"
            disabled={!rating}
            onClick={() => void submit()}
            className="mt-3 rounded-full bg-pine px-4 py-2 text-[13px] font-medium text-[#f4efe4] transition hover:bg-pine/90 disabled:opacity-40"
          >
            Submit
          </button>
        </>
      )}
    </aside>
  );
}

async function sendFeedbackEmail(payload: {
  rating: string;
  note: string;
  parkName: string;
  days: number;
  home: string;
}): Promise<"thanks" | "mailto"> {
  const message = feedbackEmailBody(payload);
  const subject = `Rimfold feedback: ${payload.rating}`;
  const accessKey = import.meta.env.VITE_WEB3FORMS_KEY?.trim();
  if (!accessKey) {
    openMailto(subject, message);
    return "mailto";
  }
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject,
        from_name: "Rimfold",
        botcheck: false,
        rating: payload.rating,
        park: payload.parkName,
        days: String(payload.days),
        home: payload.home.slice(0, 80),
        message,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    if (!res.ok || data?.success === false) throw new Error("mail failed");
    return "thanks";
  } catch {
    openMailto(subject, message);
    return "mailto";
  }
}

function thanksCopy(status: "sending" | "thanks" | "mailto") {
  if (status === "sending") return "Sending…";
  if (status === "mailto") return "We opened a mail draft — hit Send in your mail app.";
  return "Thanks — that helps.";
}

function feedbackEmailBody(payload: {
  rating: string;
  note: string;
  parkName: string;
  days: number;
  home: string;
}) {
  const note = payload.note.trim() || "(none)";
  return [
    `Rating: ${payload.rating}`,
    `Park: ${payload.parkName}`,
    `Days: ${payload.days}`,
    `From: ${payload.home}`,
    "",
    "What would make it better?",
    note,
  ].join("\n");
}

function openMailto(subject: string, body: string) {
  const mail = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const link = document.createElement("a");
  link.href = mail;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

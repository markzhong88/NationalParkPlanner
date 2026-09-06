const KEY = "rimfold.feedback";
const SESSION_KEY = "rimfold.feedback.offered";

type FeedbackState = {
  generates: number;
  submittedAt?: number;
  dismissedAt?: number;
  offeredAt?: number;
};

export type FeedbackRating = "very" | "pretty" | "no";
export type FeedbackSource = "save" | "idle";

export const FEEDBACK_RATINGS: { id: FeedbackRating; emoji: string; label: string }[] = [
  { id: "very", emoji: "👍", label: "Very useful" },
  { id: "pretty", emoji: "😐", label: "Pretty useful" },
  { id: "no", emoji: "👎", label: "Not really" },
];

export function noteTripGenerated(): boolean {
  const state = read();
  const returning = state.generates >= 1;
  write({ ...state, generates: state.generates + 1 });
  return returning;
}

export function feedbackForced(): boolean {
  return new URLSearchParams(window.location.search).get("feedback") === "1";
}

/** Clears submit/dismiss locks so `?feedback=1` can be tested again. */
export function resetFeedbackPrompt() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    const state = read();
    write({ generates: state.generates });
  } catch {
    /* private mode */
  }
}

export function canOfferFeedback(): boolean {
  if (sessionOffered()) return false;
  const state = read();
  return !state.submittedAt && !state.dismissedAt && !state.offeredAt;
}

export function markFeedbackOffered() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
  const state = read();
  if (!state.offeredAt) write({ ...state, offeredAt: Date.now() });
}

export function markFeedbackDismissed() {
  markFeedbackOffered();
  write({ ...read(), dismissedAt: Date.now() });
}

export function markFeedbackSubmitted() {
  markFeedbackOffered();
  write({ ...read(), submittedAt: Date.now(), dismissedAt: undefined });
}

function sessionOffered() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function read(): FeedbackState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { generates: 0 };
    const parsed = JSON.parse(raw) as FeedbackState;
    if (!parsed || typeof parsed !== "object") return { generates: 0 };
    return {
      generates: Number.isFinite(parsed.generates) ? parsed.generates : 0,
      submittedAt: parsed.submittedAt,
      dismissedAt: parsed.dismissedAt,
      offeredAt: parsed.offeredAt,
    };
  } catch {
    return { generates: 0 };
  }
}

function write(state: FeedbackState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

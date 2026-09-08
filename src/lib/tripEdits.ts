import type { DayPlan, TripPlan } from "../types";

export type DayEdit = {
  heading?: string;
  activities?: string[];
  stay?: string;
};

export type TripEdits = {
  flight?: string;
  rental?: string;
  days?: Record<string, DayEdit>;
};

const STORAGE_PREFIX = "rimfold.edits.";

export function emptyTripEdits(): TripEdits {
  return {};
}

export function dayHeading(day: DayPlan): string {
  return day.route || day.title;
}

export function hasTripEdits(edits: TripEdits): boolean {
  if (clean(edits.flight) || clean(edits.rental)) return true;
  return Object.values(edits.days ?? {}).some((day) => hasDayEdit(day));
}

export function applyTripEdits(plan: TripPlan, edits: TripEdits): TripPlan {
  const flightNote = clean(edits.flight);
  const rentalNote = clean(edits.rental);
  const days = plan.days.map((day) => applyDayEdit(day, edits.days?.[String(day.day)]));
  return { ...plan, days, flightNote, rentalNote };
}

export function patchTripEdits(edits: TripEdits, patch: TripEdits): TripEdits {
  return compactEdits({
    flight: patch.flight !== undefined ? patch.flight : edits.flight,
    rental: patch.rental !== undefined ? patch.rental : edits.rental,
    days: patch.days ? { ...edits.days, ...patch.days } : edits.days,
  });
}

export function patchDayEdit(edits: TripEdits, day: number, patch: DayEdit, original: DayPlan): TripEdits {
  const current = edits.days?.[String(day)] ?? {};
  const merged: DayEdit = {
    heading: patch.heading !== undefined ? patch.heading : current.heading,
    activities: patch.activities !== undefined ? patch.activities : current.activities,
    stay: patch.stay !== undefined ? patch.stay : current.stay,
  };
  const nextDay = normalizeDayEdit(merged, original);
  const days = { ...edits.days };
  if (nextDay) days[String(day)] = nextDay;
  else delete days[String(day)];
  return compactEdits({ ...edits, days });
}

export function readTripEdits(token: string): TripEdits {
  if (!token || typeof localStorage === "undefined") return emptyTripEdits();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + token);
    if (!raw) return emptyTripEdits();
    const parsed = JSON.parse(raw) as TripEdits;
    return compactEdits({
      flight: typeof parsed.flight === "string" ? parsed.flight : undefined,
      rental: typeof parsed.rental === "string" ? parsed.rental : undefined,
      days: sanitizeDays(parsed.days),
    });
  } catch {
    return emptyTripEdits();
  }
}

export function writeTripEdits(token: string, edits: TripEdits) {
  if (!token || typeof localStorage === "undefined") return;
  try {
    if (!hasTripEdits(edits)) {
      localStorage.removeItem(STORAGE_PREFIX + token);
      return;
    }
    localStorage.setItem(STORAGE_PREFIX + token, JSON.stringify(edits));
  } catch {
    /* quota / private mode */
  }
}

function applyDayEdit(day: DayPlan, patch: DayEdit | undefined): DayPlan {
  if (!patch || !hasDayEdit(patch)) return day;
  const next = { ...day };
  const heading = clean(patch.heading);
  if (heading) {
    if (day.route) next.route = heading;
    else next.title = heading;
  }
  if (patch.activities) {
    next.activities = patch.activities.map((item) => item.replace(/\s+$/g, ""));
  }
  const stay = clean(patch.stay);
  if (stay) next.stay = stay;
  return next;
}

function normalizeDayEdit(patch: DayEdit, original: DayPlan): DayEdit | undefined {
  const heading = clean(patch.heading);
  const stay = clean(patch.stay);
  const activities = patch.activities?.map((item) => item.replace(/\s+$/g, ""));
  const next: DayEdit = {};
  if (heading && heading !== dayHeading(original)) next.heading = heading;
  if (stay && stay !== original.stay) next.stay = stay;
  if (activities && !sameList(activities, original.activities)) {
    next.activities = activities;
  }
  return hasDayEdit(next) ? next : undefined;
}

function sanitizeDays(value: TripEdits["days"]): Record<string, DayEdit> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const days: Record<string, DayEdit> = {};
  for (const [key, patch] of Object.entries(value)) {
    if (!/^\d+$/.test(key) || !patch || typeof patch !== "object") continue;
    const next: DayEdit = {};
    if (typeof patch.heading === "string") next.heading = patch.heading;
    if (typeof patch.stay === "string") next.stay = patch.stay;
    if (Array.isArray(patch.activities) && patch.activities.every((item) => typeof item === "string")) {
      next.activities = patch.activities;
    }
    if (hasDayEdit(next)) days[key] = next;
  }
  return Object.keys(days).length ? days : undefined;
}

function compactEdits(edits: TripEdits): TripEdits {
  const next: TripEdits = {};
  if (clean(edits.flight)) next.flight = edits.flight!.trim();
  else if (edits.flight === "") next.flight = "";
  if (clean(edits.rental)) next.rental = edits.rental!.trim();
  else if (edits.rental === "") next.rental = "";
  if (edits.days && Object.keys(edits.days).length) next.days = edits.days;
  if (next.flight === "") delete next.flight;
  if (next.rental === "") delete next.rental;
  return next;
}

function hasDayEdit(patch: DayEdit): boolean {
  return Boolean(clean(patch.heading) || clean(patch.stay) || patch.activities);
}

function sameList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

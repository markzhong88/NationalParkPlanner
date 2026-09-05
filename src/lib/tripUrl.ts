import { getPark } from "../data/parks";
import { nearbyAddon } from "../data/nearbyParks";
import type { TripInput } from "../types";
import { defaultStartDate } from "./format";

export function tripFromSearch(search = window.location.search): TripInput | null {
  const q = new URLSearchParams(search);
  const parkId = (q.get("park") ?? "").trim();
  const home = (q.get("from") ?? q.get("home") ?? "").trim();
  if (!getPark(parkId) || home.length < 2) return null;
  const alsoRaw = (q.get("also") ?? "").trim();
  const alsoParkId = nearbyAddon(parkId, alsoRaw) ? alsoRaw : undefined;
  const addon = nearbyAddon(parkId, alsoParkId);
  const days = clampInt(q.get("days"), 3, 10, addon?.minDays ?? 7);
  return {
    home: home.slice(0, 80),
    parkId,
    alsoParkId,
    adults: clampInt(q.get("adults"), 1, 8, 2),
    kids: clampInt(q.get("kids"), 0, 8, 2),
    days: addon ? Math.max(days, addon.minDays) : days,
    startDate: validDate(q.get("start")) ?? defaultStartDate(),
  };
}

export function tripShareUrl(input: TripInput, loc = window.location): string {
  const q = new URLSearchParams();
  q.set("park", input.parkId);
  if (input.alsoParkId && nearbyAddon(input.parkId, input.alsoParkId)) {
    q.set("also", input.alsoParkId);
  }
  q.set("from", input.home.trim());
  q.set("adults", String(input.adults));
  q.set("kids", String(input.kids));
  q.set("days", String(input.days));
  q.set("start", input.startDate);
  return `${loc.origin}${loc.pathname}?${q.toString()}`;
}

export function writeTripUrl(input: TripInput) {
  const next = tripShareUrl(input);
  const url = new URL(next);
  if (window.location.search === url.search) return;
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export function clearTripUrl() {
  if (!window.location.search) return;
  window.history.replaceState(null, "", window.location.pathname);
}

function clampInt(raw: string | null, min: number, max: number, fallback: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function validDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return value;
}

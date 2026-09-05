import { getPark } from "../data/parks";
import { nearbyAddon } from "../data/nearbyParks";
import { homeFromUrlToken, homeUrlToken } from "../data/cities";
import type { TripInput } from "../types";
import { defaultStartDate } from "./format";

export function tripFromSearch(
  search = window.location.search,
  pathname = window.location.pathname,
): TripInput | null {
  const token = compactTokenFromLocation(search, pathname);
  if (token) return tripFromToken(token);
  return tripFromLegacySearch(search);
}

export function tripShareUrl(input: TripInput, loc = window.location): string {
  return `${loc.origin}${homePath()}?t=${encodeTripToken(input)}`;
}

export function writeTripUrl(input: TripInput) {
  const next = tripShareUrl(input);
  const url = new URL(next);
  const target = `${url.pathname}${url.search}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === target) return;
  window.history.replaceState(null, "", target);
}

export function clearTripUrl() {
  const home = homePath();
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === home || current === `${home}/`) return;
  window.history.replaceState(null, "", home);
}

export function encodeTripToken(input: TripInput): string {
  const parks = [input.parkId];
  if (input.alsoParkId && nearbyAddon(input.parkId, input.alsoParkId)) {
    parks.push(input.alsoParkId);
  }
  const start = compactDate(input.startDate) ?? compactDate(defaultStartDate()) ?? "000101";
  return [
    parks.join("~"),
    homeUrlToken(input.home),
    String(input.adults),
    String(input.kids),
    String(input.days),
    start,
  ].join(".");
}

function tripFromToken(token: string): TripInput | null {
  const match = token
    .trim()
    .toLowerCase()
    .match(/^([a-z0-9-]+)(?:~([a-z0-9-]+))?\.([a-z0-9-]+)\.(\d{1,2})\.(\d{1,2})\.(\d{1,2})\.(\d{6})$/);
  if (!match) return null;
  const parkId = match[1];
  const alsoRaw = match[2] ?? "";
  const home = homeFromUrlToken(match[3]);
  if (!getPark(parkId) || home.length < 2) return null;
  const alsoParkId = nearbyAddon(parkId, alsoRaw) ? alsoRaw : undefined;
  const addon = nearbyAddon(parkId, alsoParkId);
  const days = clampInt(match[6], 3, 10, addon?.minDays ?? 7);
  return {
    home: home.slice(0, 80),
    parkId,
    alsoParkId,
    adults: clampInt(match[4], 1, 8, 2),
    kids: clampInt(match[5], 0, 8, 2),
    days: addon ? Math.max(days, addon.minDays) : days,
    startDate: expandDate(match[7]) ?? defaultStartDate(),
  };
}

function tripFromLegacySearch(search: string): TripInput | null {
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

function compactTokenFromLocation(search: string, pathname: string): string | null {
  const q = new URLSearchParams(search);
  const fromQuery = (q.get("t") ?? "").trim();
  if (fromQuery) return fromQuery;
  const base = homePath().replace(/\/$/, "");
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const pathMatch = rest.match(/^\/t\/([^/]+)\/?$/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
}

function homePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function compactDate(value: string): string | null {
  const valid = validDate(value);
  if (!valid) return null;
  return valid.slice(2).replaceAll("-", "");
}

function expandDate(value: string): string | null {
  if (!/^\d{6}$/.test(value)) return null;
  return validDate(`20${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}`);
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

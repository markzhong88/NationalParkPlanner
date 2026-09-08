import { CITIES, cityLabel, findCity } from "../data/cities";
import { haversineMiles } from "./geo";
import type { Coordinates } from "../types";

const LAST_HOME_KEY = "rimfold.home";

export function readLastHome(): string {
  try {
    return localStorage.getItem(LAST_HOME_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeLastHome(home: string) {
  const value = home.trim();
  if (value.length < 2) return;
  try {
    localStorage.setItem(LAST_HOME_KEY, value.slice(0, 80));
  } catch {
    /* private mode */
  }
}

/** Last typed home, or a quiet IP guess. Never prompts for GPS. */
export async function guessHome(): Promise<string> {
  const remembered = readLastHome();
  if (remembered) return remembered;
  return (await lookupIpHome()) ?? "";
}

type GeoHint = {
  country?: string;
  city?: string;
  region?: string;
  lat?: number;
  lng?: number;
};

export function homeFromGeo(geo: GeoHint): string {
  if (!isUsOrCanada(geo.country)) return "";

  const city = (geo.city ?? "").trim();
  const region = (geo.region ?? "").trim();
  if (city) {
    const known = (region ? findCity(`${city}, ${region}`) : undefined) ?? findCity(city);
    if (known && nameMatches(known.name, city)) return cityLabel(known);
  }
  if (geo.lat != null && geo.lng != null && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
    const near = nearestCity({ lat: geo.lat, lng: geo.lng });
    if (near) return cityLabel(near);
  }
  if (city && /^[A-Za-z]{2}$/.test(region)) return `${titleCity(city)}, ${region.toUpperCase()}`;
  return "";
}

async function lookupIpHome(): Promise<string | null> {
  for (const url of ["https://ipwho.is/", "https://get.geojs.io/v1/ip/geo.json"]) {
    const geo = await fetchJson(url);
    if (!geo || geo.success === false) continue;
    const home = homeFromGeo(parseGeoPayload(geo));
    if (home) return home;
  }
  return null;
}

function isUsOrCanada(country?: string): boolean {
  if (!country) return true;
  const value = country.toUpperCase();
  return (
    value === "US" ||
    value === "USA" ||
    value === "CA" ||
    value === "CAN" ||
    value.startsWith("UNITED STATES") ||
    value === "CANADA"
  );
}

function parseGeoPayload(raw: Record<string, unknown>): GeoHint {
  const lat = num(raw.latitude) ?? num(raw.lat);
  const lng = num(raw.longitude) ?? num(raw.lng) ?? num(raw.lon);
  const country = str(raw.country_code) || str(raw.country);
  const city = str(raw.city);
  const region = str(raw.region_code) || str(raw.region);
  return { country, city, region, lat, lng };
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

function nearestCity(coord: Coordinates, maxMiles = 55) {
  let best = CITIES[0];
  let bestMiles = Number.POSITIVE_INFINITY;
  for (const city of CITIES) {
    const miles = haversineMiles(city.coord, coord);
    if (miles < bestMiles) {
      bestMiles = miles;
      best = city;
    }
  }
  return bestMiles <= maxMiles ? best : undefined;
}

function nameMatches(known: string, guessed: string): boolean {
  const a = known.toLowerCase();
  const b = guessed.toLowerCase();
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function titleCity(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

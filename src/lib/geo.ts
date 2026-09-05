import type { Coordinates } from "../types";

export type LineStringGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

const EXPORT_W = 1920;
const ASPECT_MIN = 1.38;
const ASPECT_MAX = 1.72;

export type LngLatBoundsBox = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

export function exportMapAspect(bounds: LngLatBoundsBox): number {
  const lngSpan = Math.max(0.18, bounds.maxLng - bounds.minLng);
  const latSpan = Math.max(0.14, bounds.maxLat - bounds.minLat);
  const midLat = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const geo = (lngSpan * Math.cos(midLat)) / latSpan;
  return Math.min(ASPECT_MAX, Math.max(ASPECT_MIN, geo));
}

export function exportMapViewport(bounds: LngLatBoundsBox): { width: number; height: number } {
  const aspect = exportMapAspect(bounds);
  return { width: EXPORT_W, height: Math.round(EXPORT_W / aspect) };
}

export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function estimateDriveHours(from: Coordinates, to: Coordinates): number {
  const miles = haversineMiles(from, to);
  if (miles < 20) return 0.6;
  return Math.round((miles / 48) * 4) / 4;
}

export function formatHours(hours: number): string {
  if (hours <= 0.4) return "< 1 hr";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const whole = Math.floor(hours);
  const frac = hours - whole;
  if (frac < 0.15) return `${whole} hr${whole === 1 ? "" : "s"}`;
  if (frac < 0.65) return `${whole}.5 hrs`;
  return `${whole + 1} hrs`;
}

export type PlaceSuggestion = {
  label: string;
  coord: Coordinates;
};

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: {
        geometry?: { coordinates?: number[] };
        properties?: { name?: string; city?: string; state?: string; countrycode?: string };
      }[];
    };
    const out: PlaceSuggestion[] = [];
    for (const f of data.features ?? []) {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const p = f.properties ?? {};
      if (p.countrycode && p.countrycode !== "US" && p.countrycode !== "CA") continue;
      const parts = [p.name, p.city, p.state].filter(Boolean);
      const label = [...new Set(parts)].join(", ");
      if (!label) continue;
      if (out.some((x) => x.label === label)) continue;
      out.push({ label, coord: { lng: coords[0], lat: coords[1] } });
    }
    return out;
  } catch {
    return [];
  }
}

export async function geocodePlace(query: string): Promise<Coordinates | null> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { geometry?: { coordinates?: number[] } }[];
    };
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return { lng: coords[0], lat: coords[1] };
  } catch {
    return null;
  }
}

export type RoutedLeg = {
  geometry: [number, number][];
  miles: number;
  hours: number;
};

export async function fetchDrivingRoute(
  points: Coordinates[],
): Promise<{ geometry: LineStringGeometry; miles: number; legs: RoutedLeg[] } | null> {
  if (points.length < 2) return null;
  const path = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: {
        geometry: LineStringGeometry;
        distance: number;
        legs?: {
          distance: number;
          duration: number;
          steps?: { geometry?: LineStringGeometry }[];
        }[];
      }[];
    };
    const route = data.routes?.[0];
    if (!route) return null;
    const legs: RoutedLeg[] = (route.legs ?? []).map((leg) => ({
      geometry: coordsFromSteps(leg.steps),
      miles: Math.round(leg.distance / 1609.34),
      hours: Math.round((leg.duration / 3600) * 4) / 4,
    }));
    return {
      geometry: route.geometry,
      miles: Math.round(route.distance / 1609.34),
      legs,
    };
  } catch {
    return null;
  }
}

function coordsFromSteps(steps?: { geometry?: LineStringGeometry }[]): [number, number][] {
  const out: [number, number][] = [];
  for (const step of steps ?? []) {
    for (const point of step.geometry?.coordinates ?? []) {
      const prev = out[out.length - 1];
      if (prev && prev[0] === point[0] && prev[1] === point[1]) continue;
      out.push(point);
    }
  }
  return out;
}

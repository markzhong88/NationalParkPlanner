import type { City } from "../types";

export const CITIES: City[] = [
  { name: "New York", state: "NY", coord: { lng: -74.006, lat: 40.7128 }, airport: "JFK", aliases: ["nyc", "new york city", "manhattan", "brooklyn", "jfk", "laguardia", "lga"] },
  { name: "Los Angeles", state: "CA", coord: { lng: -118.2437, lat: 34.0522 }, airport: "LAX" },
  { name: "Chicago", state: "IL", coord: { lng: -87.6298, lat: 41.8781 }, airport: "ORD" },
  { name: "Houston", state: "TX", coord: { lng: -95.3698, lat: 29.7604 }, airport: "IAH" },
  { name: "Phoenix", state: "AZ", coord: { lng: -112.074, lat: 33.4484 }, airport: "PHX" },
  { name: "Philadelphia", state: "PA", coord: { lng: -75.1652, lat: 39.9526 }, airport: "PHL" },
  { name: "San Antonio", state: "TX", coord: { lng: -98.4936, lat: 29.4241 }, airport: "SAT" },
  { name: "San Diego", state: "CA", coord: { lng: -117.1611, lat: 32.7157 }, airport: "SAN" },
  { name: "Dallas", state: "TX", coord: { lng: -96.797, lat: 32.7767 }, airport: "DFW" },
  { name: "San Jose", state: "CA", coord: { lng: -121.8863, lat: 37.3382 }, airport: "SJC" },
  { name: "Austin", state: "TX", coord: { lng: -97.7431, lat: 30.2672 }, airport: "AUS" },
  { name: "Jacksonville", state: "FL", coord: { lng: -81.6557, lat: 30.3322 }, airport: "JAX" },
  { name: "Fort Worth", state: "TX", coord: { lng: -97.3308, lat: 32.7555 }, airport: "DFW" },
  { name: "Columbus", state: "OH", coord: { lng: -82.9988, lat: 39.9612 }, airport: "CMH" },
  { name: "Charlotte", state: "NC", coord: { lng: -80.8431, lat: 35.2271 }, airport: "CLT" },
  { name: "San Francisco", state: "CA", coord: { lng: -122.4194, lat: 37.7749 }, airport: "SFO" },
  { name: "Indianapolis", state: "IN", coord: { lng: -86.1581, lat: 39.7684 }, airport: "IND" },
  { name: "Seattle", state: "WA", coord: { lng: -122.3321, lat: 47.6062 }, airport: "SEA" },
  { name: "Denver", state: "CO", coord: { lng: -104.9903, lat: 39.7392 }, airport: "DEN" },
  { name: "Boston", state: "MA", coord: { lng: -71.0589, lat: 42.3601 }, airport: "BOS" },
  { name: "Nashville", state: "TN", coord: { lng: -86.7816, lat: 36.1627 }, airport: "BNA" },
  { name: "Detroit", state: "MI", coord: { lng: -83.0458, lat: 42.3314 }, airport: "DTW" },
  { name: "Portland", state: "OR", coord: { lng: -122.6784, lat: 45.5152 }, airport: "PDX" },
  { name: "Las Vegas", state: "NV", coord: { lng: -115.1398, lat: 36.1699 }, airport: "LAS" },
  { name: "Miami", state: "FL", coord: { lng: -80.1918, lat: 25.7617 }, airport: "MIA" },
  { name: "Key West", state: "FL", coord: { lng: -81.78, lat: 24.5551 }, airport: "EYW", aliases: ["keywest", "key west fl"] },
  { name: "Atlanta", state: "GA", coord: { lng: -84.388, lat: 33.749 }, airport: "ATL" },
  { name: "Minneapolis", state: "MN", coord: { lng: -93.265, lat: 44.9778 }, airport: "MSP" },
  { name: "Salt Lake City", state: "UT", coord: { lng: -111.891, lat: 40.7608 }, airport: "SLC" },
  { name: "Albuquerque", state: "NM", coord: { lng: -106.6504, lat: 35.0844 }, airport: "ABQ" },
  { name: "Flagstaff", state: "AZ", coord: { lng: -111.6513, lat: 35.1983 }, airport: "FLG" },
  { name: "Tucson", state: "AZ", coord: { lng: -110.9747, lat: 32.2226 }, airport: "TUS" },
  { name: "Washington", state: "DC", coord: { lng: -77.0369, lat: 38.9072 }, airport: "DCA" },
  { name: "Raleigh", state: "NC", coord: { lng: -78.6382, lat: 35.7796 }, airport: "RDU" },
  { name: "Kansas City", state: "MO", coord: { lng: -94.5786, lat: 39.0997 }, airport: "MCI" },
  { name: "St. Louis", state: "MO", coord: { lng: -90.1994, lat: 38.627 }, airport: "STL" },
  { name: "Cleveland", state: "OH", coord: { lng: -81.6944, lat: 41.4993 }, airport: "CLE" },
  { name: "Pittsburgh", state: "PA", coord: { lng: -79.9959, lat: 40.4406 }, airport: "PIT" },
  { name: "Cincinnati", state: "OH", coord: { lng: -84.512, lat: 39.1031 }, airport: "CVG" },
  { name: "Orlando", state: "FL", coord: { lng: -81.3792, lat: 28.5383 }, airport: "MCO" },
  { name: "Tampa", state: "FL", coord: { lng: -82.4572, lat: 27.9506 }, airport: "TPA" },
  { name: "Sacramento", state: "CA", coord: { lng: -121.4944, lat: 38.5816 }, airport: "SMF" },
  { name: "Fresno", state: "CA", coord: { lng: -119.7871, lat: 36.7378 }, airport: "FAT" },
  { name: "Boise", state: "ID", coord: { lng: -116.2023, lat: 43.615 }, airport: "BOI" },
  { name: "Billings", state: "MT", coord: { lng: -108.5007, lat: 45.7833 }, airport: "BIL" },
  { name: "Missoula", state: "MT", coord: { lng: -113.9966, lat: 46.8721 }, airport: "MSO" },
  { name: "Spokane", state: "WA", coord: { lng: -117.426, lat: 47.6588 }, airport: "GEG" },
  { name: "Anchorage", state: "AK", coord: { lng: -149.9003, lat: 61.2181 }, airport: "ANC" },
  { name: "Honolulu", state: "HI", coord: { lng: -157.8583, lat: 21.3069 }, airport: "HNL" },
  { name: "Bar Harbor", state: "ME", coord: { lng: -68.2039, lat: 44.3876 }, airport: "BHB" },
  { name: "Asheville", state: "NC", coord: { lng: -82.5515, lat: 35.5951 }, airport: "AVL" },
  { name: "Knoxville", state: "TN", coord: { lng: -83.9207, lat: 35.9606 }, airport: "TYS" },
  { name: "Moab", state: "UT", coord: { lng: -109.5498, lat: 38.5733 }, airport: "CNY" },
  { name: "Springdale", state: "UT", coord: { lng: -113.004, lat: 37.1889 }, airport: "SGU" },
  { name: "Jackson", state: "WY", coord: { lng: -110.7624, lat: 43.4799 }, airport: "JAC" },
  { name: "Bozeman", state: "MT", coord: { lng: -111.0429, lat: 45.677 }, airport: "BZN" },
  { name: "Grand Junction", state: "CO", coord: { lng: -108.5506, lat: 39.0639 }, airport: "GJT" },
  { name: "Palm Springs", state: "CA", coord: { lng: -116.5453, lat: 33.8303 }, airport: "PSP" },
  { name: "Reno", state: "NV", coord: { lng: -119.8138, lat: 39.5296 }, airport: "RNO" },
  { name: "Kailua-Kona", state: "HI", coord: { lng: -155.9969, lat: 19.6399 }, airport: "KOA", aliases: ["kona", "kailua kona"] },
  { name: "Hilo", state: "HI", coord: { lng: -155.082, lat: 19.7074 }, airport: "ITO" },
  { name: "Rapid City", state: "SD", coord: { lng: -103.231, lat: 44.0805 }, airport: "RAP" },
  { name: "Medford", state: "OR", coord: { lng: -122.8756, lat: 42.3265 }, airport: "MFR" },
  { name: "Little Rock", state: "AR", coord: { lng: -92.2896, lat: 34.7465 }, airport: "LIT" },
  { name: "Charleston", state: "SC", coord: { lng: -79.9311, lat: 32.7765 }, airport: "CHS" },
  { name: "Charleston", state: "WV", coord: { lng: -81.6326, lat: 38.3498 }, airport: "CRW", aliases: ["charleston wv", "charleston, wv"] },
];

const CITY_BY_UNIQUE_AIRPORT = (() => {
  const grouped = new Map<string, City[]>();
  for (const city of CITIES) {
    const code = city.airport.toLowerCase();
    const list = grouped.get(code) ?? [];
    list.push(city);
    grouped.set(code, list);
  }
  const unique = new Map<string, City>();
  for (const [code, list] of grouped) {
    if (list.length === 1) unique.set(code, list[0]);
  }
  return unique;
})();

export function findCity(query: string): City | undefined {
  const matches = searchCities(query, 1);
  return matches[0];
}

/** Compact home for share URLs: unique airport (jfk) or `new-york-ny`. */
export function homeUrlToken(home: string): string {
  const known = findCity(home);
  if (!known) return slugText(home).slice(0, 48) || "home";
  const code = known.airport.toLowerCase();
  if (CITY_BY_UNIQUE_AIRPORT.get(code) === known) return code;
  return citySlug(known);
}

export function homeFromUrlToken(token: string): string {
  const key = token.trim().toLowerCase();
  if (!key) return "";
  const byAirport = CITY_BY_UNIQUE_AIRPORT.get(key);
  if (byAirport) return `${byAirport.name}, ${byAirport.state}`;
  const bySlug = CITIES.find((city) => citySlug(city) === key);
  if (bySlug) return `${bySlug.name}, ${bySlug.state}`;
  const restored = unslugHome(key);
  const known = findCity(restored);
  if (known) return `${known.name}, ${known.state}`;
  return restored;
}

function citySlug(city: City): string {
  return `${slugText(city.name)}-${city.state.toLowerCase()}`;
}

function slugText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unslugHome(slug: string): string {
  const match = slug.match(/^([a-z0-9-]+)-([a-z]{2})$/);
  if (match) return `${titleWords(match[1])}, ${match[2].toUpperCase()}`;
  return titleWords(slug);
}

function titleWords(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  const scored = CITIES.map((c) => ({ city: c, score: cityScore(c, q) }))
    .filter((x) => x.score < 99)
    .sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name));
  return scored.slice(0, limit).map((x) => x.city);
}

function cityScore(c: City, q: string): number {
  const full = `${c.name}, ${c.state}`.toLowerCase();
  const name = c.name.toLowerCase();
  if (full === q || name === q) return 0;
  if (c.aliases?.some((a) => a === q)) return 0;
  if (name.startsWith(q) || full.startsWith(q)) return 1;
  if (c.aliases?.some((a) => a.startsWith(q))) return 1;
  if (name.includes(q) || full.includes(q)) return 2;
  if (c.aliases?.some((a) => a.includes(q))) return 2;
  return 99;
}

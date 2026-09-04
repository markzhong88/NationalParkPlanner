import type { CostEstimate, CostLine, TripInput, TripPlan } from "../types";

export type EstimateRequest = {
  home: string;
  homeAirport: string;
  gateway: string;
  gatewayAirport: string;
  parkName: string;
  flying: boolean;
  flightMiles: number;
  adults: number;
  kids: number;
  days: number;
  hotelNights: number;
  startDate: string;
  dateRange: string;
  hotels: string[];
  driveMiles: number;
  highlights: string[];
};

export function hotelRooms(adults: number, kids: number): number {
  const extra = Math.max(0, kids - 2);
  return Math.max(1, Math.ceil((adults + extra) / 2));
}

/** Paying seats on US domestic flights: kids 2+ buy an adult ticket. */
export function payingSeats(adults: number, kids: number): number {
  return Math.max(0, adults) + Math.max(0, kids);
}

/**
 * Round-trip economy USD per paying passenger, 2026 US domestic.
 * Anchored to typical Google Flights ranges (e.g. JFK–SFO ~$450–900 pp,
 * about $1,900–3,500 for four).
 */
export function roundTripFarePerPerson(oneWayMiles: number): { low: number; high: number } {
  const m = Math.max(0, oneWayMiles);
  if (m < 400) return { low: 160, high: 340 };
  if (m < 900) return { low: 220, high: 480 };
  if (m < 1600) return { low: 320, high: 680 };
  if (m < 2200) return { low: 400, high: 820 };
  return { low: 450, high: 900 };
}

export function heuristicEstimate(req: EstimateRequest): CostEstimate {
  const rooms = hotelRooms(req.adults, req.kids);
  const nights = Math.max(1, req.hotelNights);
  const people = payingSeats(req.adults, req.kids);
  const seats = people;
  const pair = flightPair(req);

  let flightsLow = 0;
  let flightsHigh = 0;
  if (req.flying) {
    const fare = roundTripFarePerPerson(req.flightMiles);
    flightsLow = fare.low * seats;
    flightsHigh = fare.high * seats;
  }

  const priceyPark = /yosemite|glacier|yellowstone|zion|canyon|acadia/i.test(req.parkName);
  const hotelNightLow = req.kids > 0 ? (priceyPark ? 220 : 190) : priceyPark ? 180 : 155;
  const hotelNightHigh = req.kids > 0 ? (priceyPark ? 400 : 310) : priceyPark ? 340 : 250;
  const hotelsLow = hotelNightLow * nights * rooms;
  const hotelsHigh = hotelNightHigh * nights * rooms;

  const dayRateLow = req.kids > 0 ? 78 : 58;
  const dayRateHigh = req.kids > 0 ? 125 : 95;
  const rentalLow = dayRateLow * req.days;
  const rentalHigh = dayRateHigh * req.days;

  const foodLow = (req.adults * 42 + req.kids * 24) * req.days;
  const foodHigh = (req.adults * 68 + req.kids * 40) * req.days;

  const extrasLow = 45 + people * (req.highlights.some((h) => /antelope|canyon|grove/i.test(h)) ? 45 : 25);
  const extrasHigh = 90 + people * (req.highlights.some((h) => /antelope|canyon|grove/i.test(h)) ? 95 : 50);

  return finalize({
    flights: {
      low: flightsLow,
      high: flightsHigh,
      note: req.flying
        ? `Round-trip ${pair} for ${seats} traveler${seats === 1 ? "" : "s"} (kids 2+ pay the same as adults)`
        : "No flights — driving from home",
    },
    hotels: {
      low: hotelsLow,
      high: hotelsHigh,
      note: `${nights} nights × ${rooms} room${rooms === 1 ? "" : "s"} near ${req.parkName}`,
    },
    rental: {
      low: rentalLow,
      high: rentalHigh,
      note: `${req.days} days, ${req.kids > 0 ? "SUV" : "midsize"}`,
    },
    food: {
      low: foodLow,
      high: foodHigh,
      note: "Meals and snacks for the group",
    },
    extras: {
      low: extrasLow,
      high: extrasHigh,
      note: "Park entry, tours, and incidentals",
    },
  }, "heuristic");
}

function flightPair(req: EstimateRequest): string {
  const from = req.homeAirport && req.homeAirport !== "Home" ? req.homeAirport : req.home.split(",")[0];
  const to = req.gatewayAirport || req.gateway.split("(")[0].trim();
  return `${from}–${to}`;
}

function finalize(
  lines: Omit<CostEstimate, "currency" | "totalLow" | "totalHigh" | "source" | "disclaimer">,
  source: CostEstimate["source"],
): CostEstimate {
  const keys = ["flights", "hotels", "rental", "food", "extras"] as const;
  const totalLow = keys.reduce((n, k) => n + lines[k].low, 0);
  const totalHigh = keys.reduce((n, k) => n + lines[k].high, 0);
  return {
    currency: "USD",
    ...lines,
    totalLow: Math.round(totalLow),
    totalHigh: Math.round(totalHigh),
    source,
    disclaimer:
      "Ballpark from typical 2026 US prices — not a live Google Flights or hotel quote. Check fares before you budget.",
  };
}

export function requestFromPlan(plan: TripPlan, input: TripInput): EstimateRequest {
  const hotels = [...new Set(plan.days.map((d) => d.stay).filter(Boolean))];
  return {
    home: plan.homeLabel,
    homeAirport: plan.homeAirport,
    gateway: plan.gateway,
    gatewayAirport: plan.gatewayAirport,
    parkName: plan.parkName,
    flying: plan.flying,
    flightMiles: plan.flightMiles,
    adults: input.adults,
    kids: input.kids,
    days: input.days,
    hotelNights: plan.hotelNights,
    startDate: input.startDate,
    dateRange: plan.dateRange,
    hotels,
    driveMiles: plan.totalMiles,
    highlights: plan.highlights,
  };
}

export async function fetchCostEstimate(req: EstimateRequest): Promise<CostEstimate> {
  const fallback = heuristicEstimate(req);
  try {
    const res = await fetch("/api/estimate-cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<CostEstimate> & { error?: string };
    if (data.error || !data.flights) return fallback;
    return normalizeEstimate(data, fallback);
  } catch {
    return fallback;
  }
}

export function normalizeEstimate(raw: Partial<CostEstimate>, fallback: CostEstimate): CostEstimate {
  return finalize(
    {
      flights: clampFlights(raw.flights, fallback.flights),
      hotels: line(raw.hotels, fallback.hotels),
      rental: line(raw.rental, fallback.rental),
      food: line(raw.food, fallback.food),
      extras: line(raw.extras, fallback.extras),
    },
    "openai",
  );
}

function line(a: CostLine | undefined, b: CostLine): CostLine {
  return {
    low: Math.max(0, Math.round(Number(a?.low ?? b.low))),
    high: Math.max(0, Math.round(Number(a?.high ?? b.high))),
    note: String(a?.note || b.note),
  };
}

function clampFlights(ai: CostLine | undefined, floor: CostLine): CostLine {
  const parsed = line(ai, floor);
  if (floor.high === 0 && floor.low === 0) return { ...parsed, low: 0, high: 0 };
  const tooLow = parsed.low < floor.low * 0.7 || parsed.high < floor.low;
  if (tooLow) return { ...floor, note: parsed.note || floor.note };
  return {
    low: Math.max(parsed.low, Math.round(floor.low * 0.85)),
    high: Math.max(parsed.high, parsed.low, Math.round(floor.high * 0.9)),
    note: parsed.note || floor.note,
  };
}

export function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

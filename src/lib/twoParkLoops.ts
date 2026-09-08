import { CITIES, cityLabel, findCity } from "../data/cities";
import {
  CLASSIC_TRIPS,
  classicOutline,
  type ClassicDay,
  type ClassicTrip,
} from "../data/classicTrips";
import {
  BAKED_IN_LOOP,
  nearbyAddons,
  type NearbyAddOn,
} from "../data/nearbyParks";
import { getPark, PARKS_BY_POPULARITY } from "../data/parks";
import type { ParkProfile } from "../types";

export type TwoParkLoop = {
  parkId: string;
  alsoParkId: string;
  park: ParkProfile;
  extra: ParkProfile;
  home: string;
  days: number;
  driveHours: number;
  driveLabel: string;
  classic?: ClassicTrip;
  nights: string[];
  titles: ClassicDay[];
  plannerHref: string;
};

export type ParkPairGuide = {
  park: ParkProfile;
  bakedIn?: string;
  loops: TwoParkLoop[];
};

export function uniqueTwoParkLoops(): TwoParkLoop[] {
  const seen = new Set<string>();
  const loops: TwoParkLoop[] = [];
  for (const trip of CLASSIC_TRIPS.filter((item) => item.alsoParkId)) {
    const loop = loopFromClassic(trip);
    if (!loop) continue;
    seen.add(pairKey(loop.parkId, loop.alsoParkId));
    loops.push(loop);
  }
  for (const park of PARKS_BY_POPULARITY) {
    for (const addon of nearbyAddons(park.id)) {
      const key = pairKey(park.id, addon.id);
      if (seen.has(key)) continue;
      const loop = loopFromAddon(park.id, addon);
      if (!loop) continue;
      seen.add(key);
      loops.push(loop);
    }
  }
  return loops;
}

export function parkPairGuide(parkId: string): ParkPairGuide | null {
  const park = getPark(parkId);
  if (!park) return null;
  const loops = nearbyAddons(parkId)
    .map((addon) => loopFromAddon(parkId, addon) ?? loopFromEitherDirection(parkId, addon.id))
    .filter((loop): loop is TwoParkLoop => Boolean(loop));
  if (!loops.length && !BAKED_IN_LOOP[parkId]) return null;
  return {
    park,
    bakedIn: BAKED_IN_LOOP[parkId],
    loops,
  };
}

export function allParkPairGuides(): ParkPairGuide[] {
  return PARKS_BY_POPULARITY.map((park) => parkPairGuide(park.id)).filter(
    (guide): guide is ParkPairGuide => Boolean(guide),
  );
}

function loopFromClassic(trip: ClassicTrip): TwoParkLoop | null {
  if (!trip.alsoParkId) return null;
  const park = getPark(trip.parkId);
  const extra = getPark(trip.alsoParkId);
  const addon = nearbyAddons(trip.parkId).find((item) => item.id === trip.alsoParkId);
  if (!park || !extra || !addon) return null;
  const outline = classicOutline(trip);
  if (!outline) return null;
  return {
    parkId: trip.parkId,
    alsoParkId: trip.alsoParkId,
    park,
    extra,
    home: trip.home,
    days: trip.days,
    driveHours: addon.driveHours,
    driveLabel: addon.driveLabel,
    classic: trip,
    nights: outline.stops.map((stop) => stop.name),
    titles: outline.days,
    plannerHref: outline.plannerHref,
  };
}

function loopFromAddon(parkId: string, addon: NearbyAddOn): TwoParkLoop | null {
  const classic = CLASSIC_TRIPS.find(
    (trip) =>
      (trip.parkId === parkId && trip.alsoParkId === addon.id) ||
      (trip.parkId === addon.id && trip.alsoParkId === parkId),
  );
  if (classic) return loopFromClassic(classic);
  const park = getPark(parkId);
  const extra = getPark(addon.id);
  if (!park || !extra) return null;
  const home = gatewayHome(park);
  const trip: ClassicTrip = {
    slug: `${parkId}-${addon.id}-${addon.minDays}-day`,
    title: `${addon.minDays}-day ${park.shortName} and ${extra.shortName} trip`,
    description: park.blurb,
    parkId,
    alsoParkId: addon.id,
    home,
    days: addon.minDays,
    adults: 2,
    kids: 2,
    covers: [],
  };
  const outline = classicOutline(trip);
  if (!outline) return null;
  return {
    parkId,
    alsoParkId: addon.id,
    park,
    extra,
    home,
    days: addon.minDays,
    driveHours: addon.driveHours,
    driveLabel: addon.driveLabel,
    nights: outline.stops.map((stop) => stop.name),
    titles: outline.days,
    plannerHref: outline.plannerHref,
  };
}

function loopFromEitherDirection(parkId: string, alsoParkId: string): TwoParkLoop | null {
  const reverse = nearbyAddons(alsoParkId).find((item) => item.id === parkId);
  if (!reverse) return null;
  return loopFromAddon(alsoParkId, reverse);
}

function gatewayHome(park: ParkProfile): string {
  const byName = findCity(park.gateway.city);
  if (byName) return cityLabel(byName);
  const byAirport = CITIES.find((city) => city.airport === park.gateway.airport);
  if (byAirport) return cityLabel(byAirport);
  return park.gateway.city;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("~");
}

export function parksThatPair(): ParkProfile[] {
  return PARKS_BY_POPULARITY.filter(
    (park) => nearbyAddons(park.id).length > 0 || Boolean(BAKED_IN_LOOP[park.id]),
  );
}

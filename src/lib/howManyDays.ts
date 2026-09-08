import { CITIES, cityLabel, findCity } from "../data/cities";
import { classicOutline, type ClassicDay, type ClassicTrip } from "../data/classicTrips";
import { getPark, PARKS_BY_POPULARITY } from "../data/parks";
import type { ParkProfile } from "../types";

export const DAY_OPTIONS = [3, 5, 7] as const;
export type DayOption = (typeof DAY_OPTIONS)[number];

export type LengthPlan = {
  days: DayOption;
  nights: string[];
  titles: ClassicDay[];
  plannerHref: string;
};

export type ParkDaysGuide = {
  park: ParkProfile;
  home: string;
  recommended: DayOption;
  options: LengthPlan[];
};

export function gatewayHome(park: ParkProfile): string {
  const byName = findCity(park.gateway.city);
  if (byName) return cityLabel(byName);
  const byAirport = CITIES.find((city) => city.airport === park.gateway.airport);
  if (byAirport) return cityLabel(byAirport);
  return park.gateway.city;
}

export function recommendedDays(park: ParkProfile): DayOption {
  const areas = new Set(park.blocks.map((block) => block.areaId));
  if (areas.size >= 3) return 7;
  if (areas.size >= 2) return 5;
  const nights = park.blocks.reduce((sum, block) => sum + block.stayNights, 0);
  return nights >= 3 ? 5 : 3;
}

export function parkDaysGuide(parkId: string): ParkDaysGuide | null {
  const park = getPark(parkId);
  if (!park) return null;
  const home = gatewayHome(park);
  const options = DAY_OPTIONS.flatMap((days) => {
    const plan = lengthPlan(park, home, days);
    return plan ? [plan] : [];
  });
  if (!options.length) return null;
  return {
    park,
    home,
    recommended: recommendedDays(park),
    options,
  };
}

export function allParkDaysGuides(): ParkDaysGuide[] {
  return PARKS_BY_POPULARITY.map((park) => parkDaysGuide(park.id)).filter(
    (guide): guide is ParkDaysGuide => Boolean(guide),
  );
}

function lengthPlan(park: ParkProfile, home: string, days: DayOption): LengthPlan | null {
  const trip: ClassicTrip = {
    slug: `${park.id}-${days}-day`,
    title: `${days}-day ${park.shortName} trip`,
    description: park.blurb,
    parkId: park.id,
    home,
    days,
    adults: 2,
    kids: 2,
    covers: [],
  };
  const outline = classicOutline(trip);
  if (!outline) return null;
  return {
    days,
    nights: outline.stops.map((stop) => stop.name),
    titles: outline.days,
    plannerHref: outline.plannerHref,
  };
}

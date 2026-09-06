import { resolvePark } from "./nearbyParks";
import { getPark } from "./parks";
import type { ExploreBlock, ParkProfile, StayArea } from "../types";

export type ClassicTrip = {
  slug: string;
  title: string;
  description: string;
  parkId: string;
  alsoParkId?: string;
  home: string;
  days: number;
  adults: number;
  kids: number;
  /** Landmark ids used as cover photos on the classic-trips hub. */
  covers: string[];
};

/** Search-style classic loops — top visited parks, gateway as home. */
export const CLASSIC_TRIPS: ClassicTrip[] = [
  {
    slug: "grand-canyon-7-day",
    title: "7-day Grand Canyon family road trip",
    description:
      "A 7-day Grand Canyon itinerary from Phoenix: Sedona, Page and Horseshoe Bend, then the South Rim. Daily plan, overnight towns, and a map.",
    parkId: "grand-canyon",
    home: "Phoenix, AZ",
    days: 7,
    adults: 2,
    kids: 2,
    covers: ["south-rim"],
  },
  {
    slug: "zion-7-day",
    title: "7-day Zion National Park road trip",
    description:
      "A 7-day Zion itinerary from Las Vegas, with Springdale as a base and a Bryce Canyon side trip. Daily plan, overnight towns, and a map.",
    parkId: "zion",
    home: "Las Vegas, NV",
    days: 7,
    adults: 2,
    kids: 2,
    covers: ["zion-narrows"],
  },
  {
    slug: "yellowstone-7-day",
    title: "7-day Yellowstone family road trip",
    description:
      "A 7-day Yellowstone itinerary from Bozeman: Old Faithful, Grand Prismatic, Artist Point, and Hayden Valley. Daily plan and a map.",
    parkId: "yellowstone",
    home: "Bozeman, MT",
    days: 7,
    adults: 2,
    kids: 2,
    covers: ["prismatic"],
  },
  {
    slug: "yosemite-7-day",
    title: "7-day Yosemite road trip from San Francisco",
    description:
      "A 7-day Yosemite itinerary from San Francisco: the valley, Glacier Point, and the sequoias, with nights in the valley and Mariposa.",
    parkId: "yosemite",
    home: "San Francisco, CA",
    days: 7,
    adults: 2,
    kids: 2,
    covers: ["half-dome"],
  },
  {
    slug: "great-smoky-mountains-7-day",
    title: "7-day Great Smoky Mountains road trip",
    description:
      "A 7-day Smokies itinerary from Knoxville: Gatlinburg, quiet motor roads, and a Cherokee-side day. Daily plan, overnight towns, and a map.",
    parkId: "great-smoky",
    home: "Knoxville, TN",
    days: 7,
    adults: 2,
    kids: 2,
    covers: ["clingmans"],
  },
  {
    slug: "zion-grand-canyon-8-day",
    title: "8-day Zion and Grand Canyon road trip",
    description:
      "An 8-day two-park loop from Las Vegas: Zion Canyon, Bryce, then the Grand Canyon South Rim. A classic Southwest drive with a day-by-day plan.",
    parkId: "zion",
    alsoParkId: "grand-canyon",
    home: "Las Vegas, NV",
    days: 8,
    adults: 2,
    kids: 2,
    covers: ["zion-narrows", "south-rim"],
  },
];

export type ClassicDay = {
  day: number;
  title: string;
  stay: string;
  items: string[];
};

export type ClassicOutline = {
  trip: ClassicTrip;
  park: ParkProfile;
  days: ClassicDay[];
  stops: { name: string; coord: { lng: number; lat: number } }[];
  photos: { name: string; src: string }[];
  plannerHref: string;
};

export function classicTripBySlug(slug: string): ClassicTrip | undefined {
  return CLASSIC_TRIPS.find((trip) => trip.slug === slug);
}

export function classicOutline(trip: ClassicTrip): ClassicOutline | null {
  const park = resolvePark(trip.parkId, trip.alsoParkId);
  if (!park) return null;
  const destNights = Math.max(1, trip.days - 1);
  const allocations = allocateBlocks(park.blocks, destNights, true);
  const nights: { area: StayArea; block: ExploreBlock }[] = [];
  for (const alloc of allocations) {
    const area = park.stayAreas.find((item) => item.id === alloc.block.areaId);
    if (!area) continue;
    for (let i = 0; i < alloc.nights; i++) nights.push({ area, block: alloc.block });
  }
  if (!nights.length) return null;

  const homeName = trip.home.split(",")[0];
  const days: ClassicDay[] = [];
  let prev: StayArea | null = null;

  for (let i = 0; i < trip.days; i++) {
    const isLast = i === trip.days - 1;
    if (i === 0) {
      const stay = nights[0];
      days.push({
        day: 1,
        title: `${homeName} → ${stay.area.name}`,
        stay: stay.area.lodging,
        items: [
          `Leave ${homeName} after breakfast`,
          `Drive to ${stay.area.name}`,
          "Check in and an easy first evening",
          ...(stay.block.travelDayActivities ?? stay.block.familyActivities ?? stay.block.activities).slice(0, 2),
        ].slice(0, 4),
      });
      prev = stay.area;
      continue;
    }
    if (isLast) {
      const last = nights[nights.length - 1] ?? nights[0];
      days.push({
        day: i + 1,
        title: `${last.area.name} → ${homeName}`,
        stay: `Home in ${homeName}`,
        items: [
          "Easy morning if checkout allows",
          `Drive ${last.area.name} → ${homeName}`,
          "Unpack and save the photos",
        ],
      });
      continue;
    }
    const stay = nights[i] ?? nights[nights.length - 1];
    const moved = Boolean(prev && prev.id !== stay.area.id);
    const family = stay.block.familyActivities ?? stay.block.activities;
    days.push({
      day: i + 1,
      title: moved ? `${prev!.name} → ${stay.area.name}` : stay.block.label,
      stay: stay.area.lodging,
      items: moved
        ? [
            `Drive ${prev!.name} → ${stay.area.name}`,
            ...(stay.block.travelDayActivities ?? family).slice(0, 3),
          ].slice(0, 4)
        : ["Stay local — no long drive.", ...(stay.block.fullDayActivities ?? family).slice(0, 3)].slice(0, 4),
    });
    prev = stay.area;
  }

  const seen = new Set<string>();
  const stops = nights
    .map((night) => night.area)
    .filter((area) => {
      if (seen.has(area.id)) return false;
      seen.add(area.id);
      return true;
    })
    .map((area) => ({ name: area.name, coord: area.coord }));

  const photos = park.landmarks
    .filter((lm) => lm.photo)
    .slice(0, 6)
    .map((lm) => ({ name: lm.name, src: lm.photo as string }));

  const q = new URLSearchParams();
  q.set("park", trip.parkId);
  if (trip.alsoParkId) q.set("also", trip.alsoParkId);
  q.set("from", trip.home);
  q.set("adults", String(trip.adults));
  q.set("kids", String(trip.kids));
  q.set("days", String(trip.days));

  return {
    trip,
    park,
    days,
    stops,
    photos,
    plannerHref: `/?${q.toString()}`,
  };
}

export function classicTripCards(): {
  trip: ClassicTrip;
  parkName: string;
  blurb: string;
  photos: { src: string; alt: string }[];
}[] {
  return CLASSIC_TRIPS.map((trip) => {
    const park = getPark(trip.parkId);
    const extra = trip.alsoParkId ? getPark(trip.alsoParkId) : undefined;
    const searchParks = [park, extra].filter(Boolean);
    const photos = trip.covers
      .map((id) => {
        for (const profile of searchParks) {
          const landmark = profile!.landmarks.find((item) => item.id === id && item.photo);
          if (landmark?.photo) return { src: landmark.photo, alt: landmark.name };
        }
        return undefined;
      })
      .filter((item): item is { src: string; alt: string } => Boolean(item));
    return {
      trip,
      parkName: extra ? `${park?.shortName} & ${extra.shortName}` : (park?.shortName ?? trip.title),
      blurb: extra
        ? `${park?.shortName} plus ${extra.shortName} on one drive.`
        : (park?.blurb ?? trip.description),
      photos,
    };
  });
}

function allocateBlocks(
  blocks: ExploreBlock[],
  destinationNights: number,
  family: boolean,
): { block: ExploreBlock; nights: number }[] {
  if (blocks.length === 0 || destinationNights <= 0) return [];
  const maxBlocks =
    destinationNights === 1 ? 1 : destinationNights === 2 ? Math.min(2, blocks.length) : blocks.length;
  const chosen = blocks.slice(0, maxBlocks);
  const nights = chosen.map(() => 1);
  let remaining = destinationNights - chosen.length;
  let i = 0;
  while (remaining > 0) {
    const preferTwo = family || chosen[i].stayNights >= 2;
    if (preferTwo || chosen.length === 1) {
      nights[i] += 1;
      remaining -= 1;
    } else {
      nights[i] += 1;
      remaining -= 1;
    }
    i = (i + 1) % chosen.length;
  }
  return chosen.map((block, idx) => ({ block, nights: nights[idx] }));
}

import { getPark } from "../data/parks";
import { findCity } from "../data/cities";
import type {
  Coordinates,
  DayPlan,
  DriveLeg,
  ExploreBlock,
  MapStop,
  ParkProfile,
  StayArea,
  TripInput,
  TripPlan,
} from "../types";
import {
  addDays,
  dayColor,
  formatDateRange,
  parseISODate,
  travelerLabel,
} from "./format";
import { fetchDrivingRoute, formatHours, geocodePlace, haversineMiles, estimateDriveHours } from "./geo";

const FLY_THRESHOLD_MILES = 380;

type NightStay = {
  area: StayArea;
  block: ExploreBlock | null;
  isGatewayReturn: boolean;
};

export async function generateTrip(input: TripInput): Promise<TripPlan> {
  const park = getPark(input.parkId);
  if (!park) throw new Error("Unknown park");

  const home = await resolveHome(input.home);
  const distanceToGateway = haversineMiles(home.coord, park.gateway.coord);
  const homeIsGateway =
    distanceToGateway < 35 ||
    home.label.toLowerCase().includes(park.gateway.city.toLowerCase());
  const oceanPark = park.state === "Hawaii";
  const flying = oceanPark
    ? distanceToGateway > 80
    : !homeIsGateway && distanceToGateway > FLY_THRESHOLD_MILES;
  const people = input.adults + input.kids;
  const family = input.kids > 0 || people >= 3;
  const start = parseISODate(input.startDate);

  const gatewayReturnNight = flying && input.days >= 6;
  const destinationNights = Math.max(1, input.days - 1 - (gatewayReturnNight ? 1 : 0));
  const allocations = allocateBlocks(park.blocks, destinationNights, family);

  const nights: NightStay[] = [];
  for (const alloc of allocations) {
    const area = mustArea(park, alloc.block.areaId);
    for (let i = 0; i < alloc.nights; i++) {
      nights.push({ area, block: alloc.block, isGatewayReturn: false });
    }
  }
  if (gatewayReturnNight) {
    nights.push({
      area: gatewayArea(park),
      block: null,
      isGatewayReturn: true,
    });
  }

  while (nights.length < input.days - 1 && allocations[0]) {
    nights.splice(nights.length - (gatewayReturnNight ? 1 : 0), 0, {
      area: mustArea(park, allocations[0].block.areaId),
      block: allocations[0].block,
      isGatewayReturn: false,
    });
  }

  const days = buildDays({
    park,
    home,
    flying,
    family,
    start,
    totalDays: input.days,
    nights,
  });

  const originName = flying ? park.gateway.city : home.label.split(",")[0];
  const originCoord = flying ? park.gateway.coord : home.coord;
  const mapStops = buildMapStops(days, park, nights, originCoord, originName);
  const usedAreaIds = new Set(nights.map((n) => n.area.id));
  const landmarks = park.landmarks
    .filter((lm) => {
      if (park.id === "grand-canyon") {
        if (lm.id === "cathedral-rock") return usedAreaIds.has("sedona");
        if (lm.id === "horseshoe-bend" || lm.id === "antelope") return usedAreaIds.has("page");
        if (lm.id === "south-rim" || lm.id === "desert-view" || lm.id === "yavapai") {
          return usedAreaIds.has("grand-canyon");
        }
      }
      return true;
    })
    .map((lm) => ({ ...lm, days: daysForCoord(lm.coord, days) }));

  const routeWaypoints = waypointsFromDays(days, originCoord);
  const routed = await fetchDrivingRoute(routeWaypoints);
  const driveLegs = attachDriveLegs(days, routed);
  const totalMiles = routed?.miles ?? Math.round(park.typicalLoopMiles * (destinationNights / 5));
  const startPoint = {
    name: originName,
    coord: originCoord,
  };
  const endPoint = {
    name: flying ? park.gateway.city : home.label.split(",")[0],
    coord: flying ? park.gateway.coord : home.coord,
  };
  const coordsForBounds = [
    ...mapStops.map((s) => s.coord),
    ...landmarks.map((l) => l.coord),
    startPoint.coord,
    endPoint.coord,
  ];

  const year = start.getFullYear();
  const crowd = family ? "FAMILY" : people === 2 ? "WEEKEND" : "ROAD";
  const title = `${year} ${park.regionTitle.toUpperCase()} ${crowd} ROAD TRIP`;

  return {
    title,
    subtitle: uniqueNames([
      ...allocations.map((a) => a.block.label.replace(/&/g, "•")),
      park.shortName,
    ]).join("  •  "),
    dateRange: formatDateRange(start, input.days),
    travelers: travelerLabel(input.adults, input.kids),
    styleNote: family
      ? "A relaxed family trip: mornings and evenings outside, drives in the heat of the day, and time to swim."
      : "A scenic loop with the headline viewpoints, a sane drive each day, and a sunset worth stopping for.",
    highlights: allocations.slice(0, 4).map((a) => a.block.label),
    days,
    mapStops,
    landmarks,
    driveLegs,
    totalMiles,
    totalKm: Math.round(totalMiles * 1.609),
    flying,
    gateway: `${park.gateway.city} (${park.gateway.airport})`,
    bounds: boundsOf(coordsForBounds),
    routeWaypoints,
    routeGeometry: routed?.geometry.coordinates ?? routeWaypoints.map((p) => [p.lng, p.lat]),
    homeLabel: home.label,
    homeAirport: home.airport,
    gatewayAirport: park.gateway.airport,
    flightMiles: flying ? Math.round(haversineMiles(home.coord, park.gateway.coord)) : 0,
    parkName: park.shortName,
    adults: input.adults,
    kids: input.kids,
    hotelNights: nights.length,
    startPoint,
    endPoint,
  };
}

async function resolveHome(query: string): Promise<{ label: string; coord: Coordinates; airport: string }> {
  const known = findCity(query);
  if (known) {
    return {
      label: `${known.name}, ${known.state}`,
      coord: known.coord,
      airport: known.airport,
    };
  }
  const geo = await geocodePlace(query);
  if (geo) {
    return { label: query.trim(), coord: geo, airport: "Home" };
  }
  return {
    label: query.trim() || "Home",
    coord: { lng: -74.006, lat: 40.7128 },
    airport: "Home",
  };
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

function buildDays(args: {
  park: ParkProfile;
  home: { label: string; coord: Coordinates; airport: string };
  flying: boolean;
  family: boolean;
  start: Date;
  totalDays: number;
  nights: NightStay[];
}): DayPlan[] {
  const { park, home, flying, family, start, totalDays, nights } = args;
  const days: DayPlan[] = [];
  let prevArea: StayArea | null = null;

  for (let i = 0; i < totalDays; i++) {
    const isLast = i === totalDays - 1;
    const night = nights[i] ?? null;
    const date = addDays(start, i);
    const color = dayColor(i);

    if (i === 0) {
      const stay = night ?? nights[0];
      const dest = stay?.area ?? mustArea(park, park.blocks[0].areaId);
      const from = flying ? park.gateway.city : home.label.split(",")[0];
      const driveHours = flying
        ? stay?.block?.driveHoursFromPrev ?? 2
        : estimateDriveHours(home.coord, dest.coord);
      days.push({
        day: 1,
        date,
        color,
        title: dest.name,
        route: `${from} → ${dest.name}`,
        driveHours,
        driveLabel: formatHours(driveHours),
        activities: arrivalActivities({
          park,
          home,
          flying,
          family,
          destName: dest.name,
          driveHours,
        }),
        stay: lodgingFor(dest, family),
        stayPlace: dest.name,
        coord: dest.coord,
      });
      prevArea = dest;
      continue;
    }

    if (isLast) {
      const lastNight = nights[nights.length - 1];
      const fromName = lastNight?.isGatewayReturn
        ? park.gateway.city
        : lastNight?.area.name ?? park.shortName;
      const driveHours = flying
        ? 0.5
        : estimateDriveHours(lastNight?.area.coord ?? park.coord, home.coord);
      days.push({
        day: i + 1,
        date,
        color,
        title: flying ? "Fly home" : `Return to ${home.label.split(",")[0]}`,
        route: flying ? `${park.gateway.city} → ${home.label.split(",")[0]}` : `${fromName} → ${home.label.split(",")[0]}`,
        driveHours,
        driveLabel: flying ? "Airport run" : formatHours(driveHours),
        activities: departureActivities(park, home, flying, family, fromName),
        stay: flying ? "Overnight flight / home" : `Home in ${home.label.split(",")[0]}`,
        stayPlace: flying ? park.gateway.city : home.label.split(",")[0],
        coord: flying ? park.gateway.coord : home.coord,
      });
      continue;
    }

    const stay = night!;
    if (stay.isGatewayReturn) {
      const from = prevArea?.name ?? park.shortName;
      const driveHours = 3.5;
      days.push({
        day: i + 1,
        date,
        color,
        title: park.gateway.city,
        route: `${from} → ${park.gateway.city}`,
        driveHours,
        driveLabel: formatHours(driveHours),
        activities: gatewayReturnActivities(park, family),
        stay: lodgingFor(gatewayArea(park), family),
        stayPlace: park.gateway.city,
        coord: park.gateway.coord,
      });
      prevArea = gatewayArea(park);
      continue;
    }

    const moved = Boolean(prevArea && prevArea.id !== stay.area.id);
    const driveHours = moved ? stay.block?.driveHoursFromPrev ?? 2 : 0.6;
    const acts = activitiesFor({
      block: stay.block,
      family,
      moved,
      fromName: prevArea?.name ?? park.gateway.city,
    });
    days.push({
      day: i + 1,
      date,
      color,
      title: stay.block?.label ?? stay.area.name,
      route: moved ? `${prevArea!.name} → ${stay.area.name}` : undefined,
      driveHours,
      driveLabel: formatHours(driveHours),
      activities: acts,
      stay: lodgingFor(stay.area, family),
      stayPlace: stay.area.name,
      coord: stay.area.coord,
    });
    prevArea = stay.area;
  }

  return days;
}

function arrivalActivities(args: {
  park: ParkProfile;
  home: { label: string; airport: string };
  flying: boolean;
  family: boolean;
  destName: string;
  driveHours: number;
}): string[] {
  const items: string[] = [];
  if (args.flying) {
    items.push(`Fly ${args.home.airport} → ${args.park.gateway.airport}`);
    items.push(`Pick up a rental ${args.family ? "SUV" : "car"} in ${args.park.gateway.city}`);
    if (args.family) {
      items.push("Stock up on water, snacks, and sunscreen");
      if (args.park.gateway.city === "Phoenix") items.push("Lunch at In-N-Out before the drive");
    }
  } else {
    items.push(`Leave ${args.home.label.split(",")[0]} after breakfast`);
  }
  items.push(`Drive to ${args.destName} (${formatHours(args.driveHours)})`);
  items.push(`Check in and settle at the hotel`);
  if (args.family) items.push("Pool time and an easy dinner nearby");
  else items.push("Golden-hour walk near the hotel");
  return items;
}

function departureActivities(
  park: ParkProfile,
  home: { label: string; airport: string },
  flying: boolean,
  family: boolean,
  fromName: string,
): string[] {
  if (flying) {
    return [
      "Easy morning — breakfast and a short walk if time allows",
      `Drive to ${park.gateway.airport} and return the rental`,
      `Fly ${park.gateway.airport} → ${home.airport}`,
      family ? "Keep a small bag of snacks for the flight" : "Land and head home",
    ];
  }
  return [
    family ? "Breakfast and a last hotel splash if checkout allows" : "Sunrise coffee and a last overlook if it's close",
    `Drive ${fromName} → ${home.label.split(",")[0]}`,
    "Unpack, stretch, save the photos",
  ];
}

function gatewayReturnActivities(park: ParkProfile, family: boolean): string[] {
  if (park.gateway.city === "Phoenix") {
    return [
      family ? "Optional Grand Canyon sunrise before you roll south" : "South Rim sunrise, then the long drive south",
      `Drive to Phoenix (${formatHours(3.75)})`,
      family ? "Mesa Asian District — Mekong Plaza or H Mart for snacks" : "Coffee stop in Flagstaff",
      family ? "Family dinner at Haidilao Hot Pot" : "Dinner near the airport",
    ];
  }
  if (park.gateway.city === "Las Vegas") {
    return [
      "Drive back to Las Vegas",
      "Return-the-car buffer at the Strip or downtown",
      family ? "Easy dinner and an early night before the flight" : "Evening on the Strip if energy remains",
    ];
  }
  return [
    `Drive back to ${park.gateway.city}`,
    "Return-car buffer and a good dinner",
    "Airport hotel for the morning flight",
  ];
}

function activitiesFor(args: {
  block: ExploreBlock | null;
  family: boolean;
  moved: boolean;
  fromName: string;
}): string[] {
  const { block, family, moved, fromName } = args;
  if (!block) return ["Open day — rest, swim, or revisit a favorite overlook"];
  const full = family && block.familyActivities ? [...block.familyActivities] : [...block.activities];
  if (moved) {
    const evening =
      block.travelDayActivities ??
      (block.stayNights >= 2 ? full.slice(0, Math.max(2, Math.ceil(full.length / 2))) : full);
    return [
      `Drive ${fromName} → ${block.label.split("&")[0].trim()} (${formatHours(block.driveHoursFromPrev)})`,
      ...evening,
    ];
  }
  return ["No long drive today — stay local.", ...(block.fullDayActivities ?? full)];
}

function lodgingFor(area: StayArea, family: boolean): string {
  if (area.lodgingKind !== "named") return area.lodging;
  return (family && area.lodgingFamily) || area.lodging;
}

function mustArea(park: ParkProfile, id: string): StayArea {
  const found = park.stayAreas.find((a) => a.id === id);
  if (!found) throw new Error(`Missing stay area ${id}`);
  return found;
}

function gatewayArea(park: ParkProfile): StayArea {
  const existing = park.stayAreas.find(
    (a) => a.name.toLowerCase() === park.gateway.city.toLowerCase() || a.id.includes("gateway") || a.id === "phoenix" || a.id === "vegas" || a.id === "palm-springs",
  );
  return (
    existing ?? {
      id: "gateway",
      name: park.gateway.city,
      coord: park.gateway.coord,
      lodging: `Airport hotel in ${park.gateway.city}`,
      lodgingKind: "area",
    }
  );
}

function buildMapStops(
  days: DayPlan[],
  park: ParkProfile,
  nights: NightStay[],
  origin: Coordinates,
  originName: string,
): MapStop[] {
  const stops: MapStop[] = [];
  const seen = new Set<string>();

  const add = (id: string, name: string, coord: Coordinates, kind: MapStop["kind"]) => {
    const key = name.toLowerCase();
    if (seen.has(id) || seen.has(key)) return;
    seen.add(id);
    seen.add(key);
    const linked = days
      .filter((d) => d.stayPlace.toLowerCase() === key || nearby(d.coord, coord))
      .map((d) => d.day);
    if (id === "origin" && !linked.includes(1)) linked.unshift(1);
    stops.push({
      id,
      name,
      coord,
      color: dayColor((linked[0] ?? 1) - 1),
      overnight: true,
      kind,
      days: linked,
    });
  };

  add("origin", originName, origin, "city");
  for (const night of nights) {
    const isPark = night.area.id.includes("canyon") || night.area.id === park.id;
    add(night.area.id, night.area.name, night.area.coord, isPark ? "park" : "city");
  }
  return stops;
}

function nearby(a: Coordinates, b: Coordinates): boolean {
  return Math.abs(a.lat - b.lat) < 0.12 && Math.abs(a.lng - b.lng) < 0.12;
}

function daysForCoord(coord: Coordinates, days: DayPlan[]): number[] {
  const close = days.filter((d) => nearby(d.coord, coord));
  if (close.length) return close.map((d) => d.day);
  let best = days[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const d of days) {
    const dist = haversineMiles(d.coord, coord);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best ? [best.day] : [];
}

function waypointsFromDays(days: DayPlan[], origin: Coordinates): Coordinates[] {
  const pts: Coordinates[] = [origin];
  for (const d of days) {
    const prev = pts[pts.length - 1];
    if (Math.abs(prev.lat - d.coord.lat) < 0.04 && Math.abs(prev.lng - d.coord.lng) < 0.04) continue;
    pts.push(d.coord);
  }
  return pts;
}

function attachDriveLegs(
  days: DayPlan[],
  routed: Awaited<ReturnType<typeof fetchDrivingRoute>>,
): DriveLeg[] {
  const moving = days.filter((d) => d.route && d.driveHours >= 0.75);
  return moving.map((d, i) => {
    const osrm = routed?.legs[i];
    if (osrm && osrm.hours > 0) {
      d.driveHours = osrm.hours;
      d.driveLabel = formatHours(osrm.hours);
      d.activities = d.activities.map((line) =>
        /^Drive to /.test(line) ? `Drive to ${d.stayPlace} (${d.driveLabel})` : line,
      );
    }
    const [from, to] = (d.route ?? "→").split("→").map((part) => part.trim());
    return {
      day: d.day,
      from: from ?? "",
      to: to ?? "",
      hours: d.driveHours,
      label: d.driveLabel,
      geometry: osrm?.geometry ?? [],
    };
  });
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function boundsOf(coords: Coordinates[]): TripPlan["bounds"] {
  return {
    minLng: Math.min(...coords.map((c) => c.lng)),
    minLat: Math.min(...coords.map((c) => c.lat)),
    maxLng: Math.max(...coords.map((c) => c.lng)),
    maxLat: Math.max(...coords.map((c) => c.lat)),
  };
}

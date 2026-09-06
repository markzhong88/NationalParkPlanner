import type { ExploreBlock, Landmark, ParkProfile, StayArea } from "../types";
import { haversineMiles } from "../lib/geo";
import { getPark } from "./parks";

export type NearbyAddOn = {
  id: string;
  minDays: number;
  driveHours: number;
  driveLabel: string;
  /** Explore blocks to take from the extra park. Default: all. */
  blockIds?: string[];
  /** If set, only these primary-park blocks stay on the combined loop. */
  primaryBlockIds?: string[];
  place?: "before" | "after";
};

/** Curated two-park loops only — parks that share a real drive, not an arbitrary pair. */
export const NEARBY_ADDONS: Record<string, NearbyAddOn[]> = {
  zion: [
    {
      id: "grand-canyon",
      minDays: 8,
      driveHours: 4.5,
      driveLabel: "4.5 hr drive",
      blockIds: ["south-rim"],
    },
    {
      id: "capitol-reef",
      minDays: 7,
      driveHours: 3,
      driveLabel: "3 hr drive",
      blockIds: ["fruita-day"],
    },
  ],
  "grand-canyon": [
    {
      id: "zion",
      minDays: 8,
      driveHours: 4.5,
      driveLabel: "4.5 hr drive",
      blockIds: ["zion-valley"],
      primaryBlockIds: ["south-rim"],
    },
  ],
  "bryce-canyon": [
    {
      id: "zion",
      minDays: 6,
      driveHours: 1.8,
      driveLabel: "2 hr drive",
      blockIds: ["zion-valley"],
    },
    {
      id: "capitol-reef",
      minDays: 5,
      driveHours: 2,
      driveLabel: "2 hr drive",
      blockIds: ["fruita-day"],
    },
  ],
  "capitol-reef": [
    {
      id: "arches",
      minDays: 6,
      driveHours: 2.5,
      driveLabel: "2.5 hr drive",
      blockIds: ["arches"],
    },
    {
      id: "bryce-canyon",
      minDays: 5,
      driveHours: 2,
      driveLabel: "2 hr drive",
      blockIds: ["amphitheater"],
    },
  ],
  arches: [
    {
      id: "capitol-reef",
      minDays: 5,
      driveHours: 2.5,
      driveLabel: "2.5 hr drive",
      blockIds: ["fruita-day"],
    },
  ],
  "joshua-tree": [
    {
      id: "death-valley",
      minDays: 6,
      driveHours: 3.5,
      driveLabel: "3.5 hr drive",
      blockIds: ["basin"],
      primaryBlockIds: ["park"],
    },
  ],
  "death-valley": [
    {
      id: "joshua-tree",
      minDays: 6,
      driveHours: 3.5,
      driveLabel: "3.5 hr drive",
      blockIds: ["park"],
      primaryBlockIds: ["basin"],
    },
  ],
  yosemite: [
    {
      id: "sequoia",
      minDays: 6,
      driveHours: 4,
      driveLabel: "4 hr drive",
      blockIds: ["giant-forest"],
      primaryBlockIds: ["valley"],
    },
  ],
  sequoia: [
    {
      id: "yosemite",
      minDays: 6,
      driveHours: 4,
      driveLabel: "4 hr drive",
      blockIds: ["valley"],
      primaryBlockIds: ["giant-forest"],
    },
  ],
  olympic: [
    {
      id: "mount-rainier",
      minDays: 6,
      driveHours: 3,
      driveLabel: "3 hr drive",
      blockIds: ["paradise"],
    },
  ],
  "mount-rainier": [
    {
      id: "olympic",
      minDays: 6,
      driveHours: 3,
      driveLabel: "3 hr drive",
      blockIds: ["hurricane"],
    },
  ],
  "grand-teton": [
    {
      id: "yellowstone",
      minDays: 7,
      driveHours: 2.5,
      driveLabel: "2.5 hr drive",
      blockIds: ["geysers"],
    },
  ],
  yellowstone: [
    {
      id: "grand-teton",
      minDays: 8,
      driveHours: 2.5,
      driveLabel: "2.5 hr drive",
      blockIds: ["jenny"],
    },
  ],
};

export const BAKED_IN_LOOP: Record<string, string> = {
  zion: "Longer Zion trips already include a Bryce Canyon day.",
  arches: "Longer Arches trips already include Canyonlands.",
  sequoia: "Sequoia trips already include Grant Grove in Kings Canyon.",
  olympic: "Olympic is already ridge, rainforest, and coast in one loop.",
  "grand-canyon": "Grand Canyon trips already loop Sedona and Page when you have the days.",
  "key-west": "This plan already includes a Dry Tortugas ferry day.",
  badlands: "Badlands trips already include Mount Rushmore.",
};

export function nearbyAddons(parkId: string): NearbyAddOn[] {
  return (NEARBY_ADDONS[parkId] ?? []).filter((addon) => addon.id !== parkId && getPark(addon.id));
}

export function nearbyAddon(parkId: string, alsoParkId: string | undefined): NearbyAddOn | undefined {
  if (!alsoParkId) return undefined;
  return nearbyAddons(parkId).find((addon) => addon.id === alsoParkId);
}

export function parkLabel(parkId: string, alsoParkId?: string): string {
  const park = getPark(parkId);
  const extra = alsoParkId ? getPark(alsoParkId) : undefined;
  if (park && extra) return `${park.shortName} & ${extra.shortName}`;
  return park?.shortName ?? "national park";
}

export function resolvePark(parkId: string, alsoParkId?: string): ParkProfile | undefined {
  const park = getPark(parkId);
  if (!park) return undefined;
  const spec = nearbyAddon(parkId, alsoParkId);
  const extra = spec ? getPark(spec.id) : undefined;
  if (!spec || !extra) return park;
  return mergeParkProfiles(park, extra, spec);
}

function mergeParkProfiles(primary: ParkProfile, extra: ParkProfile, spec: NearbyAddOn): ParkProfile {
  const extraBlocks = pickBlocks(extra, spec.blockIds);
  const extraAreas = areasFor(extra, extraBlocks);
  const extraLandmarks = landmarksNear(extra.landmarks, extraAreas);
  const prefixed = prefixPark(extra.id, extraBlocks, extraAreas, extraLandmarks);
  const primaryBlocks = spec.primaryBlockIds ? pickBlocks(primary, spec.primaryBlockIds) : primary.blocks;

  const lastPrimary =
    primary.stayAreas.find((area) => area.id === primaryBlocks.at(-1)?.areaId) ?? primary.stayAreas.at(-1);
  const lastExtra = prefixed.areas.at(-1);

  const extraReady = prefixed.blocks.map((block, i) => {
    if (i !== 0 || spec.place === "before") return block;
    return {
      ...block,
      driveHoursFromPrev: spec.driveHours,
      driveFrom: lastPrimary?.name ?? primary.shortName,
    };
  });

  const primaryReady =
    spec.place === "before" && lastExtra
      ? primaryBlocks.map((block, i) =>
          i === 0
            ? { ...block, driveHoursFromPrev: spec.driveHours, driveFrom: lastExtra.name }
            : block,
        )
      : primaryBlocks;

  const blocks = spec.place === "before" ? [...extraReady, ...primaryReady] : [...primaryReady, ...extraReady];
  const fraction = extra.blocks.length ? extraBlocks.length / extra.blocks.length : 1;

  return {
    ...primary,
    name: `${primary.name} & ${extra.shortName}`,
    shortName: `${primary.shortName} & ${extra.shortName}`,
    regionTitle: `${primary.shortName} & ${extra.shortName}`,
    state: uniqueJoin([primary.state, extra.state]),
    blurb: `${trimBlurb(primary.blurb)} Then add ${extra.shortName} (${spec.driveLabel} between the parks). ${trimBlurb(extra.blurb)}`,
    typicalLoopMiles: Math.round(primary.typicalLoopMiles + extra.typicalLoopMiles * fraction),
    stayAreas: [...primary.stayAreas, ...prefixed.areas],
    blocks,
    landmarks: [...primary.landmarks, ...prefixed.landmarks],
  };
}

function pickBlocks(park: ParkProfile, blockIds?: string[]): ExploreBlock[] {
  if (!blockIds?.length) return park.blocks;
  const wanted = new Set(blockIds);
  const picked = park.blocks.filter((block) => wanted.has(block.id));
  return picked.length ? picked : park.blocks.slice(0, 1);
}

function areasFor(park: ParkProfile, blocks: ExploreBlock[]): StayArea[] {
  const ids = new Set(blocks.map((block) => block.areaId));
  return park.stayAreas.filter((area) => ids.has(area.id));
}

function landmarksNear(landmarks: Landmark[], areas: StayArea[]): Landmark[] {
  if (!areas.length) return landmarks;
  return landmarks.filter((lm) => areas.some((area) => haversineMiles(lm.coord, area.coord) < 48));
}

function prefixPark(parkId: string, blocks: ExploreBlock[], areas: StayArea[], landmarks: Landmark[]) {
  const tag = (id: string) => `${parkId}__${id}`;
  return {
    areas: areas.map((area) => ({ ...area, id: tag(area.id) })),
    blocks: blocks.map((block) => ({ ...block, id: tag(block.id), areaId: tag(block.areaId) })),
    landmarks: landmarks.map((lm) => ({ ...lm, id: tag(lm.id) })),
  };
}

function uniqueJoin(parts: string[]): string {
  return [...new Set(parts.filter(Boolean))].join(" / ");
}

function trimBlurb(value: string): string {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

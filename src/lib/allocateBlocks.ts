import type { ExploreBlock, ParkProfile } from "../types";

type ParkHint = Pick<ParkProfile, "id" | "shortName" | "stayAreas">;

/** Spread destination nights across explore blocks. Short trips stay at the park, not the approach towns. */
export function allocateBlocks(
  blocks: ExploreBlock[],
  destinationNights: number,
  family: boolean,
  park?: ParkHint,
): { block: ExploreBlock; nights: number }[] {
  if (blocks.length === 0 || destinationNights <= 0) return [];

  const parkAreaIds = parkStayAreaIds(park, blocks);
  const atThePark =
    destinationNights <= 2 && parkAreaIds.size
      ? blocks.filter((block) => parkAreaIds.has(block.areaId))
      : blocks;
  const pool = atThePark.length ? atThePark : blocks;

  const maxBlocks =
    destinationNights === 1 ? 1 : destinationNights === 2 ? Math.min(2, pool.length) : pool.length;
  const chosen = pool.slice(0, maxBlocks);
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

function parkStayAreaIds(park: ParkHint | undefined, blocks: ExploreBlock[]): Set<string> {
  if (!park) return new Set();
  const used = new Set(blocks.map((block) => block.areaId));
  const short = park.shortName.toLowerCase();
  const ids = new Set<string>();
  for (const area of park.stayAreas) {
    if (!used.has(area.id)) continue;
    if (area.id === park.id || area.name.toLowerCase().includes(short)) ids.add(area.id);
  }
  return ids;
}

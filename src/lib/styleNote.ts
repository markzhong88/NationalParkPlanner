export function buildStyleNote(opts: {
  blurb: string;
  parkId: string;
  gatewayCity: string;
  family: boolean;
  flying: boolean;
  days: number;
  stayNames: string[];
  start: Date;
}): string {
  const parts = [
    trimSentence(opts.blurb),
    scheduleSentence(opts),
    opts.family ? familyPace(opts.parkId) : adultPace(opts.parkId),
    seasonHint(opts.parkId, opts.start.getMonth()),
  ].filter(Boolean);
  return parts.join(" ");
}

function scheduleSentence(opts: {
  flying: boolean;
  days: number;
  gatewayCity: string;
  stayNames: string[];
}): string {
  const length = opts.days === 1 ? "A one-day loop" : `A ${opts.days}-day loop`;
  const travel = opts.flying ? `flying into ${opts.gatewayCity}` : "driven from home";
  const stays = opts.stayNames.filter(Boolean);
  if (stays.length >= 2) {
    return `${length}, ${travel}, with nights in ${joinAnd(stays)}.`;
  }
  if (stays[0]) {
    return `${length}, ${travel}, based in ${stays[0]}.`;
  }
  return `${length}, ${travel}.`;
}

function familyPace(parkId: string): string {
  return (
    FAMILY_PACE[parkId] ??
    "Short walks, scenic drives, and an easy afternoon reset — not a dawn-to-dusk hike."
  );
}

function adultPace(parkId: string): string {
  return (
    ADULT_PACE[parkId] ??
    "Headline overlooks, a sane drive each day, and a sunset worth stopping for."
  );
}

function seasonHint(parkId: string, month: number): string {
  const summer = month >= 4 && month <= 8;
  const winterish = month <= 3 || month >= 10;
  if (summer && HEAT_PARKS.has(parkId)) {
    return "Start early and sit out the hottest hours.";
  }
  if (winterish && SNOW_ROAD_PARKS.has(parkId)) {
    return "High roads may still be seasonal — the valley or west-side days still work if a pass is closed.";
  }
  if (winterish && parkId === "crater-lake") {
    return "Rim Drive is often snowed in until midsummer.";
  }
  if (winterish && parkId === "yosemite") {
    return "The valley stays open; Tioga and Glacier Point may not.";
  }
  return "";
}

function joinAnd(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function trimSentence(value: string): string {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

const HEAT_PARKS = new Set([
  "grand-canyon",
  "zion",
  "joshua-tree",
  "death-valley",
  "arches",
  "bryce-canyon",
  "capitol-reef",
]);

const SNOW_ROAD_PARKS = new Set(["glacier", "yellowstone", "mount-rainier", "rocky-mountain"]);

const FAMILY_PACE: Record<string, string> = {
  "grand-canyon":
    "Mornings on the rim, shade through midday, and a pool when everyone is done walking.",
  zion: "Easy valley walks and shuttle days; add Bryce only if the kids still have legs.",
  yellowstone:
    "Boardwalks, wildlife pulloffs, and short drives between basins — not a death-march hike.",
  yosemite: "Valley views from the car and short paved walks; save Half Dome for another trip.",
  glacier: "Lakeside time on the west side, and Many Glacier if Going-to-the-Sun is open.",
  acadia: "Carriage roads, a shoreline ramble, and lobster in town before bed.",
  "rocky-mountain":
    "Bear Lake and the valley floor first; Trail Ridge only if everyone is feeling the altitude.",
  "great-smoky": "Quiet motor roads, a waterfall walk, and ice cream back in town.",
  arches: "Windows and short trails from Moab; Delicate Arch if the heat and the hike both cooperate.",
  olympic: "A rainforest stroll, a beach day, and Hurricane Ridge if the clouds lift.",
  "joshua-tree": "Jumbo rocks and short nature trails; Palm Springs for the pool after the desert.",
  "bryce-canyon": "Sunrise hoodoos from the rim, and a short drop into the amphitheater if they want it.",
  "grand-teton": "Jenny Lake, a Snake River turnout, and time in Jackson without a huge hike.",
  "mount-rainier": "Paradise boardwalks and waterfalls — the mountain does the work.",
  sequoia: "Big trees you can walk among, and Grant Grove as the calmer second grove.",
  "death-valley": "Sunrise at the dunes, then indoors through the furnace hours.",
  shenandoah: "A short falls walk if you want the steps, then dinner back in the valley town.",
  cuyahoga: "A waterfall, the towpath, and a park day that does not need a 6 a.m. alarm.",
  everglades: "Boardwalk wildlife and a tram or boat — keep the longest outing in the morning.",
  "hawaii-volcanoes": "Caldera viewpoints, a lava tube, and a shorter Chain of Craters drive.",
  badlands: "Loop Road pulloffs and a short boardwalk; Rushmore as the easy extra.",
  "capitol-reef": "Fruita, a slice of pie, and the scenic drive — the gentle Mighty 5 park.",
  "hot-springs": "Bathhouse Row you can walk to, the mountain tower, and an easy downtown park.",
  "crater-lake": "Rim overlooks and a visitor-center day; Wizard Island only if the boats are running.",
  "indiana-dunes": "A Lake Michigan beach day, dunes you can climb a little, and mill-town sunsets.",
  "gateway-arch": "The tram to the top, a riverfront walk, and a city park — not a backcountry trip.",
  "new-river-gorge": "Canyon Rim views, the bridge, and short overlook walks from Fayetteville.",
  "key-west": "Old Town at a stroll, a sunset, and the Dry Tortugas ferry only if they can do a long boat day.",
};

const ADULT_PACE: Record<string, string> = {
  "grand-canyon": "Sunrise or late light on the rim, and the long desert miles in the cooler hours.",
  zion: "Canyon walls at first light, then a stretch to Bryce if the days allow.",
  yellowstone: "Geysers and wildlife valleys at a sane pace, with Grand Teton if you have the extra night.",
  yosemite: "Valley granite, a waterfall walk, and one slower day if the crowds spike.",
  glacier: "Going-to-the-Sun when the snow has melted, with a second base on the east side if you have the days.",
  acadia: "Cadillac at sunrise, the Park Loop, and a quiet evening in Bar Harbor.",
  "rocky-mountain": "Alpine tundra and elk meadows, with Estes Park as the easy base.",
  "great-smoky": "Newfound Gap, Cades Cove, and a slower afternoon on the North Carolina side.",
  arches: "Delicate Arch in softer light, then a Canyonlands mesa day from the same Moab base.",
  olympic: "Rainforest, alpine, and Pacific beach — three parks in one loop, without rushing all three in a day.",
  "joshua-tree": "Two deserts in one park, then a Palm Springs evening when the rocks cool off.",
  "bryce-canyon": "Hoodoos at first light, then Zion or Kanab if you stretch the trip.",
  "grand-teton": "The range at sunrise, Jenny Lake, and a sunset on the Snake River.",
  "mount-rainier": "Wildflowers at Paradise when the snow melts, and a glacier view above the clouds.",
  sequoia: "Giant Forest, Moro Rock, and a Grant Grove night if you want a second grove.",
  "death-valley": "Badwater and the dunes at the edges of the day; Las Vegas is the heat escape.",
  shenandoah: "Skyline Drive overlooks, a waterfall if you want the steps, and a quiet base in the valley.",
  cuyahoga: "Brandywine, the towpath, and a Cleveland-side park day with real meals nearby.",
  everglades: "Royal Palm boardwalks, an airboat or tram, and Flamingo if you want the far end of the grass.",
  "hawaii-volcanoes": "Kīlauea, a lava tube, and Chain of Craters down to the coast.",
  badlands: "Striped buttes at sundown, then Rushmore if you have the extra day.",
  "capitol-reef": "Fruita orchards, the Waterpocket Fold drive, and a quiet night in Torrey.",
  "hot-springs": "A soak, the tower, and a park day that never needs a wilderness permit.",
  "crater-lake": "Rim Drive overlooks and the caldera at its bluest, when the snow has left the rim.",
  "indiana-dunes": "Living dunes and a Chicago-side beach, with time to watch the lake go gold.",
  "gateway-arch": "The Arch, the museum, and a Mississippi sunset without leaving downtown.",
  "new-river-gorge": "The gorge and the bridge, with a Grandview day if you want a second rim.",
  "key-west": "Overseas Highway miles, an Old Town evening, and a ferry day to Dry Tortugas if the weather holds.",
};

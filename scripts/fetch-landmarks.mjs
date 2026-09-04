import { writeFile, mkdir, access, copyFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";

const UA = "Rimfold/0.1 (local national park planner demo)";
const OUT = path.resolve("public/landmarks");

const ARTICLES = {
  "cathedral-rock": "Cathedral Rock",
  "horseshoe-bend": "Horseshoe Bend (Arizona)",
  antelope: "Antelope Canyon",
  "south-rim": "Grand Canyon",
  "zion-narrows": "The Narrows (Zion National Park)",
  "angels-landing": "Angels Landing",
  bryce: "Bryce Canyon National Park",
  "old-faithful": "Old Faithful",
  prismatic: "Grand Prismatic Spring",
  tetons: "Grand Teton",
  "half-dome": "Half Dome",
  "el-cap": "El Capitan",
  "sequoia-grove": "Grizzly Giant",
  mcdonald: "Lake McDonald",
  logan: "Going-to-the-Sun Road",
  many: "Many Glacier Hotel",
  cadillac: "Cadillac Mountain",
  thunder: "Otter Cliff",
  bass: "Bass Harbor Head Light",
  "bear-lake": "Bear Lake (Colorado)",
  "trail-ridge": "Rocky Mountain National Park",
  estes: "Rocky Mountain National Park",
  cades: "Cades Cove",
  clingmans: "Clingmans Dome",
  falls: "Great Smoky Mountains National Park",
  delicate: "Delicate Arch",
  mesa: "Mesa Arch",
  moab: "Landscape Arch",
  hurricane: "Olympic National Park",
  hoh: "Hoh Rainforest",
  ruby: "Olympic National Park",
  jumbo: "Joshua Tree National Park",
  cholla: "Joshua Tree National Park",
  tram: "Palm Springs Aerial Tramway",
  amphitheater: "Bryce Canyon National Park",
  navajo: "Bryce Canyon National Park",
  dunes: "Coral Pink Sand Dunes State Park",
  jenny: "Jenny Lake",
  "snake-river": "Grand Teton",
  "mormon-row": "Mormon Row",
  paradise: "Paradise (Mount Rainier)",
  reflection: "Reflection Lakes",
  narada: "Narada Falls",
  sherman: "General Sherman (tree)",
  moro: "Moro Rock",
  "grant-grove": "General Grant (tree)",
  badwater: "Badwater Basin",
  mesquite: "Mesquite Flat Sand Dunes",
  zabriskie: "Zabriskie Point",
  skyline: "Skyline Drive",
  "dark-hollow": "Dark Hollow Falls",
  "big-meadows": "Big Meadows",
  brandywine: "Brandywine Falls (Ohio)",
  ledges: "Cuyahoga Valley National Park",
  "beaver-marsh": "Cuyahoga Valley National Park",
  anhinga: "Anhinga Trail",
  "shark-valley": "Shark Valley",
  pahayokee: "Everglades National Park",
  kilauea: "Kīlauea",
  thurston: "Nāhuku",
  "chain-craters": "Chain of Craters Road",
  pinnacles: "Badlands National Park",
  "yellow-mounds": "Badlands National Park",
  rushmore: "Mount Rushmore",
  "capitol-dome": "Capitol Reef National Park",
  fruita: "Fruita (Utah)",
  "capitol-drive": "Capitol Reef National Park",
  fordyce: "Fordyce Bathhouse",
  "hot-springs-tower": "Hot Springs Mountain Tower",
  promenade: "Hot Springs National Park",
  "rim-village": "Crater Lake",
  wizard: "Wizard Island",
  "phantom-ship": "Phantom Ship (island)",
  southernmost: "Southernmost Point Buoy",
  mallory: "Mallory Square",
  "dry-tortugas": "Dry Tortugas National Park",
};

const FILES = {
  logan: "Logan_Pass-27527.jpg",
  many: "Many_Glacier_Hotel.jpg",
  "bear-lake": "Bear_Lake_(50445704286).jpg",
  "trail-ridge": "TrailRidgeRoad.JPG",
  estes: "Sprague_Lake.jpg",
  falls: "Laurel_Falls_GSMNP.jpg",
  delicate: "Delicate_Arch_LaSalle.jpg",
  mesa: "Mesa_Arch.jpg",
  moab: "Landscape_Arch_Utah.jpg",
  hurricane: "Hurricane_Ridge.jpg",
  hoh: "Hoh_Rain_Forest.jpg",
  ruby: "Ruby_Beach_1.jpg",
  cholla: "Cholla_Cactus_Garden.jpg",
  tram: "Palm_Springs_Aerial_Tramway.jpg",
  dunes: "Coral_Pink_Sand_Dunes.jpg",
  jenny: "Jenny_Lake.jpg",
  "snake-river": "Snake_River_Overlook.jpg",
  sherman: "General_Sherman_tree.jpg",
  badwater: "Badwater_Basin.jpg",
  zabriskie: "Zabriskie_Point.jpg",
  brandywine: "Brandywine_Falls.jpg",
  anhinga: "Anhinga_Trail.jpg",
  kilauea: "Kilauea.jpg",
  rushmore: "Mount_Rushmore.jpg",
  wizard: "Wizard_Island.jpg",
  southernmost: "Southernmost_point_buoy,_NE_view.jpg",
  mallory: "Mallory_Square.jpg",
  "dry-tortugas": "Fort-Jefferson_Dry-Tortugas.jpg",
};

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("gif") || type.includes("svg") || type.includes("html")) {
    throw new Error(`bad type ${type}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function fromArticle(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`summary ${res.status}`);
  const page = await res.json();
  const src = page.thumbnail?.source ?? page.originalimage?.source;
  if (!src) throw new Error("no image");
  if (/\.(gif|svg|png)(\?|$)/i.test(src) && /map/i.test(src)) throw new Error("map asset");
  return src.replace(/\/\d+px-/, "/800px-");
}

function fileUrl(name) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=800`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = [];
  for (const [id, title] of Object.entries(ARTICLES)) {
    const dest = path.join(OUT, `${id}.jpg`);
    if (await exists(dest)) {
      report.push(`${id}\tSKIP`);
      continue;
    }
    try {
      let url;
      try {
        url = await fromArticle(title);
      } catch (err) {
        if (!FILES[id]) throw err;
        url = fileUrl(FILES[id]);
      }
      await download(url, dest);
      report.push(`${id}\tOK\t${url}`);
    } catch (err) {
      if (FILES[id]) {
        try {
          const url = fileUrl(FILES[id]);
          await download(url, dest);
          report.push(`${id}\tFILE\t${url}`);
        } catch (err2) {
          report.push(`${id}\tFAIL\t${String(err2)}`);
        }
      } else {
        report.push(`${id}\tFAIL\t${String(err)}`);
      }
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  if (await exists(path.join(OUT, "bryce.jpg"))) {
    if (!(await exists(path.join(OUT, "navajo.jpg")))) {
      await copyFile(path.join(OUT, "bryce.jpg"), path.join(OUT, "navajo.jpg"));
      report.push("navajo\tCOPY\tbryce.jpg");
    }
    if (!(await exists(path.join(OUT, "amphitheater.jpg")))) {
      await copyFile(path.join(OUT, "bryce.jpg"), path.join(OUT, "amphitheater.jpg"));
    }
  }
  await writeFile(path.join(OUT, "manifest.tsv"), report.join("\n"));
  console.log(report.join("\n"));
}

await main();

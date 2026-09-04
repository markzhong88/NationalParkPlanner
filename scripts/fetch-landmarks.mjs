import { writeFile, mkdir, access, copyFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";

const UA = "Parkpath/0.1 (local national park planner demo)";
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

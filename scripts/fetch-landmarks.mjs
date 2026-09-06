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
  logan: "Logan Pass",
  many: "Many Glacier Hotel",
  avalanche: "Trail of the Cedars",
  "hidden-lake": "Hidden Lake (Glacier National Park)",
  "wild-goose": "Wild Goose Island",
  "two-medicine": "Two Medicine Lake",
  cadillac: "Cadillac Mountain",
  thunder: "Otter Cliff",
  bass: "Bass Harbor Head Light",
  "bear-lake": "Bear Lake (Colorado)",
  "trail-ridge": "Rocky Mountain National Park",
  estes: "Rocky Mountain National Park",
  cades: "Cades Cove",
  clingmans: "Clingmans Dome",
  "laurel-falls": "Laurel Falls",
  "newfound-gap": "Newfound Gap",
  oconaluftee: "Oconaluftee",
  cataloochee: "Cataloochee",
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
  schwabacher: "Schwabacher Landing",
  "jhmr-tram": "Jackson Hole Mountain Resort",
  chapel: "Chapel of the Transfiguration",
  "string-lake": "String Lake",
  "hidden-falls": "Hidden Falls (Wyoming)",
  "town-square": "Jackson, Wyoming",
  "antelope-flats": "Mormon Row",
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
  "west-beach": "Indiana Dunes National Park",
  "mount-baldy": "Mount Baldy (Indiana)",
  "cowles-bog": "Cowles Bog",
  "gateway-span": "Gateway Arch",
  "old-courthouse": "Old Courthouse (St. Louis, Missouri)",
  "stl-riverfront": "Jefferson National Expansion Memorial",
  "nrg-bridge": "New River Gorge Bridge",
  "endless-wall": "New River Gorge National Park and Preserve",
  "nrg-grandview": "Grandview (West Virginia)",
};

const FILES = {
  logan: "Logan_Pass-27527.jpg",
  many: "Many_Glacier_Hotel.jpg",
  "wild-goose": "St Mary Lake - Wild goose Island.jpg",
  "two-medicine": "GlacierNP SwansonBoatHouse.jpg",
  clingmans: "Clingmans Dome observation tower TN2.jpg",
  oconaluftee: "Mountain farm Museum P9090769.jpg",
  cataloochee: "Elk in Cataloochee - panoramio.jpg",
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
  schwabacher: "Schwabacher landing reflection Grand Teton national park - Flickr - Mferbfriske.jpg",
  "jhmr-tram": "Rendezvous Mountain WY1.jpg",
  chapel: "Chapel of the Transfiguration Grand Teton NP1.jpg",
  "string-lake": "String Lake Grand Teton National Park.jpg",
  "hidden-falls": "Jenny Lake Trail Grand Teton National Park 2024.jpg",
  "town-square": "Elk antler arch at Jackson Square, Jackson, WY 2022-07-11.jpg",
  "antelope-flats": "Bison, Grand Teton (50403144156).jpg",
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
  "west-beach": "Indiana_Dunes_National_Park.jpg",
  "mount-baldy": "Mount_Baldy_(Indiana).jpg",
  "cowles-bog": "Cowles_bog_in_the_spring.jpg",
  "gateway-span": "Gateway_Arch_St_Louis.jpg",
  "old-courthouse": "Old_Saint_Louis_Courthouse_-_Saint_Louis,_Missouri_-_March_31,_2014.jpg",
  "stl-riverfront": "St_Louis_Gateway_Arch_and_riverfront_(HDR1).jpg",
  "nrg-bridge": "New_River_Gorge_Bridge.jpg",
  "endless-wall": "The_view_from_Diamond_Point_on_the_Endless_Wall_Trail_is_one_of_the_most_spectacular_viewpoints_in_the_park._(d2ed428b-da0b-4036-bed6-ea83f8979cf3).JPG",
  "nrg-grandview": "Grandview_Overlook,_New_River.jpg",
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

import { readFile, writeFile, mkdir, access, stat, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";

const UA = "Parkpath/0.1 (local national park planner demo)";
const OUT = path.resolve("public/landmarks");
const SKIP = /bathroom|toilet|tent|campsite|campground|map of|logo|icon|svg|pdf/i;

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function loadQueries() {
  const src = await readFile(new URL("../src/data/viewpoints.ts", import.meta.url), "utf8");
  const match = src.match(/export const VIEWPOINT_SEARCH[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!match) throw new Error("VIEWPOINT_SEARCH not found");
  const out = {};
  for (const line of match[1].split("\n")) {
    const hit = line.match(/"?([A-Za-z0-9-]+)"?\s*:\s*"([^"]+)"/);
    if (hit) out[hit[1]] = hit[2];
  }
  return out;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("html") || type.includes("svg") || type.includes("gif")) {
    throw new Error(`bad type ${type}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function searchFile(query) {
  const api =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch: query,
      srnamespace: "6",
      srlimit: "8",
    });
  const data = await getJson(api);
  return (data.query?.search ?? [])
    .map((h) => String(h.title ?? "").replace(/^File:/, ""))
    .filter((title) => /\.(jpe?g)$/i.test(title) && !SKIP.test(title));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const queries = await loadQueries();
  const report = [];
  for (const [id, query] of Object.entries(queries)) {
    const dest = path.join(OUT, `${id}.jpg`);
    if (await exists(dest)) {
      report.push(`${id}\tSKIP`);
      continue;
    }
    try {
      const files = await searchFile(query);
      let saved = false;
      for (const file of files) {
        const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
        try {
          await download(url, dest);
          if ((await stat(dest)).size < 8000) {
            await unlink(dest);
            continue;
          }
          report.push(`${id}\tOK\t${file}`);
          saved = true;
          break;
        } catch {
          continue;
        }
      }
      if (!saved) report.push(`${id}\tNONE`);
    } catch (err) {
      report.push(`${id}\tFAIL\t${String(err)}`);
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  await writeFile(path.join(OUT, "viewpoints.tsv"), report.join("\n"));
  console.log(report.join("\n"));
}

await main();

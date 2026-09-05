import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import {
  CLASSIC_TRIPS,
  matchClassicPath,
  renderClassicHub,
  renderClassicTripPage,
  renderRobots,
  renderSitemap,
} from "./src/lib/seoPages";

const SITE = "https://rimfold.com";

export function classicTripPages(): Plugin {
  return {
    name: "classic-trip-pages",
    configureServer(server) {
      server.middlewares.use(serveClassicHtml);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveClassicHtml);
    },
    closeBundle() {
      const dist = join(process.cwd(), "dist");
      mkdirSync(join(dist, "trips"), { recursive: true });
      writeFileSync(join(dist, "trips", "index.html"), renderClassicHub());
      for (const trip of CLASSIC_TRIPS) {
        const dir = join(dist, "trips", trip.slug);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "index.html"), renderClassicTripPage(trip));
      }
      writeFileSync(join(dist, "sitemap.xml"), renderSitemap(SITE));
      writeFileSync(join(dist, "robots.txt"), renderRobots(SITE));
      writeFileSync(join(dist, ".nojekyll"), "");
    },
  };
}

function serveClassicHtml(
  req: { method?: string; url?: string },
  res: { setHeader: (name: string, value: string) => void; end: (body: string) => void },
  next: () => void,
) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  const html = matchClassicPath(req.url ?? "/");
  if (!html) {
    next();
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
}

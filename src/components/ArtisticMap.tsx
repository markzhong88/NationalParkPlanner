import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { Coordinates, TripPlan } from "../types";
import { DrivingSummary } from "./DrivingSummary";

type Props = {
  plan: TripPlan;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
};

export function ArtisticMap({ plan, selectedDay, onSelectDay }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectRef = useRef(onSelectDay);
  const selectedRef = useRef(selectedDay);
  selectRef.current = onSelectDay;
  selectedRef.current = selectedDay;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const map = new maplibregl.Map({
      container: node,
      style: {
        version: 8,
        sources: {
          natgeo: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri — National Geographic",
          },
        },
        layers: [{ id: "natgeo", type: "raster", source: "natgeo" }],
      },
      bounds: [
        [plan.bounds.minLng, plan.bounds.minLat],
        [plan.bounds.maxLng, plan.bounds.maxLat],
      ],
      fitBoundsOptions: {
        padding: { top: 88, left: 240, right: 88, bottom: 72 },
        maxZoom: wideTrip(plan) ? 6.6 : 8.6,
      },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    const markers: maplibregl.Marker[] = [];

    const resize = () => map.resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(node);
    requestAnimationFrame(resize);

    const pickDays = (days: number[]) => {
      if (!days.length) return;
      selectRef.current(nextDay(days, selectedRef.current));
    };

    map.on("load", () => {
      resize();
      map.addSource("route", {
        type: "geojson",
        data: lineFeature(plan.routeGeometry),
      });
      map.addSource("day-route", {
        type: "geojson",
        data: lineFeature([]),
      });
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#8aa4c4",
          "line-width": 8,
          "line-opacity": 0.4,
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#3d5c7a",
          "line-width": 3.5,
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "day-route-glow",
        type: "line",
        source: "day-route",
        paint: {
          "line-color": "#f4efe4",
          "line-width": 14,
          "line-opacity": 0.95,
          "line-blur": 0.6,
        },
      });
      map.addLayer({
        id: "day-route-line",
        type: "line",
        source: "day-route",
        paint: {
          "line-color": "#c4a574",
          "line-width": 5.5,
          "line-opacity": 1,
        },
      });

      for (const stop of plan.mapStops) {
        const pin = document.createElement("button");
        pin.type = "button";
        pin.className = "stop-pin";
        pin.dataset.days = stop.days.join(",");
        pin.dataset.stopId = stop.id;
        pin.title = stop.name;
        pin.setAttribute("aria-label", stop.name);
        pin.addEventListener("click", (e) => {
          e.stopPropagation();
          pickDays(stop.days);
        });
        markers.push(
          new maplibregl.Marker({ element: pin }).setLngLat([stop.coord.lng, stop.coord.lat]).addTo(map),
        );

        const label = document.createElement("div");
        label.className = "stop-label";
        label.dataset.days = stop.days.join(",");
        label.dataset.stopId = stop.id;
        label.textContent = stop.name;
        markers.push(
          new maplibregl.Marker({ element: label, offset: [0, 22] })
            .setLngLat([stop.coord.lng, stop.coord.lat])
            .addTo(map),
        );
      }

      plan.landmarks.forEach((lm) => {
        const wrap = document.createElement("div");
        wrap.className = "callout-wrap";
        const [ox, oy] = lm.offset ?? defaultOffset(lm.id);
        const length = Math.hypot(ox, oy);
        const angle = Math.atan2(oy, ox);
        const days = lm.days ?? [];
        wrap.innerHTML = `
          <div class="landmark-dot" title="${lm.name}"></div>
          <div class="callout-leader" style="width:${length}px;transform:rotate(${angle}rad)"></div>
          <button type="button" class="photo-callout" data-days="${days.join(",")}" aria-label="${lm.name}" style="transform:translate(${ox}px, ${oy}px)">
            <b class="day-chip"></b>
            <img src="${lm.photo}" alt="${lm.name}" />
            <span>${lm.name}</span>
          </button>
        `;
        wrap.querySelector(".photo-callout")?.addEventListener("click", (e) => {
          e.stopPropagation();
          pickDays(days);
        });
        wrap.querySelector(".landmark-dot")?.addEventListener("click", (e) => {
          e.stopPropagation();
          pickDays(days);
        });
        wrap.querySelector("img")?.addEventListener("error", () => {
          wrap.classList.add("is-missing-photo");
        });
        markers.push(
          new maplibregl.Marker({ element: wrap, anchor: "center" })
            .setLngLat([lm.coord.lng, lm.coord.lat])
            .addTo(map),
        );
      });

      for (const leg of plan.driveLegs) {
        const chip = document.createElement("div");
        chip.className = "drive-chip";
        chip.dataset.day = String(leg.day);
        chip.textContent = leg.label;
        const mid = midpoint(leg, plan.mapStops);
        markers.push(new maplibregl.Marker({ element: chip }).setLngLat(mid).addTo(map));
      }

      applyMapSelection(node, map, plan, selectedRef.current, true);
    });

    return () => {
      observer.disconnect();
      markers.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [plan]);

  useEffect(() => {
    const root = containerRef.current;
    const map = mapRef.current;
    if (!root || !map) return;
    applyMapSelection(root, map, plan, selectedDay, true);
  }, [selectedDay, plan]);

  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-2xl bg-paper-deep shadow-[0_24px_60px_rgba(26,35,50,0.12)] ring-1 ring-ink/10">
      <div ref={containerRef} className="map-canvas h-full min-h-[560px] w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_58%,rgba(243,237,224,0.34))]" />
      <div className="pointer-events-none absolute top-4 left-4 max-w-sm">
        <DrivingSummary
          legs={plan.driveLegs}
          totalMiles={plan.totalMiles}
          totalKm={plan.totalKm}
          selectedDay={selectedDay}
        />
      </div>
      <div className="pointer-events-none absolute right-4 bottom-8 rounded-lg bg-paper/90 px-3 py-2 text-[10.5px] text-ink/70 ring-1 ring-ink/8">
        <p className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-5 rounded-full bg-[#3d5c7a]" /> Route
        </p>
        <p className="mt-1 flex items-center gap-2">
          <span className="stop-pin-mini" /> Overnight
        </p>
      </div>
      <div className="pointer-events-none absolute right-4 bottom-28 text-ink/40">
        <Compass />
      </div>
    </div>
  );
}

function applyMapSelection(
  root: HTMLElement,
  map: maplibregl.Map,
  plan: TripPlan,
  selectedDay: number | null,
  pan: boolean,
) {
  const day = selectedDay != null ? plan.days.find((d) => d.day === selectedDay) : undefined;
  const hl = "#c4a574";
  const driveLeg = selectedDay != null ? plan.driveLegs.find((l) => l.day === selectedDay) : undefined;
  const stayStop = day
    ? plan.mapStops.find(
        (s) =>
          s.name.toLowerCase() === day.stayPlace.toLowerCase() || nearbyCoord(s.coord, day.coord),
      ) ?? plan.mapStops.find((s) => s.days.includes(day.day))
    : undefined;
  const fromStop = driveLeg
    ? plan.mapStops.find((s) => s.name.toLowerCase() === driveLeg.from.toLowerCase())
    : undefined;

  root.querySelectorAll<HTMLElement>("[data-days]").forEach((el) => {
    const days = parseDays(el.dataset.days);
    const isPhoto = el.classList.contains("photo-callout");
    const isViewpoint = el.classList.contains("viewpoint-pin");
    const isStay = stayStop != null && el.dataset.stopId === stayStop.id;
    const isFrom = fromStop != null && el.dataset.stopId === fromStop.id && !isStay;
    const on = isPhoto || isViewpoint
      ? selectedDay != null && days.includes(selectedDay)
      : isStay;
    el.classList.toggle("is-active", on);
    el.classList.toggle("is-from", isFrom);
    el.classList.toggle("is-dim", selectedDay != null && !on && !isFrom);
    el.style.setProperty("--hl", hl);
    if (el.classList.contains("stop-pin")) {
      el.textContent = on && selectedDay != null ? `DAY ${selectedDay}` : "";
    }
    const chip = el.querySelector<HTMLElement>(".day-chip");
    if (chip) chip.textContent = on && selectedDay != null ? `DAY ${selectedDay}` : "";
    const marker = el.closest(".maplibregl-marker") as HTMLElement | null;
    if (marker) marker.style.zIndex = on || isFrom ? "6" : "";
  });

  root.querySelectorAll<HTMLElement>(".drive-chip[data-day]").forEach((el) => {
    const on = selectedDay != null && el.dataset.day === String(selectedDay);
    el.classList.toggle("is-active", on);
    el.classList.toggle("is-dim", selectedDay != null && !on);
    el.style.setProperty("--hl", hl);
  });

  const slice = selectedDay != null ? routeSliceForDay(plan, selectedDay) : [];
  const source = map.getSource("day-route") as GeoJSONSource | undefined;
  source?.setData(lineFeature(slice));
  if (map.getLayer("route-line")) {
    map.setPaintProperty("route-line", "line-opacity", selectedDay != null ? 0.28 : 0.95);
    map.setPaintProperty("route-glow", "line-opacity", selectedDay != null ? 0.12 : 0.45);
  }

  if (!pan || selectedDay == null || !map.loaded()) return;

  const longDrive = (day?.driveHours ?? 0) >= 3 || slice.length > 80;
  const landmark = longDrive
    ? undefined
    : plan.landmarks.find((lm) => lm.days?.includes(selectedDay));
  const points: [number, number][] = [];
  if (fromStop) points.push([fromStop.coord.lng, fromStop.coord.lat]);
  if (stayStop) points.push([stayStop.coord.lng, stayStop.coord.lat]);
  if (landmark) points.push([landmark.coord.lng, landmark.coord.lat]);
  slice.forEach((c) => points.push(c));
  if (!points.length && day) points.push([day.coord.lng, day.coord.lat]);
  if (!points.length) return;

  const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
  for (const point of points) bounds.extend(point);
  map.fitBounds(bounds, {
    padding: { top: 120, left: 88, right: 88, bottom: 96 },
    maxZoom: longDrive ? 6.6 : slice.length > 4 ? 8.4 : 9.1,
    duration: 700,
  });
}

function wideTrip(plan: TripPlan): boolean {
  return plan.bounds.maxLng - plan.bounds.minLng > 3.5 || plan.bounds.maxLat - plan.bounds.minLat > 3;
}

function routeSliceForDay(plan: TripPlan, dayNum: number): [number, number][] {
  const stored = plan.driveLegs.find((l) => l.day === dayNum)?.geometry;
  if (stored && stored.length >= 2) return stored;

  const geom = plan.routeGeometry;
  const day = plan.days.find((d) => d.day === dayNum);
  if (!geom.length || !day) return [];
  const prev = plan.days.find((d) => d.day === dayNum - 1);
  const from = prev?.coord ?? plan.startPoint.coord;
  const to = day.coord;
  if (nearbyCoord(from, to)) return [];
  const i = nearestIndexFrom(geom, from, 0);
  const j = nearestIndexFrom(geom, to, i + 1);
  if (j - i < 2) return [];
  return geom.slice(i, j + 1);
}

function nearestIndexFrom(geom: [number, number][], point: Coordinates, startAt: number): number {
  let best = Math.min(startAt, geom.length - 1);
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = startAt; i < geom.length; i++) {
    const c = geom[i];
    const d = (c[0] - point.lng) ** 2 + (c[1] - point.lat) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function midpoint(
  leg: { geometry: [number, number][]; from: string; to: string },
  stops: { name: string; coord: Coordinates }[],
): [number, number] {
  if (leg.geometry.length >= 2) {
    const point = leg.geometry[Math.floor(leg.geometry.length / 2)];
    return [point[0], point[1]];
  }
  const a = stops.find((s) => s.name.toLowerCase() === leg.from.toLowerCase());
  const b = stops.find((s) => s.name.toLowerCase() === leg.to.toLowerCase());
  if (a && b) return [(a.coord.lng + b.coord.lng) / 2, (a.coord.lat + b.coord.lat) / 2];
  if (a) return [a.coord.lng, a.coord.lat];
  return [0, 0];
}

function nearbyCoord(a: Coordinates, b: Coordinates): boolean {
  return Math.abs(a.lat - b.lat) < 0.08 && Math.abs(a.lng - b.lng) < 0.08;
}

function lineFeature(coordinates: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features:
      coordinates.length >= 2
        ? [
            {
              type: "Feature" as const,
              properties: {},
              geometry: { type: "LineString" as const, coordinates },
            },
          ]
        : [],
  };
}

function parseDays(value?: string): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function nextDay(days: number[], current: number | null): number {
  if (days.length === 0) return 1;
  if (current == null || !days.includes(current)) return days[0];
  const i = days.indexOf(current);
  return days[(i + 1) % days.length];
}

function defaultOffset(id: string): [number, number] {
  const hash = [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const side = hash % 2 === 0 ? 1 : -1;
  return [side * 118, hash % 3 === 0 ? -32 : 36];
}

function Compass() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="20" fill="rgba(243,237,224,0.9)" stroke="#1a2332" strokeOpacity="0.2" />
      <path d="M22 6 L26 22 L22 18 L18 22 Z" fill="#1f3a2e" />
      <path d="M22 38 L18 22 L22 26 L26 22 Z" fill="#c4a574" />
      <text x="22" y="12" textAnchor="middle" fontSize="7" fill="#1a2332" fontWeight="700">
        N
      </text>
    </svg>
  );
}

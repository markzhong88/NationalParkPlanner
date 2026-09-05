import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { Coordinates, Landmark, TripPlan } from "../types";
import { DrivingSummary } from "./DrivingSummary";
import { exportMapViewport } from "../lib/geo";

type Props = {
  plan: TripPlan;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
};

export type ArtisticMapHandle = {
  snapshot: () => Promise<string>;
};

export const ArtisticMap = forwardRef<ArtisticMapHandle, Props>(function ArtisticMap(
  { plan, selectedDay, onSelectDay },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const planRef = useRef(plan);
  const selectRef = useRef(onSelectDay);
  const selectedRef = useRef(selectedDay);
  planRef.current = plan;
  selectRef.current = onSelectDay;
  selectedRef.current = selectedDay;

  useImperativeHandle(ref, () => ({
    snapshot: () => snapshotMap(mapRef.current, wrapRef.current, planRef.current, selectedRef.current),
  }));

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
      canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
      fadeDuration: 0,
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
    <div
      ref={wrapRef}
      className="map-export-root relative h-full min-h-[560px] overflow-hidden rounded-2xl bg-paper-deep shadow-[0_24px_60px_rgba(26,35,50,0.12)] ring-1 ring-ink/10"
    >
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
});

async function snapshotMap(
  map: maplibregl.Map | null,
  root: HTMLDivElement | null,
  plan: TripPlan,
  selectedDay: number | null,
): Promise<string> {
  if (!map || !root) throw new Error("The map is still drawing.");

  applyMapSelection(root, map, plan, null, false);
  const camera = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
  const canvasNode = root.querySelector(".map-canvas") as HTMLElement | null;
  const view = exportMapViewport(plan.bounds);
  const restore = stageExportViewport(root, canvasNode, view.width, view.height);
  const pixelRatio = map.getPixelRatio();

  try {
    map.setPixelRatio(Math.max(2, pixelRatio));
    await sizeMapForExport(map, view.width, view.height);
    frameExportCamera(map, plan);
    await whenMapIdle(map);
    frameExportCamera(map, plan);
    hideMapRoute(map);
    await whenMapIdle(map);
    map.triggerRepaint();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return await rasterizeMap(map, plan);
  } catch {
    throw new Error("Couldn’t capture the map. Try again after it finishes loading.");
  } finally {
    restore();
    map.setPixelRatio(pixelRatio);
    map.resize();
    map.jumpTo(camera);
    applyMapSelection(root, map, plan, selectedDay, false);
  }
}

function stageExportViewport(
  root: HTMLElement,
  canvasNode: HTMLElement | null,
  width: number,
  height: number,
) {
  const prevRoot = root.getAttribute("style");
  const prevCanvas = canvasNode?.getAttribute("style") ?? null;
  const parent = root.parentElement;
  const holder = document.createElement("div");
  holder.style.width = "100%";
  holder.style.height = `${root.getBoundingClientRect().height}px`;
  parent?.insertBefore(holder, root);

  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;
  root.style.minHeight = `${height}px`;
  root.style.opacity = "1";
  root.style.zIndex = "0";
  root.style.pointerEvents = "none";
  root.style.clipPath = "inset(0 calc(100% - 1px) calc(100% - 1px) 0)";
  if (canvasNode) {
    canvasNode.style.width = `${width}px`;
    canvasNode.style.height = `${height}px`;
    canvasNode.style.minHeight = `${height}px`;
  }
  return () => {
    holder.remove();
    if (prevRoot == null || prevRoot === "") root.removeAttribute("style");
    else root.setAttribute("style", prevRoot);
    if (canvasNode) {
      if (prevCanvas == null || prevCanvas === "") canvasNode.removeAttribute("style");
      else canvasNode.setAttribute("style", prevCanvas);
    }
  };
}

async function sizeMapForExport(map: maplibregl.Map, width: number, height: number) {
  const node = map.getContainer();
  for (let i = 0; i < 12; i++) {
    void node.offsetWidth;
    void node.offsetHeight;
    map.resize();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (Math.abs(node.clientWidth - width) < 3 && Math.abs(node.clientHeight - height) < 3) {
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }
}

function hideMapRoute(map: maplibregl.Map) {
  for (const id of ["route-line", "route-glow", "day-route-line", "day-route-glow"]) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-opacity", 0);
  }
}

function frameExportCamera(map: maplibregl.Map, plan: TripPlan) {
  map.resize();
  const padding = { top: 52, left: 48, right: 48, bottom: 48 };
  const bounds = exportBounds(plan);
  const camera = map.cameraForBounds(bounds, {
    padding,
    maxZoom: 10.6,
  });
  if (camera) {
    const zoom = typeof camera.zoom === "number" ? Math.min(10.6, camera.zoom + 0.12) : camera.zoom;
    map.jumpTo({ center: camera.center, zoom, bearing: 0, pitch: 0 });
    return;
  }
  map.fitBounds(bounds, { padding, maxZoom: 10.6, duration: 0 });
}

function exportBounds(plan: TripPlan): [[number, number], [number, number]] {
  const lngs = [plan.bounds.minLng, plan.bounds.maxLng];
  const lats = [plan.bounds.minLat, plan.bounds.maxLat];
  for (const stop of plan.mapStops) {
    lngs.push(stop.coord.lng);
    lats.push(stop.coord.lat);
  }
  for (const lm of plan.landmarks) {
    lngs.push(lm.coord.lng);
    lats.push(lm.coord.lat);
  }
  lngs.push(plan.startPoint.coord.lng, plan.endPoint.coord.lng);
  lats.push(plan.startPoint.coord.lat, plan.endPoint.coord.lat);
  for (const [lng, lat] of plan.routeGeometry) {
    lngs.push(lng);
    lats.push(lat);
  }
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngSpan = Math.max(0.18, maxLng - minLng);
  const latSpan = Math.max(0.14, maxLat - minLat);
  const padLng = lngSpan * 0.055;
  const padLat = latSpan * 0.07;
  return [
    [minLng - padLng, minLat - padLat],
    [maxLng + padLng, maxLat + padLat],
  ];
}

function whenMapIdle(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = window.setTimeout(done, 3600);
    map.once("idle", () => {
      window.clearTimeout(timer);
      done();
    });
    map.triggerRepaint();
  });
}

async function rasterizeMap(map: maplibregl.Map, plan: TripPlan): Promise<string> {
  const gl = map.getCanvas();
  const src = document.createElement("canvas");
  src.width = Math.max(1, gl.width || Math.round(gl.clientWidth * (window.devicePixelRatio || 1)));
  src.height = Math.max(1, gl.height || Math.round(gl.clientHeight * (window.devicePixelRatio || 1)));
  const srcCtx = src.getContext("2d");
  if (!srcCtx) throw new Error("Couldn’t capture the map.");
  srcCtx.fillStyle = "#e7dcc8";
  srcCtx.fillRect(0, 0, src.width, src.height);

  const fromGl = await paintGlFrame(map, src, srcCtx);
  if (!fromGl) {
    await paintEsriBasemap(map, src, srcCtx);
  }
  drawRoute(map, plan, src, srcCtx);

  const fit = { x: 0, y: 0, w: src.width, h: src.height };
  const plot = plotter(map, src, fit);
  drawStops(plan, srcCtx, plot, src);
  await drawLandmarkPhotos(plan, src, srcCtx, plot);
  return src.toDataURL("image/jpeg", 0.95);
}

function paintGlFrame(
  map: maplibregl.Map,
  copy: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = () => {
      const gl = map.getCanvas();
      try {
        ctx.drawImage(gl, 0, 0, copy.width, copy.height);
        copy.toDataURL("image/jpeg", 0.5);
        resolve(!isMostlyBlank(ctx, copy.width, copy.height));
      } catch {
        resolve(false);
      }
    };
    map.triggerRepaint();
    requestAnimationFrame(() => requestAnimationFrame(finish));
  });
}

async function paintEsriBasemap(
  map: maplibregl.Map,
  copy: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  const gl = map.getCanvas();
  const width = gl.clientWidth || copy.width;
  const height = gl.clientHeight || copy.height;
  const nw = map.unproject([0, 0]);
  const se = map.unproject([width, height]);
  const [minX, maxY] = lngLatToMercator(nw.lng, nw.lat);
  const [maxX, minY] = lngLatToMercator(se.lng, se.lat);
  const sizeW = Math.min(2048, Math.max(256, copy.width));
  const sizeH = Math.min(2048, Math.max(256, copy.height));
  const url = [
    "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/export",
    `?bbox=${minX},${minY},${maxX},${maxY}`,
    "&bboxSR=3857&imageSR=3857",
    `&size=${Math.round(sizeW)},${Math.round(sizeH)}`,
    "&format=jpg&f=image",
  ].join("");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn’t capture the map.");
  const blob = await res.blob();
  const src = URL.createObjectURL(blob);
  try {
    const img = await loadHtmlImage(src);
    ctx.drawImage(img, 0, 0, copy.width, copy.height);
  } finally {
    URL.revokeObjectURL(src);
  }
}

function drawRoute(
  map: maplibregl.Map,
  plan: TripPlan,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  const coords = plan.routeGeometry;
  if (coords.length < 2) return;
  const { sx, sy } = canvasScale(map, canvas);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  coords.forEach((c, i) => {
    const p = map.project(c);
    if (i === 0) ctx.moveTo(p.x * sx, p.y * sy);
    else ctx.lineTo(p.x * sx, p.y * sy);
  });
  ctx.strokeStyle = "rgba(138,164,196,0.55)";
  ctx.lineWidth = 16 * sx;
  ctx.stroke();
  ctx.strokeStyle = "rgba(45,78,112,0.96)";
  ctx.lineWidth = 7.5 * sx;
  ctx.stroke();
  ctx.restore();
}

type Plotter = {
  point: (lng: number, lat: number) => { x: number; y: number };
  unit: number;
};

function plotter(
  map: maplibregl.Map,
  src: HTMLCanvasElement,
  fit: { x: number; y: number; w: number; h: number },
): Plotter {
  const gl = map.getCanvas();
  const sx = src.width / Math.max(1, gl.clientWidth);
  const sy = src.height / Math.max(1, gl.clientHeight);
  const scaleX = fit.w / src.width;
  const scaleY = fit.h / src.height;
  return {
    unit: (sx * scaleX + sy * scaleY) / 2,
    point: (lng, lat) => {
      const p = map.project([lng, lat]);
      return {
        x: p.x * sx * scaleX + fit.x,
        y: p.y * sy * scaleY + fit.y,
      };
    },
  };
}

function exportOverlayMetrics(canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const cardW = Math.round(w * 0.2);
  const photoH = Math.round(cardW * 0.6);
  const captionH = Math.round(cardW * 0.3);
  const font = Math.round(cardW * 0.128);
  return {
    cardW,
    photoH,
    captionH,
    cardH: photoH + captionH,
    font,
    lineH: Math.round(font * 1.18),
    pad: Math.round(w * 0.032),
    radius: Math.round(cardW * 0.05),
    pinR: Math.round(cardW * 0.032),
    pinStroke: Math.round(cardW * 0.012),
    leader: Math.max(4, Math.round(cardW * 0.014)),
    stopR: Math.round(w * 0.008),
    stopFont: Math.round(w * 0.02),
  };
}

function drawStops(
  plan: TripPlan,
  ctx: CanvasRenderingContext2D,
  plot: Plotter,
  canvas: HTMLCanvasElement,
) {
  const m = exportOverlayMetrics(canvas);
  ctx.save();
  ctx.font = `700 ${m.stopFont}px "DM Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const stop of plan.mapStops) {
    const { x, y } = plot.point(stop.coord.lng, stop.coord.lat);
    ctx.beginPath();
    ctx.arc(x, y, m.stopR, 0, Math.PI * 2);
    ctx.fillStyle = "#1f3a2e";
    ctx.fill();
    ctx.lineWidth = m.pinStroke;
    ctx.strokeStyle = "#fffdf8";
    ctx.stroke();
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(4, m.pinStroke * 1.4);
    ctx.strokeStyle = "rgba(243,237,224,0.94)";
    ctx.strokeText(stop.name, x, y + m.stopR + 6);
    ctx.fillStyle = "rgba(26,35,50,0.9)";
    ctx.fillText(stop.name, x, y + m.stopR + 6);
  }
  ctx.restore();
}

async function drawLandmarkPhotos(
  plan: TripPlan,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  plot: Plotter,
) {
  const picks = pickExportPhotos(plan.landmarks, 4);
  if (!picks.length) return;
  const m = exportOverlayMetrics(canvas);
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const ready: { lm: Landmark; img: HTMLImageElement; pin: { x: number; y: number } }[] = [];

  for (const lm of picks) {
    if (!lm.photo) continue;
    const img = await tryLoadImage(lm.photo);
    if (!img) continue;
    ready.push({ lm, img, pin: plot.point(lm.coord.lng, lm.coord.lat) });
  }
  ready.sort((a, b) => a.pin.y - b.pin.y || a.pin.x - b.pin.x);

  for (const { lm, img, pin } of ready) {
    const [ox, oy] = lm.offset ?? defaultOffset(lm.id);
    const rect = placePhotoCard(pin, ox, oy, m, canvas, placed);
    placed.push(rect);
    const { x: cardX, y: cardY } = rect;

    ctx.beginPath();
    ctx.arc(pin.x, pin.y, m.pinR, 0, Math.PI * 2);
    ctx.fillStyle = "#c4a574";
    ctx.fill();
    ctx.lineWidth = m.pinStroke;
    ctx.strokeStyle = "#fffdf8";
    ctx.stroke();

    const edge = nearestRectPoint(pin.x, pin.y, rect);
    ctx.beginPath();
    ctx.moveTo(pin.x, pin.y);
    ctx.lineTo(edge.x, edge.y);
    ctx.strokeStyle = "rgba(26,35,50,0.55)";
    ctx.lineWidth = m.leader;
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = "rgba(26,35,50,0.22)";
    ctx.shadowBlur = m.radius * 1.6;
    ctx.shadowOffsetY = m.radius * 0.6;
    roundRectPath(ctx, cardX, cardY, m.cardW, m.cardH, m.radius);
    ctx.fillStyle = "#fffdf8";
    ctx.fill();
    ctx.restore();
    roundRectPath(ctx, cardX, cardY, m.cardW, m.cardH, m.radius);
    ctx.lineWidth = Math.max(3, m.pinStroke);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, m.cardW, m.photoH, [m.radius, m.radius, 0, 0]);
    ctx.clip();
    const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
    const cr = m.cardW / m.photoH;
    let dw = m.cardW;
    let dh = m.photoH;
    let dx = cardX;
    let dy = cardY;
    if (ir > cr) {
      dw = m.photoH * ir;
      dx = cardX + (m.cardW - dw) / 2;
    } else {
      dh = m.cardW / ir;
      dy = cardY + (m.photoH - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    ctx.font = `700 ${m.font}px "DM Sans", sans-serif`;
    ctx.fillStyle = "#1a2332";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const inset = Math.round(m.cardW * 0.07);
    const lines = wrapLabel(ctx, lm.name, m.cardW - inset * 2);
    const blockH = m.lineH * lines.length;
    const textY = cardY + m.photoH + (m.captionH - blockH) / 2 + m.lineH / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, cardX + inset, textY + i * m.lineH);
    });
  }
}

function pickExportPhotos(landmarks: Landmark[], max: number): Landmark[] {
  return landmarks.filter((lm) => lm.photo).slice(0, max);
}

function placePhotoCard(
  pin: { x: number; y: number },
  ox: number,
  oy: number,
  m: ReturnType<typeof exportOverlayMetrics>,
  canvas: HTMLCanvasElement,
  placed: { x: number; y: number; w: number; h: number }[],
) {
  const { cardW, cardH, pad } = m;
  const maxX = canvas.width - cardW - pad;
  const maxY = canvas.height - cardH - pad;
  const gap = Math.round(cardW * 0.06);
  const preferX = Math.sign(ox || (pin.x < canvas.width / 2 ? 1 : -1));
  const preferY = Math.sign(oy || -1);
  const offsets: [number, number][] = [
    [preferX * cardW * 0.82, preferY * cardH * 0.62],
    [-preferX * cardW * 0.82, preferY * cardH * 0.62],
    [preferX * cardW * 0.82, -preferY * cardH * 0.62],
    [-preferX * cardW * 0.82, -preferY * cardH * 0.62],
  ];
  for (const k of [0.75, 1.05, 1.35, 1.7]) {
    for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const a = (deg * Math.PI) / 180;
      offsets.push([Math.cos(a) * cardW * k, Math.sin(a) * cardH * k]);
    }
  }
  offsets.push(
    [pad + cardW / 2 - pin.x, pad + cardH / 2 - pin.y],
    [maxX + cardW / 2 - pin.x, pad + cardH / 2 - pin.y],
    [pad + cardW / 2 - pin.x, maxY + cardH / 2 - pin.y],
    [maxX + cardW / 2 - pin.x, maxY + cardH / 2 - pin.y],
  );

  let best: { x: number; y: number; w: number; h: number } | null = null;
  let bestScore = Infinity;
  const consider = (x: number, y: number) => {
    const rect = { x, y, w: cardW, h: cardH };
    if (overlapsAny(rect, placed, gap)) return;
    if (pin.x >= x && pin.x <= x + cardW && pin.y >= y && pin.y <= y + cardH) return;
    const dist = Math.hypot(x + cardW / 2 - pin.x, y + cardH / 2 - pin.y);
    if (dist < bestScore) {
      bestScore = dist;
      best = rect;
    }
  };

  for (const [dx, dy] of offsets) {
    consider(clamp(pin.x + dx - cardW / 2, pad, maxX), clamp(pin.y + dy - cardH / 2, pad, maxY));
  }
  if (best) return best;

  const stepX = Math.max(24, Math.round(cardW * 0.28));
  const stepY = Math.max(24, Math.round(cardH * 0.28));
  for (let y = pad; y <= maxY; y += stepY) {
    for (let x = pad; x <= maxX; x += stepX) {
      consider(x, y);
    }
  }
  return (
    best ?? {
      x: clamp(pin.x - cardW / 2, pad, maxX),
      y: clamp(pin.y - cardH - pad, pad, maxY),
      w: cardW,
      h: cardH,
    }
  );
}

function overlapsAny(
  rect: { x: number; y: number; w: number; h: number },
  others: { x: number; y: number; w: number; h: number }[],
  gap = 0,
) {
  return others.some(
    (o) =>
      rect.x < o.x + o.w + gap &&
      rect.x + rect.w + gap > o.x &&
      rect.y < o.y + o.h + gap &&
      rect.y + rect.h + gap > o.y,
  );
}

function nearestRectPoint(x: number, y: number, rect: { x: number; y: number; w: number; h: number }) {
  return {
    x: clamp(x, rect.x, rect.x + rect.w),
    y: clamp(y, rect.y, rect.y + rect.h),
  };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function wrapLabel(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  if (words.length >= 2) {
    const last = words[words.length - 1];
    const head = words.slice(0, -1).join(" ");
    if (ctx.measureText(head).width <= maxWidth && ctx.measureText(last).width <= maxWidth) {
      return [head, last];
    }
  }
  const first: string[] = [];
  let rest = "";
  for (const word of words) {
    const next = first.length ? `${first.join(" ")} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      first.push(word);
    } else {
      rest = words.slice(first.length).join(" ");
      break;
    }
  }
  if (!first.length) return [fitLabel(ctx, text, maxWidth)];
  if (!rest) return [first.join(" ")];
  return [first.join(" "), fitLabel(ctx, rest, maxWidth)];
}

function fitLabel(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 3 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function tryLoadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function canvasScale(map: maplibregl.Map, canvas: HTMLCanvasElement) {
  const gl = map.getCanvas();
  return {
    sx: canvas.width / Math.max(1, gl.clientWidth),
    sy: canvas.height / Math.max(1, gl.clientHeight),
  };
}

function isMostlyBlank(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const spots = [
    [0.5, 0.5],
    [0.28, 0.28],
    [0.72, 0.72],
    [0.5, 0.22],
    [0.5, 0.78],
  ].map(([x, y]) => ctx.getImageData(Math.floor(w * x), Math.floor(h * y), 1, 1).data);
  return spots.every(([r, g, b, a]) => {
    if (a < 12) return true;
    const dark = r < 14 && g < 14 && b < 14;
    const paper = Math.abs(r - 231) < 22 && Math.abs(g - 220) < 22 && Math.abs(b - 200) < 22;
    return dark || paper;
  });
}

function lngLatToMercator(lng: number, lat: number): [number, number] {
  const x = (lng * 20037508.34) / 180;
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const n = Math.log(Math.tan(((90 + clamped) * Math.PI) / 360));
  const y = (n * 20037508.34) / Math.PI;
  return [x, y];
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn’t capture the map."));
    img.src = src;
  });
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

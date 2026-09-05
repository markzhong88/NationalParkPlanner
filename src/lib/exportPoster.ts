import { toJpeg, toPng } from "html-to-image";
import type { TripPlan } from "../types";

export function posterFilename(plan: TripPlan, ext: "png" | "pdf"): string {
  const slug = plan.parkName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `rimfold-${slug}-trip.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function waitFrames(count = 2) {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export async function waitForImage(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) return;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Couldn’t load the map image."));
  });
}

const POSTER_W = 1056;
const POSTER_H = 1632;
const POSTER_RATIO = 2;

const POSTER_STYLE: Partial<CSSStyleDeclaration> = {
  position: "relative",
  left: "0px",
  top: "0px",
  transform: "none",
  opacity: "1",
  pointerEvents: "auto",
};

export async function captureNodePng(node: HTMLElement, mapImage?: string) {
  await document.fonts.ready;
  const poster = await toPng(node, {
    width: POSTER_W,
    height: POSTER_H,
    pixelRatio: POSTER_RATIO,
    cacheBust: true,
    skipFonts: false,
    backgroundColor: "#f3ede0",
    style: POSTER_STYLE,
    filter: skipPrintMapImage,
  });
  if (!mapImage) return poster;
  return pasteMapOntoPoster(poster, mapImage, node, "png");
}

export async function captureNodeJpeg(node: HTMLElement, mapImage?: string) {
  await document.fonts.ready;
  const poster = await toJpeg(node, {
    width: POSTER_W,
    height: POSTER_H,
    quality: 0.95,
    pixelRatio: POSTER_RATIO,
    cacheBust: true,
    skipFonts: false,
    backgroundColor: "#f3ede0",
    style: POSTER_STYLE,
    filter: skipPrintMapImage,
  });
  if (!mapImage) return poster;
  return pasteMapOntoPoster(poster, mapImage, node, "jpeg");
}

function skipPrintMapImage(domNode: HTMLElement) {
  return !(domNode instanceof HTMLImageElement && domNode.dataset.printMap === "true");
}

async function pasteMapOntoPoster(
  posterUrl: string,
  mapUrl: string,
  sheet: HTMLElement,
  kind: "png" | "jpeg",
) {
  const slot = sheet.querySelector<HTMLElement>("[data-print-map-slot]");
  const poster = await loadHtmlImage(posterUrl);
  const map = await loadHtmlImage(mapUrl);
  const canvas = document.createElement("canvas");
  canvas.width = poster.naturalWidth;
  canvas.height = poster.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn’t build the poster.");
  ctx.drawImage(poster, 0, 0);

  if (slot) {
    const sheetBox = sheet.getBoundingClientRect();
    const slotBox = slot.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, sheetBox.width);
    const scaleY = canvas.height / Math.max(1, sheetBox.height);
    const x = (slotBox.left - sheetBox.left) * scaleX;
    const y = (slotBox.top - sheetBox.top) * scaleY;
    const w = slotBox.width * scaleX;
    const h = slotBox.height * scaleY;
    drawContain(ctx, map, x, y, w, h);
  }

  return kind === "png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.95);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
  const r = w / Math.max(1, h);
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > r) {
    dw = w;
    dh = w / ir;
    dy = y + (h - dh) / 2;
  } else {
    dh = h;
    dw = h * ir;
    dx = x + (w - dw) / 2;
  }
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w, h, 12 * (w / 400)));
  ctx.clip();
  ctx.fillStyle = "#e7dcc8";
  ctx.fillRect(x, y, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn’t read the poster image."));
    img.src = src;
  });
}

export async function jpegDataUrlToPdf(dataUrl: string): Promise<Blob> {
  const jpeg = dataUrlToBytes(dataUrl);
  const { width, height } = await dataUrlSize(dataUrl);
  const pageW = 11 * 72;
  const pageH = 17 * 72;
  const scale = Math.min(pageW / width, pageH / height);
  const drawW = width * scale;
  const drawH = height * scale;
  const ox = (pageW - drawW) / 2;
  const oy = (pageH - drawH) / 2;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets = [0, 0, 0, 0, 0, 0];
  let pos = 0;
  const add = (data: string | Uint8Array) => {
    const part = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(part);
    pos += part.length;
  };

  add("%PDF-1.4\n");
  offsets[1] = pos;
  add("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
  offsets[2] = pos;
  add("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n");
  offsets[3] = pos;
  add(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >> endobj\n`,
  );
  const content = `q ${fmt(drawW)} 0 0 ${fmt(drawH)} ${fmt(ox)} ${fmt(oy)} cm /Im0 Do Q\n`;
  offsets[4] = pos;
  add(`4 0 obj << /Length ${content.length} >> stream\n${content}endstream endobj\n`);
  offsets[5] = pos;
  add(
    `5 0 obj << /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`,
  );
  add(jpeg);
  add("\nendstream endobj\n");

  const xrefPos = pos;
  add(`xref\n0 6\n0000000000 65535 f \n`);
  for (let i = 1; i <= 5; i++) {
    add(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  add(`trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

function fmt(n: number) {
  return n.toFixed(2);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function dataUrlSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Couldn’t read the poster image."));
    img.src = dataUrl;
  });
}

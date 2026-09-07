import { toJpeg, toPng } from "html-to-image";
import type { TripPlan } from "../types";

export function posterFilename(plan: TripPlan, ext: "png" | "pdf" | "txt"): string {
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
  if (!img.src) return;
  if (!img.complete) {
    await new Promise<void>((resolve, reject) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => reject(new Error("Couldn’t load a poster image.")), {
        once: true,
      });
    });
  }
  if (img.naturalWidth === 0) throw new Error("Couldn’t load a poster image.");
  try {
    await img.decode();
  } catch {
    /* already on screen */
  }
}

export const POSTER_W = 1056;
/** A4 portrait at the same CSS width (210 × 297 mm). */
export const POSTER_H = 1494;
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
  const { width, height } = posterCaptureSize(node);
  const poster = await toPng(node, {
    width,
    height,
    pixelRatio: POSTER_RATIO,
    cacheBust: false,
    skipFonts: false,
    backgroundColor: "#f3ede0",
    style: POSTER_STYLE,
    filter: skipPrintRasterImages,
  });
  if (!mapImage) return poster;
  return pasteOverlaysOntoPoster(poster, mapImage, node, "png");
}

export async function captureNodeJpeg(node: HTMLElement, mapImage?: string) {
  await document.fonts.ready;
  const { width, height } = posterCaptureSize(node);
  const poster = await toJpeg(node, {
    width,
    height,
    quality: 0.95,
    pixelRatio: POSTER_RATIO,
    cacheBust: false,
    skipFonts: false,
    backgroundColor: "#f3ede0",
    style: POSTER_STYLE,
    filter: skipPrintRasterImages,
  });
  if (!mapImage) return poster;
  return pasteOverlaysOntoPoster(poster, mapImage, node, "jpeg");
}

function posterCaptureSize(_node: HTMLElement) {
  return {
    width: POSTER_W,
    height: POSTER_H,
  };
}

function skipPrintRasterImages(domNode: HTMLElement) {
  if (!(domNode instanceof HTMLImageElement)) return true;
  return domNode.dataset.printMap !== "true" && domNode.dataset.printPhoto !== "true";
}

const photoBitmaps = new Map<string, Promise<ImageBitmap>>();

export function warmPosterPhoto(src: string) {
  if (!src) return Promise.resolve();
  const key = new URL(src, window.location.href).href;
  if (!photoBitmaps.has(key)) {
    photoBitmaps.set(
      key,
      fetch(key)
        .then((res) => {
          if (!res.ok) throw new Error("Couldn’t load a poster image.");
          return res.blob();
        })
        .then((blob) => createImageBitmap(blob)),
    );
  }
  return photoBitmaps.get(key)!.then(() => undefined).catch(() => undefined);
}

async function photoBitmap(src: string): Promise<ImageBitmap | null> {
  if (!src) return null;
  const key = new URL(src, window.location.href).href;
  warmPosterPhoto(key);
  try {
    return (await photoBitmaps.get(key)) ?? null;
  } catch {
    return null;
  }
}

async function pasteOverlaysOntoPoster(
  posterUrl: string,
  mapUrl: string,
  sheet: HTMLElement,
  kind: "png" | "jpeg",
) {
  const slot = sheet.querySelector<HTMLElement>("[data-print-map-slot]");
  const photos = [...sheet.querySelectorAll<HTMLImageElement>("img[data-print-photo]")];
  const poster = await loadHtmlImage(posterUrl);
  const map = await loadHtmlImage(mapUrl);
  const canvas = document.createElement("canvas");
  canvas.width = poster.naturalWidth;
  canvas.height = poster.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn’t build the poster.");
  ctx.drawImage(poster, 0, 0);

  const sheetBox = sheet.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(1, sheetBox.width);
  const scaleY = canvas.height / Math.max(1, sheetBox.height);
  const place = (box: DOMRect) => ({
    x: (box.left - sheetBox.left) * scaleX,
    y: (box.top - sheetBox.top) * scaleY,
    w: box.width * scaleX,
    h: box.height * scaleY,
  });

  if (slot) {
    const { x, y, w, h } = place(slot.getBoundingClientRect());
    drawContain(ctx, map, x, y, w, h);
  }

  for (const img of photos) {
    const { x, y, w, h } = place(img.getBoundingClientRect());
    if (w < 1 || h < 1) continue;
    const bmp = await photoBitmap(img.currentSrc || img.src);
    const source = bmp ?? (img.complete && img.naturalWidth > 0 ? img : null);
    if (!source) continue;
    drawCover(ctx, source, x, y, w, h);
    const caption = img
      .closest("figure")
      ?.querySelector<HTMLElement>("[data-print-photo-caption]");
    if (caption) drawCaption(ctx, caption, place(caption.getBoundingClientRect()), scaleY);
  }

  return kind === "png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.95);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  fitImage(ctx, img, x, y, w, h, "contain");
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  fitImage(ctx, img, x, y, w, h, "cover");
}

function sourceSize(img: CanvasImageSource) {
  if (img instanceof HTMLImageElement) return { w: img.naturalWidth, h: img.naturalHeight };
  if (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) {
    return { w: img.width, h: img.height };
  }
  return { w: 0, h: 0 };
}

function fitImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: "contain" | "cover",
) {
  const { w: iw, h: ih } = sourceSize(img);
  const ir = iw / Math.max(1, ih);
  const r = w / Math.max(1, h);
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  const fitWider = mode === "contain" ? ir > r : ir < r;
  if (fitWider) {
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
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (mode === "contain") {
    ctx.fillStyle = "#e7dcc8";
    ctx.fillRect(x, y, w, h);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  el: HTMLElement,
  box: { x: number; y: number; w: number; h: number },
  scale: number,
) {
  const text = el.textContent?.trim();
  if (!text || box.w < 1 || box.h < 1) return;
  const style = getComputedStyle(el);
  const fontSize = Math.max(10, parseFloat(style.fontSize) * scale);
  ctx.save();
  ctx.fillStyle = "#f3ede0";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = style.color || "#1f3a2e";
  ctx.font = `${style.fontWeight || 500} ${fontSize}px ${style.fontFamily || "Oswald, sans-serif"}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(text, box.x, box.y, box.w);
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
  const pageW = 595.28;
  const pageH = 841.89;
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

import { DAY_COLORS } from "../lib/colors";

export function formatDateRange(start: Date, days: number): string {
  const end = addDays(start, days - 1);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultStartDate(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSat);
  return toISODate(d);
}

export function travelerLabel(adults: number, kids: number): string {
  const adultBit = adults === 1 ? "1 adult" : `${adults} adults`;
  if (kids <= 0) {
    if (adults <= 1) return "Solo traveler";
    if (adults === 2) return "2 adults";
    return adultBit;
  }
  const kidBit = kids === 1 ? "1 kid" : `${kids} kids`;
  return `${adultBit}, ${kidBit}`;
}

export function dayColor(index: number): string {
  return DAY_COLORS[index % DAY_COLORS.length];
}

import { downloadBlob, posterFilename } from "./exportPoster";
import type { CostEstimate, TripPlan } from "../types";
import { copyToClipboard } from "./clipboard";
import { usd } from "./estimateCost";
import { formatDayHeading } from "./format";

export function formatTripText(plan: TripPlan): string {
  const lines: string[] = [
    prettyTitle(plan.title),
    plan.subtitle,
    `${plan.dateRange} · ${plan.travelers}`,
    "",
    plan.styleNote,
  ];

  if (plan.cost) {
    lines.push("", ...costLines(plan.cost));
  }

  lines.push("", "ITINERARY", "");

  for (const day of plan.days) {
    const heading = day.route || day.title;
    lines.push(`Day ${day.day} — ${formatDayHeading(day.date)}`);
    lines.push(heading);
    for (const item of day.activities) {
      lines.push(`- ${item}`);
    }
    const places = plan.landmarks
      .filter((lm) => lm.days?.includes(day.day))
      .map((lm) => lm.name);
    if (places.length) {
      lines.push(`Places: ${places.join(" · ")}`);
    }
    lines.push(`Stay: ${day.stay}`);
    lines.push("");
  }

  lines.push("DRIVING");
  lines.push(`${plan.totalMiles} mi · ${plan.totalKm} km`);
  for (const leg of plan.driveLegs) {
    lines.push(`Day ${leg.day}  ${leg.from} → ${leg.to}  ${leg.label}`);
  }

  lines.push("", "Stays are a base, not a booking. We name a lodge only when rooms inside the park are scarce.");
  if (plan.cost) {
    lines.push(plan.cost.disclaimer);
  }
  lines.push("", "rimfold.com");

  return lines.join("\n").trim() + "\n";
}

export async function copyTripText(plan: TripPlan): Promise<"copied" | "downloaded"> {
  const text = formatTripText(plan);
  if (await copyToClipboard(text)) return "copied";
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), posterFilename(plan, "txt"));
  return "downloaded";
}

function costLines(cost: CostEstimate): string[] {
  const mid = Math.round((cost.totalLow + cost.totalHigh) / 2);
  const rows: [string, { low: number; high: number }][] = [
    ["Flights", cost.flights],
    ["Hotels", cost.hotels],
    ["Rental car", cost.rental],
    ["Food", cost.food],
    ["Park & extras", cost.extras],
  ];
  return [
    "ESTIMATED COST",
    `${usd(cost.totalLow)} – ${usd(cost.totalHigh)}  (about ${usd(mid)})`,
    ...rows.map(([label, line]) => {
      const range = line.low === 0 && line.high === 0 ? "—" : `${usd(line.low)}–${usd(line.high)}`;
      return `${label}: ${range}`;
    }),
  ];
}

function prettyTitle(value: string): string {
  return value.toLowerCase().replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

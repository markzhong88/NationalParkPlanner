import type { FeedbackSource } from "./tripFeedback";
import type { TripInput } from "../types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
] as const;

const STORAGE_KEY = "rimfold.campaign";

type Campaign = Partial<Record<(typeof CAMPAIGN_KEYS)[number], string>>;

let campaign = captureCampaign();

export type GenerateSource = "form" | "demo" | "shared_link";

export function track(name: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const payload = {
    ...campaignParams(),
    ...omitEmpty(params),
  };
  window.gtag?.("event", name, payload);
}

export function trackGenerateTrip(input: TripInput, source: GenerateSource, extra: {
  flying?: boolean;
  parkName?: string;
} = {}) {
  track("generate_trip", {
    park_id: input.parkId,
    park_name: extra.parkName ?? input.parkId,
    also_park_id: input.alsoParkId ?? "(none)",
    days: input.days,
    adults: input.adults,
    kids: input.kids,
    home: input.home.slice(0, 80),
    flying: extra.flying ?? false,
    source,
  });
}

export function trackGenerateFailed(parkId: string) {
  track("generate_trip_failed", { park_id: parkId });
}

export function trackSelectPark(parkId: string) {
  track("select_park", { park_id: parkId });
}

export function trackDownload(kind: "png" | "pdf", input: TripInput, parkName: string) {
  track(kind === "png" ? "download_image" : "download_pdf", {
    park_id: input.parkId,
    park_name: parkName,
    file_extension: kind,
  });
}

export function trackCopyTrip(input: TripInput, parkName: string, method: "copied" | "downloaded") {
  track("copy_trip", {
    park_id: input.parkId,
    park_name: parkName,
    method,
  });
}

export function trackPlanAnother() {
  track("plan_another_trip");
}

export function trackFeedback() {
  track("send_feedback");
}

export function trackItineraryFeedback(opts: {
  rating: "very" | "pretty" | "no";
  parkName: string;
  parkId: string;
  days: number;
  returning: boolean;
  source: FeedbackSource;
  hasNote: boolean;
  note?: string;
}) {
  track("itinerary_feedback", {
    rating: opts.rating,
    park_id: opts.parkId,
    park_name: opts.parkName,
    days: opts.days,
    returning: opts.returning,
    source: opts.source,
    has_note: opts.hasNote,
    feedback_note: opts.note?.slice(0, 100),
  });
}

function captureCampaign(): Campaign {
  const fromUrl = campaignFromSearch(window.location.search);
  if (Object.keys(fromUrl).length) {
    writeStored(fromUrl);
    return fromUrl;
  }
  return readStored();
}

function campaignParams(): Record<string, string> {
  const live = campaignFromSearch(window.location.search);
  if (Object.keys(live).length) {
    campaign = { ...campaign, ...live };
    writeStored(campaign);
  }
  const params: Record<string, string> = {};
  if (campaign.utm_source) params.traffic_source = campaign.utm_source;
  if (campaign.utm_medium) params.traffic_medium = campaign.utm_medium;
  if (campaign.utm_campaign) params.traffic_campaign = campaign.utm_campaign;
  if (campaign.utm_content) params.traffic_content = campaign.utm_content;
  if (campaign.utm_term) params.traffic_term = campaign.utm_term;
  return params;
}

function campaignFromSearch(search: string): Campaign {
  const q = new URLSearchParams(search);
  const next: Campaign = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = q.get(key)?.trim();
    if (value) next[key] = value.slice(0, 100);
  }
  return next;
}

function readStored(): Campaign {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Campaign;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(value: Campaign) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

function omitEmpty(params: Record<string, string | number | boolean | undefined>) {
  const next: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    next[key] = value;
  }
  return next;
}

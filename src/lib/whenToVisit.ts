import { getPark } from "../data/parks";
import type { ParkProfile } from "../types";
import { gatewayHome } from "./howManyDays";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type Heat = "cold" | "cool" | "mild" | "warm" | "hot";
export type Crowds = "quiet" | "busy" | "packed";

export type MonthRow = {
  month: number;
  heat: Heat;
  crowds: Crowds;
  kids: string;
  note: string;
  summary: string;
};

export type WhenGuide = {
  park: ParkProfile;
  home: string;
  tripHref: string;
  tripLabel: string;
  bestMonths: number[];
  lede: string;
  caveat: string;
  months: MonthRow[];
  faqs: { q: string; a: string }[];
};

const HEAT_LABEL: Record<Heat, string> = {
  cold: "Cold",
  cool: "Cool",
  mild: "Mild",
  warm: "Warm",
  hot: "Hot",
};

const CROWD_LABEL: Record<Crowds, string> = {
  quiet: "Quiet",
  busy: "Busy",
  packed: "Packed",
};

export function heatLabel(heat: Heat): string {
  return HEAT_LABEL[heat];
}

export function crowdLabel(crowds: Crowds): string {
  return CROWD_LABEL[crowds];
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export function whenParkIds(): string[] {
  return WHEN_BY_PARK.map((guide) => guide.parkId);
}

export function whenGuide(parkId: string): WhenGuide | null {
  const raw = WHEN_BY_PARK.find((guide) => guide.parkId === parkId);
  const park = getPark(parkId);
  if (!raw || !park) return null;
  return {
    park,
    home: gatewayHome(park),
    tripHref: raw.tripHref,
    tripLabel: raw.tripLabel,
    bestMonths: raw.bestMonths,
    lede: raw.lede,
    caveat: raw.caveat,
    months: raw.months,
    faqs: raw.faqs,
  };
}

export function allWhenGuides(): WhenGuide[] {
  return whenParkIds()
    .map((id) => whenGuide(id))
    .filter((guide): guide is WhenGuide => Boolean(guide));
}

type RawGuide = Omit<WhenGuide, "park" | "home"> & { parkId: string };

const WHEN_BY_PARK: RawGuide[] = [
  {
    parkId: "grand-canyon",
    tripHref: "/trips/grand-canyon-7-day/",
    tripLabel: "7-day Grand Canyon trip from Phoenix",
    bestMonths: [4, 5, 9, 10],
    lede:
      "September and October are the months to aim for on the South Rim: cooler hiking and lighter crowds than July. April and May are the spring version. Summer is packed, and the inner canyon is dangerously hot — stay on the rim with kids.",
    caveat:
      "South Rim is open all year. North Rim is usually mid-May to mid-October. Inner-canyon temperatures are much hotter than the rim. Check NPS for the current North Rim dates.",
    months: [
      {
        month: 1,
        heat: "cold",
        crowds: "quiet",
        kids: "Fine if you pack layers",
        note: "Possible snow on the rim. Some facilities close. Inner canyon is hikeable but icy at dawn.",
        summary:
          "January is the quietest South Rim month. Cold, possible snow, fewer services — a good trip if you want space, not if you want every lodge open.",
      },
      {
        month: 2,
        heat: "cold",
        crowds: "quiet",
        kids: "Fine if you pack layers",
        note: "Still winter on the rim. Presidents’ Day weekend is the one busy bump.",
        summary:
          "February stays quiet and cold. Same winter South Rim trip as January, with a short holiday crowd.",
      },
      {
        month: 3,
        heat: "cool",
        crowds: "busy",
        kids: "Spring break is crowded",
        note: "Rim is warming; wind is common. Spring break fills lodges and overlooks.",
        summary:
          "March is nicer weather and a busier rim. If the kids are on spring break, book lodging early and start at sunrise.",
      },
      {
        month: 4,
        heat: "mild",
        crowds: "busy",
        kids: "One of the better months",
        note: "Classic spring window. North Rim is still closed. Inner canyon is warming but usually hikeable in the morning.",
        summary:
          "April is a best-time month on the South Rim: mild days, busy but not July. North Rim is still shut.",
      },
      {
        month: 5,
        heat: "warm",
        crowds: "busy",
        kids: "Good before school lets out",
        note: "North Rim typically opens mid-month. Inner canyon heat is building — turn around early on Bright Angel or South Kaibab.",
        summary:
          "May is still a best-time month if you stay on the rim. Inner canyon hikes need a dawn start. North Rim usually opens mid-May.",
      },
      {
        month: 6,
        heat: "hot",
        crowds: "packed",
        kids: "Rim is ok; skip the inner canyon",
        note: "School’s out. Inner canyon is often too hot for a rim-to-river day. Monsoon has not really started.",
        summary:
          "June is packed and the inner canyon is getting dangerous. Keep the week on the South Rim, Sedona, and Page — not a long descent.",
      },
      {
        month: 7,
        heat: "hot",
        crowds: "packed",
        kids: "Tough — heat and crowds",
        note: "Peak summer. Monsoon storms in the afternoon. Inner canyon can exceed 110°F. Rim is cooler (~80s) but overlooks are full.",
        summary:
          "July is the hardest family month: packed overlooks, monsoon afternoons, and a dangerously hot inner canyon. If this is the only week you have, stay on the rim and start at dawn.",
      },
      {
        month: 8,
        heat: "hot",
        crowds: "packed",
        kids: "Tough — heat and crowds",
        note: "Same as July. Afternoon storms. Parking at popular viewpoints fills early.",
        summary:
          "August is still peak summer. Same rules as July: rim only with kids, early starts, expect storms after lunch.",
      },
      {
        month: 9,
        heat: "warm",
        crowds: "busy",
        kids: "Best if you can travel after Labor Day",
        note: "Crowds ease after Labor Day. Inner canyon is still hot early in the month. North Rim is open.",
        summary:
          "September is the month most people should pick. After Labor Day the rim breathes, days are still long, and North Rim is open.",
      },
      {
        month: 10,
        heat: "mild",
        crowds: "busy",
        kids: "Excellent hiking weather",
        note: "Cool, clear rim days. North Rim usually closes mid-month. Shorter daylight.",
        summary:
          "October is the other best-time month: mild South Rim hiking and fewer people than summer. Don’t count on North Rim after mid-month.",
      },
      {
        month: 11,
        heat: "cool",
        crowds: "quiet",
        kids: "Quiet, cold nights",
        note: "Services wind down. Possible snow. South Rim stays open.",
        summary:
          "November is quiet and cool. A good South Rim week if you want space and don’t need every restaurant open.",
      },
      {
        month: 12,
        heat: "cold",
        crowds: "quiet",
        kids: "Holiday week is the exception",
        note: "Quiet except Christmas week. Snow is possible. South Rim roads are plowed.",
        summary:
          "December is a winter South Rim trip — quiet unless you overlap the holidays, with possible snow and cold overlooks.",
      },
    ],
    faqs: [
      {
        q: "When is the best time to visit the Grand Canyon?",
        a: "September, October, April, and May on the South Rim. Those months have hikeable weather and fewer people than July. The inner canyon is a different climate — do not treat a summer rim trip as a rim-to-river trip.",
      },
      {
        q: "What is the best month to visit the Grand Canyon?",
        a: "September after Labor Day, or October before the North Rim closes. April is the spring pick. July and August are the months to avoid if you have any flexibility.",
      },
      {
        q: "Is summer too crowded?",
        a: "Yes, especially June through mid-August. Overlooks and in-park lodging fill. You can still go — start at sunrise, stay on the rim with kids, and skip a long inner-canyon hike.",
      },
      {
        q: "Is the Grand Canyon good with kids in July?",
        a: "The rim is doable: short walks, shuttles, sunset. The inner canyon is not. Heat and crowds make July the hardest family month. September is kinder.",
      },
    ],
  },
  {
    parkId: "zion",
    tripHref: "/trips/zion-7-day/",
    tripLabel: "7-day Zion trip from Las Vegas",
    bestMonths: [4, 9, 10],
    lede:
      "September and October are the usual answer: still warm, fewer people after Labor Day, and the Narrows is usually in. April is the spring pick if you can live without the Narrows (snowmelt). July and August work only if you start at dawn and expect 100°F in the canyon.",
    caveat:
      "The Zion Canyon shuttle usually runs spring through fall; when it does, you cannot drive the Scenic Drive. Angels Landing needs a permit year-round. Narrows flow can shut the hike in spring. Check NPS for this year’s shuttle dates.",
    months: [
      {
        month: 1,
        heat: "cold",
        crowds: "quiet",
        kids: "Icy trails, quiet canyon",
        note: "You can usually drive the Scenic Drive. Trails can be icy. Narrows is a dry-suit trip.",
        summary:
          "January is the quietest Zion month. Cold, icy in the shadows, and you can often drive the canyon instead of riding the shuttle.",
      },
      {
        month: 2,
        heat: "cold",
        crowds: "quiet",
        kids: "Still winter in the canyon",
        note: "Same winter pattern as January. Holiday weekends are the only real crowd.",
        summary:
          "February stays quiet and cold. A winter Zion week, not a swimming-the-Narrows week.",
      },
      {
        month: 3,
        heat: "cool",
        crowds: "busy",
        kids: "Spring break fills Springdale",
        note: "Weather swings. Shuttle typically starts. Narrows flow is rising toward runoff.",
        summary:
          "March is milder and suddenly busy — spring break in Springdale. Book lodging, and don’t count on the Narrows.",
      },
      {
        month: 4,
        heat: "mild",
        crowds: "busy",
        kids: "Good weather; expect the shuttle",
        note: "Wildflowers, mild days, busy canyon. Narrows is often high or closed from snowmelt.",
        summary:
          "April is a best-time month for weather, not for the Narrows. Plan Riverside Walk, Canyon Overlook, and Bryce — not a long river day.",
      },
      {
        month: 5,
        heat: "warm",
        crowds: "busy",
        kids: "Warm; Narrows still a gamble",
        note: "Heat is starting. Narrows is often still closed or dangerous. Parking at the visitor center fills early.",
        summary:
          "May is warm and busy. Treat the Narrows as a maybe. Be at the visitor center before 7 a.m. for parking and the shuttle.",
      },
      {
        month: 6,
        heat: "hot",
        crowds: "packed",
        kids: "Early starts or they wilt",
        note: "Canyon often hits 100°F. Shuttle lines. Narrows may reopen as flow drops. Arrive by 6:30 a.m.",
        summary:
          "June is packed and hot in the canyon. It works if you ride the first shuttle and sit out midday. Not a casual 10 a.m. start.",
      },
      {
        month: 7,
        heat: "hot",
        crowds: "packed",
        kids: "Hard — heat and lines",
        note: "Peak heat and crowds. Angels Landing lottery is competitive. Flash-flood season in slot canyons.",
        summary:
          "July is the hardest Zion month: 100°F in the canyon, full parking lots, long shuttle lines. Go only if this is the week you have, and start at dawn.",
      },
      {
        month: 8,
        heat: "hot",
        crowds: "packed",
        kids: "Hard — heat and lines",
        note: "Same as July. Late month can be slightly easier as some families leave, but the canyon is still hot.",
        summary:
          "August is still peak summer in Zion. Same dawn-start rules as July. Wait until September if you can.",
      },
      {
        month: 9,
        heat: "warm",
        crowds: "busy",
        kids: "Best family month if you can go",
        note: "After Labor Day the canyon eases. Still warm. Narrows is usually in. Shuttle still running.",
        summary:
          "September is the month to pick: fewer people after Labor Day, hikeable temps, and the Narrows is usually open.",
      },
      {
        month: 10,
        heat: "mild",
        crowds: "busy",
        kids: "Excellent — cooler canyon",
        note: "Cooler days, fall color in the canyon. Weekends stay busy. Shuttle usually still on.",
        summary:
          "October is the other best-time month. Milder than September, still a shuttle canyon, still worth a 7-day loop from Vegas.",
      },
      {
        month: 11,
        heat: "cool",
        crowds: "quiet",
        kids: "Quieter; cold mornings",
        note: "Shuttle often ends — you may drive the Scenic Drive. Icy shade. Shorter days.",
        summary:
          "November is quieter and cooler. A good week if you like driving the canyon yourself and don’t need long daylight.",
      },
      {
        month: 12,
        heat: "cold",
        crowds: "quiet",
        kids: "Holiday week excepted",
        note: "Quietest aside from Christmas week. Ice on trails. Scenic Drive usually open to cars.",
        summary:
          "December is a quiet, cold Zion. Fine for a short canyon stay — not the week for the Narrows with kids.",
      },
    ],
    faqs: [
      {
        q: "When is the best time to visit Zion National Park?",
        a: "September and October. Weather is still good, crowds drop after Labor Day, and the Narrows is usually hikeable. April is the spring pick if you skip the Narrows. July and August are hot and packed.",
      },
      {
        q: "What is the best month to visit Zion?",
        a: "September after Labor Day, or October. Those two months beat summer heat and spring runoff. March is a spring-break crowd. May is warm and the Narrows is often still out.",
      },
      {
        q: "How do you avoid crowds in Zion?",
        a: "Go in September–November or January–February. In any busy month, be at the visitor center before 7 a.m. (6:30 in summer) and ride an early shuttle. Weekdays help. The shuttle does not skip the line for late arrivals.",
      },
      {
        q: "Is July too hot for Zion with kids?",
        a: "The canyon floor often hits 100°F. It is doable with a dawn shuttle, shade at midday, and no long exposed hike. September is a kinder family month.",
      },
    ],
  },
];

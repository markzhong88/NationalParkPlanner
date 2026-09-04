export type Coordinates = {
  lng: number;
  lat: number;
};

export type TripInput = {
  home: string;
  parkId: string;
  adults: number;
  kids: number;
  days: number;
  startDate: string;
};

export type CostLine = {
  low: number;
  high: number;
  note: string;
};

export type CostEstimate = {
  currency: "USD";
  flights: CostLine;
  hotels: CostLine;
  rental: CostLine;
  food: CostLine;
  extras: CostLine;
  totalLow: number;
  totalHigh: number;
  disclaimer: string;
};

export type Landmark = {
  id: string;
  name: string;
  coord: Coordinates;
  photo?: string;
  /** Pixel offset of the photo card from the map pin [x, y] */
  offset?: [number, number];
  days?: number[];
};

export type MapStop = {
  id: string;
  name: string;
  coord: Coordinates;
  color: string;
  overnight: boolean;
  kind: "city" | "park" | "viewpoint";
  days: number[];
};

export type DayPlan = {
  day: number;
  date: Date;
  color: string;
  title: string;
  route?: string;
  driveHours: number;
  driveLabel: string;
  activities: string[];
  stay: string;
  stayPlace: string;
  coord: Coordinates;
};

export type MapEndpoint = {
  name: string;
  coord: Coordinates;
};

export type DriveLeg = {
  day: number;
  from: string;
  to: string;
  hours: number;
  label: string;
  geometry: [number, number][];
};

export type TripPlan = {
  title: string;
  subtitle: string;
  dateRange: string;
  travelers: string;
  styleNote: string;
  highlights: string[];
  days: DayPlan[];
  mapStops: MapStop[];
  landmarks: Landmark[];
  driveLegs: DriveLeg[];
  totalMiles: number;
  totalKm: number;
  flying: boolean;
  gateway: string;
  bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  routeWaypoints: Coordinates[];
  routeGeometry: [number, number][];
  homeLabel: string;
  homeAirport: string;
  gatewayAirport: string;
  flightMiles: number;
  parkName: string;
  adults: number;
  kids: number;
  hotelNights: number;
  startPoint: MapEndpoint;
  endPoint: MapEndpoint;
  cost?: CostEstimate;
};

export type City = {
  name: string;
  state: string;
  coord: Coordinates;
  airport: string;
  aliases?: string[];
};

export type StayArea = {
  id: string;
  name: string;
  coord: Coordinates;
  lodging: string;
  lodgingFamily?: string;
  /** named = scarce lodge worth booking by name. area = pick any hotel in this town. */
  lodgingKind?: "named" | "area";
};

export type ExploreBlock = {
  id: string;
  label: string;
  areaId: string;
  driveHoursFromPrev: number;
  driveFrom?: string;
  activities: string[];
  familyActivities?: string[];
  stayNights: number;
  travelDayActivities?: string[];
  fullDayActivities?: string[];
};

export type ParkProfile = {
  id: string;
  name: string;
  shortName: string;
  state: string;
  regionTitle: string;
  blurb: string;
  coord: Coordinates;
  gateway: {
    city: string;
    airport: string;
    coord: Coordinates;
  };
  stayAreas: StayArea[];
  blocks: ExploreBlock[];
  landmarks: Landmark[];
  typicalLoopMiles: number;
};

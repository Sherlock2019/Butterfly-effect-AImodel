/**
 * Geography for the globe: coordinates for the places named in ACMP's recorded examples
 * (4 countries, 6 cities and their neighbours). A place that is not
 * listed is "not known" and is never guessed: the console says so instead of pinning it.
 */

export interface LL { lat: number; lon: number }
export interface Place extends LL { name: string; kind: "city" | "country"; country?: string; neighbours?: string[] }

export const PLACES: Record<string, Place> = {
  france: { name: "France", kind: "country", lat: 46.6, lon: 2.4, neighbours: ["Belgium", "Germany", "Switzerland", "Italy", "Spain"] },
  "united kingdom": { name: "United Kingdom", kind: "country", lat: 54.0, lon: -2.5, neighbours: ["Ireland"] },
  "united states": { name: "United States", kind: "country", lat: 39.8, lon: -98.6, neighbours: ["Canada", "Mexico"] },
  vietnam: { name: "Vietnam", kind: "country", lat: 14.06, lon: 108.28, neighbours: ["China", "Laos", "Cambodia"] },
  paris: { name: "Paris", kind: "city", lat: 48.8566, lon: 2.3522, country: "france", neighbours: ["Boulogne-Billancourt", "Saint-Denis", "Montreuil"] },
  lyon: { name: "Lyon", kind: "city", lat: 45.764, lon: 4.8357, country: "france", neighbours: ["Villeurbanne", "Vénissieux"] },
  london: { name: "London", kind: "city", lat: 51.5074, lon: -0.1278, country: "united kingdom", neighbours: ["Croydon", "Watford", "Slough"] },
  "new york": { name: "New York", kind: "city", lat: 40.7128, lon: -74.006, country: "united states", neighbours: ["Jersey City", "Newark", "Yonkers"] },
  hanoi: { name: "Hanoi", kind: "city", lat: 21.0278, lon: 105.8342, country: "vietnam", neighbours: ["Bắc Ninh", "Hưng Yên"] },
  "ho chi minh city": { name: "Ho Chi Minh City", kind: "city", lat: 10.8231, lon: 106.6297, country: "vietnam", neighbours: ["Bình Dương", "Đồng Nai"] },
};

export const POINTS: Record<string, LL> = {
  "Boulogne-Billancourt": { lat: 48.8397, lon: 2.2399 }, "Saint-Denis": { lat: 48.9362, lon: 2.3574 }, Montreuil: { lat: 48.8638, lon: 2.4485 },
  Villeurbanne: { lat: 45.7719, lon: 4.8902 }, "Vénissieux": { lat: 45.6973, lon: 4.8859 },
  Croydon: { lat: 51.3762, lon: -0.0982 }, Watford: { lat: 51.6565, lon: -0.3903 }, Slough: { lat: 51.5105, lon: -0.595 },
  "Jersey City": { lat: 40.7178, lon: -74.0431 }, Newark: { lat: 40.7357, lon: -74.1724 }, Yonkers: { lat: 40.9312, lon: -73.8988 },
  "Bắc Ninh": { lat: 21.1861, lon: 106.0763 }, "Hưng Yên": { lat: 20.6464, lon: 106.0511 },
  "Bình Dương": { lat: 11.3254, lon: 106.477 }, "Đồng Nai": { lat: 10.9574, lon: 106.8426 },
  Belgium: { lat: 50.5, lon: 4.47 }, Germany: { lat: 51.17, lon: 10.45 }, Switzerland: { lat: 46.82, lon: 8.23 }, Italy: { lat: 41.87, lon: 12.57 }, Spain: { lat: 40.46, lon: -3.75 },
  Ireland: { lat: 53.41, lon: -8.24 }, Canada: { lat: 56.13, lon: -106.35 }, Mexico: { lat: 23.63, lon: -102.55 },
  China: { lat: 35.86, lon: 104.2 }, Laos: { lat: 19.86, lon: 102.5 }, Cambodia: { lat: 12.57, lon: 104.99 },
};

const norm = (s: string) => s.trim().toLowerCase();

export function findPlace(name: string | null | undefined): Place | null {
  if (!name) return null;
  const n = norm(name);
  if (PLACES[n]) return PLACES[n];
  return Object.values(PLACES).find((p) => norm(p.name) === n) ?? null;
}

/** The action's place from the rule engine's report: the WHERE ring's extent or a named place. */
export function placeOfRings(rings: { key: string; extent: string | null }[], places: string[] = []): Place | null {
  const env = rings.find((r) => r.key === "environment")?.extent;
  const city = rings.find((r) => r.key === "city")?.extent;
  for (const c of [env, city, ...places]) {
    const p = findPlace(c ?? null);
    if (p) return p;
  }
  return null;
}

export function pointOf(name: string): LL | null {
  const p = findPlace(name);
  return p ?? POINTS[name] ?? null;
}

/** How far each ring reaches on the map, and how high the camera goes to see it (metres). */
export const RING_GEO: Record<string, { radius: number; camera: number; label: string }> = {
  // the near field is drawn wider than life so pins and world layers stay readable
  actor: { radius: 1400, camera: 9000, label: "SELF" },
  impacted: { radius: 2400, camera: 13000, label: "IMPACTED" },
  other_actors: { radius: 3600, camera: 18000, label: "OTHER ACTORS" },
  environment: { radius: 5200, camera: 24000, label: "LOCAL" },
  neighbour: { radius: 9000, camera: 45000, label: "NEIGHBOURS" },
  organization: { radius: 14000, camera: 70000, label: "ORGANISATION" },
  city: { radius: 20000, camera: 110000, label: "CITY" },
  country: { radius: 450000, camera: 2600000, label: "COUNTRY" },
  society: { radius: 900000, camera: 5200000, label: "SOCIETY" },
  earth: { radius: 2600000, camera: 17000000, label: "EARTH" },
};

/** A point at distance d (m) and bearing b (deg) from p. */
export function offset(p: LL, d: number, bearingDeg: number): LL {
  const R = 6371000;
  const br = (bearingDeg * Math.PI) / 180;
  const la1 = (p.lat * Math.PI) / 180;
  const lo1 = (p.lon * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d / R) + Math.cos(la1) * Math.sin(d / R) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(d / R) * Math.cos(la1), Math.cos(d / R) - Math.sin(la1) * Math.sin(la2));
  return { lat: (la2 * 180) / Math.PI, lon: (((lo2 * 180) / Math.PI + 540) % 360) - 180 };
}

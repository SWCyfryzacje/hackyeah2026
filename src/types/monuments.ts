export type Monument = {
  id: number;
  name: string;
  kind: string;
  description: string | null;
  imageUrl: string | null;
  score: number;
  latitude: number;
  longitude: number;
  distanceM: number; // from the user (near) or from the route (along route)
  routeFraction?: number; // 0..1 position along the route
};

export type MonumentRow = {
  id: number;
  name: string;
  kind: string;
  description: string | null;
  image_url: string | null;
  score: number;
  latitude: number;
  longitude: number;
  distance_m: number;
  route_fraction?: number;
};

export interface CityOption {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  radiusKm?: number;
}

export const DEFAULT_CITY_ID = "bilaspur";

export const CITY_OPTIONS: CityOption[] = [
  {
    id: "bilaspur",
    name: "Bilaspur",
    state: "Chhattisgarh",
    lat: 22.0836,
    lng: 82.154,
    radiusKm: 15,
  },
  {
    id: "raipur",
    name: "Raipur",
    state: "Chhattisgarh",
    lat: 21.2458,
    lng: 81.5886,
    radiusKm: 20,
  },
  {
    id: "durg",
    name: "Durg",
    state: "Chhattisgarh",
    lat: 21.1869,
    lng: 81.3041,
    radiusKm: 15,
  },
  {
    id: "bhilai",
    name: "Bhilai",
    state: "Chhattisgarh",
    lat: 21.2102,
    lng: 81.3803,
    radiusKm: 15,
  },
  {
    id: "delhi",
    name: "Delhi",
    state: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    radiusKm: 25,
  },
  {
    id: "bangalore",
    name: "Bangalore",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    radiusKm: 25,
  },
  {
    id: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    lat: 19.076,
    lng: 72.8777,
    radiusKm: 25,
  },
  {
    id: "kolkata",
    name: "Kolkata",
    state: "West Bengal",
    lat: 22.5726,
    lng: 88.3639,
    radiusKm: 20,
  },
];

export function getCityById(id: string): CityOption | undefined {
  return CITY_OPTIONS.find((city) => city.id === id);
}

export function createBoundsFromCity(
  city: CityOption,
): [[number, number], [number, number]] {
  const radiusKm = city.radiusKm || 15;
  // Rough conversion: 1 degree of latitude ≈ 111 km
  // For simplicity: 1 degree ≈ 111 km
  const latDelta = radiusKm / 111;
  // Longitude varies by latitude, use cos(lat) approximation
  const lngDelta = radiusKm / (111 * Math.cos((city.lat * Math.PI) / 180));

  return [
    [city.lat - latDelta, city.lng - lngDelta], // Southwest
    [city.lat + latDelta, city.lng + lngDelta], // Northeast
  ];
}

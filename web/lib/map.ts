import { API_BASE } from "./api";

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  price: number;
  currency: string;
};

export async function getMapPoints(params?: {
  swlat?: number; swlng?: number; nelat?: number; nelng?: number;
  category?: "SALE" | "RENT";
}) {
  const url = new URL(`${API_BASE}/map/listings`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch map points");
  const data = await res.json();
  return (data?.points ?? []) as MapPoint[];
}

// components/MapView.tsx
// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css"; // CSS is fine to import

import { getMapPoints } from "@/lib/map";

// Load react-leaflet components without SSR
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false });

// money helper
function money(n: number, currency = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n); }
  catch { return `$${n.toLocaleString()}`; }
}

export default function MapView() {
  const [points, setPoints] = useState<any[]>([]);
  const center = useMemo<[number, number]>(() => [37.773972, -122.431297], []);

  // Dynamically import leaflet and set icon paths on client
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined") return;

      const L = await import("leaflet");

      // fix default icon paths (expects files in /public/leaflet)
      // @ts-ignore
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });

      if (!cancelled) {
        // once leaflet is ready, fetch points
        getMapPoints().then(setPoints).catch(console.error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-[70vh] w-full rounded-xl overflow-hidden border">
      {/* Guard render until MapContainer is mounted on client */}
      <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        {points.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{money(p.price, p.currency)}</div>
                <div className="text-gray-600">ID: {String(p.id).slice(0, 8)}…</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

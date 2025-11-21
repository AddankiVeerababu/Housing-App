// components/PropertyMap.tsx
// @ts-nocheck
"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false });

type Props = { lat: number; lng: number; title?: string; price?: number; currency?: string };

function money(n: number, currency = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n); }
  catch { return `$${n.toLocaleString()}`; }
}

export default function PropertyMap({ lat, lng, title, price, currency = "USD" }: Props) {
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);

  useEffect(() => {
    (async () => {
      const L = await import("leaflet");
      // @ts-ignore
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });
    })();
  }, []);

  return (
    <div className="h-[50vh] w-full rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' />
        <Marker position={center}>
          <Popup>
            <div className="text-sm">
              {title && <div className="font-medium">{title}</div>}
              {price != null && <div className="text-gray-600">{money(price, currency)}</div>}
              <div className="text-gray-500">[{lat.toFixed(4)}, {lng.toFixed(4)}]</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

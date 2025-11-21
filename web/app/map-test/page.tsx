// @ts-nocheck
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useMemo } from "react";

export default function MapTestPage() {
  const center = useMemo<[number, number]>(() => [37.773972, -122.431297], []);
  // IMPORTANT: this page is a Client Component, so Leaflet runs on the client only

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-3">Map Test</h1>
      <div className="h-[70vh] w-full rounded-xl overflow-hidden border">
        <MapContainer center={center} zoom={5} scrollWheelZoom={true} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          <Marker position={center}>
            <Popup>Center marker</Popup>
          </Marker>
        </MapContainer>
      </div>
    </main>
  );
}

// web/components/AmenitiesInput.tsx
"use client";

import { useState } from "react";

export default function AmenitiesInput({
  value,
  onChange,
  placeholder = "Add amenity and press Enter (e.g., PARKING)"
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim().toUpperCase().replace(/\s+/g, "_");
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="w-full border rounded px-2 py-1 bg-transparent"
        />
        <button type="button" onClick={add} className="px-3 py-1 rounded border">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((t) => (
          <span key={t} className="px-2 py-1 text-xs border rounded">
            {t}
            <button
              type="button"
              className="ml-2 text-red-400"
              onClick={() => onChange(value.filter((x) => x !== t))}
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

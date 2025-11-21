// web/components/PhotoUploader.tsx
"use client";

import { uploadFile } from "@/lib/api";
import { useRef, useState } from "react";

export default function PhotoUploader({
  onAdd,
}: {
  onAdd: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadFile(f);
        onAdd(url);
      }
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded bg-neutral-800 text-white px-3 py-1 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload photos"}
        </button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <p className="mt-2 text-xs text-neutral-500">
        JPG/PNG, multiple files allowed. Uploaded files are stored under
        <code> /uploads</code> on the server.
      </p>
    </div>
  );
}

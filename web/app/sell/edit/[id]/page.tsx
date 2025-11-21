// web/app/sell/edit/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getListing, updateListing } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import PhotoUploader from "@/components/PhotoUploader";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form fields (subset of create)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState("USD");
  const [photoUrls, setPhotoUrls] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const l = await getListing(id);
        setTitle(l.title);
        setDescription(l.description);
        setPrice(l.price);
        setCurrency(l.currency);
        setPhotoUrls((l.photos ?? []).map((p) => p.url).join("\n"));
      } catch (e: any) {
        setErr(e?.message || "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function addPhoto(url: string) {
    setPhotoUrls((prev) => (prev ? `${prev}\n${url}` : url));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const photos =
        photoUrls
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((url) => ({ url })) ?? [];
      await updateListing(id, {
        title,
        description,
        price,
        currency,
        photos,
      });
      r.replace(`/property/${id}`);
    } catch (e: any) {
      alert(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleGate allow={["SELLER", "AGENT"]}>
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Edit listing</h1>
        {loading ? (
          <div>Loading…</div>
        ) : err ? (
          <div className="text-red-600">{err}</div>
        ) : (
          <form onSubmit={onSave} className="space-y-3">
            <input className="w-full rounded border p-2 bg-transparent" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="w-full rounded border p-2 bg-transparent min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className="rounded border p-2 bg-transparent" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Price (cents)" />
              <input className="rounded border p-2 bg-transparent" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="Currency (ISO)" />
            </div>

            <PhotoUploader onAdd={addPhoto} />
            <textarea className="w-full rounded border p-2 bg-transparent min-h-[120px]" value={photoUrls} onChange={(e) => setPhotoUrls(e.target.value)} placeholder="Photo URLs (one per line)" />

            <button disabled={busy} className="rounded bg-blue-600 px-4 py-2 font-medium">
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </main>
    </RoleGate>
  );
}

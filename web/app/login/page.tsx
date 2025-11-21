"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "BUYER" | "RENTER" | "SELLER";
const API = process.env.NEXT_PUBLIC_API_BASE!;

function goByRole(role?: Role, router?: ReturnType<typeof useRouter>) {
  const target = role === "SELLER" ? "/sell/my" : "/buy";
  // try SPA nav first, then hard refresh as fallback
  try { router?.replace(target); } catch {}
  if (typeof window !== "undefined") window.location.assign(target);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If the user is already logged in, leave /login immediately
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API}/me`, { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.user) goByRole(data.user.role as Role, router);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",                // cookie comes back
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Login failed (${res.status})`);
      }
      const data = await res.json();
      goByRole(data?.user?.role as Role, router);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border p-2 bg-transparent"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border p-2 bg-transparent"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button disabled={busy} className="w-full rounded bg-blue-600 p-2 font-medium disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

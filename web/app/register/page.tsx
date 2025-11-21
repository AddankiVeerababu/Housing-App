"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

export default function RegisterPage() {
  const r = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"BUYER"|"RENTER"|"SELLER">("BUYER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, role, email, password }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Signup failed (${res.status})`);
      }
      // force explicit login after signup
      r.replace("/login?new=1");
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full rounded border p-2 bg-transparent" placeholder="Full name"
               value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded border p-2 bg-transparent" placeholder="Email"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-2 bg-transparent" placeholder="Password (min 6)"
               type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="w-full rounded border p-2 bg-transparent"
                value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="BUYER">Buyer</option>
          <option value="RENTER">Renter</option>
          <option value="SELLER">Seller</option>
        </select>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <button disabled={busy} className="w-full rounded bg-blue-600 p-2 font-medium">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-3 text-sm text-gray-400">
        Already have an account? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </main>
  );
}

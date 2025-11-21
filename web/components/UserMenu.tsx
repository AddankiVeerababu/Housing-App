"use client";

import Link from "next/link";
import { logout, useMe } from "@/lib/auth";
import { useState } from "react";

export default function UserMenu() {
  const { user, loading, refresh } = useMe();
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;

  if (!user) {
    return (
      <div className="flex gap-3">
        <Link className="underline" href="/login">Login</Link>
        <Link className="underline" href="/register">Register</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">Hi, {user.name || user.email}</span>
      <button
        disabled={busy}
        onClick={async () => { setBusy(true); await logout(); await refresh(); location.href = "/login"; }}
        className="text-sm underline disabled:opacity-60"
      >
        {busy ? "…" : "Logout"}
      </button>
    </div>
  );
}

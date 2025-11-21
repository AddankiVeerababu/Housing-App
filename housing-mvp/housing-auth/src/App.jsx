import React from "react";

export default function App() {
  const API_BASE = "https://housing-mvp-production.up.railway.app"; // your backend

  // ---- Auth state ----
  const [mode, setMode] = React.useState("login"); // login | signup
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState("BUYER");
  const [user, setUser] = React.useState(() => {
    try {
      const raw = localStorage.getItem("auth:user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function handleSignup(e) {
    e.preventDefault();
    clearFeedback();
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      setMessage("Signup successful! Please log in.");
      setMode("login");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("auth:user", JSON.stringify(data.user));
      setUser(data.user);
      setMessage("Login successful!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("auth:user");
    setUser(null);
    clearFeedback();
  }

  // =======================
  // LISTINGS UI (create + browse + mine)
  // =======================
  const [tab, setTab] = React.useState("browse"); // browse | create | mylistings

  // Create Listing state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [ltype, setLtype] = React.useState("RENT"); // RENT | SALE
  const [city, setCity] = React.useState("");
  const [bedrooms, setBedrooms] = React.useState(1);
  const [bathrooms, setBathrooms] = React.useState(1);
  const [sqft, setSqft] = React.useState("");
  const [amenitiesText, setAmenitiesText] = React.useState("");
  const [photosText, setPhotosText] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createMsg, setCreateMsg] = React.useState("");
  const [createErr, setCreateErr] = React.useState("");

async function submitListing(e) {
  e.preventDefault();
  setCreateErr("");
  setCreateMsg("");

  if (!title || !description || !price) {
    return setCreateErr("Please fill title, description, and price.");
  }

  // MINIMAL payload: only the fields your MVP listed, no extras.
  const payload = {
    title: String(title).trim(),
    description: String(description).trim(),
    price: Number(price),          // number
    type: String(ltype).trim(),    // "RENT" | "SALE"
  };

  setCreating(true);
  try {
    const res = await fetch(`${API_BASE}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Try to read JSON; if it fails, fall back to text so we see the real error
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { /* leave as text */ }

    if (!res.ok) {
      // Show the actual server error (from zod or your handler)
      const msg =
        (data && (data.error || data.message)) ||
        text ||
        "Create listing failed";
      throw new Error(msg);
    }

    // Success: data is the created listing object
    setCreateMsg("Listing created ✅");
    setResults(prev => [
      { ...(data || {}), ownerId: user?.id || (data && data.ownerId) },
      ...(Array.isArray(prev) ? prev : []),
    ]);
    setTab("mylistings");

    // Reset form
    setTitle(""); setDescription(""); setPrice("");
    setAmenitiesText(""); setPhotosText("");
    setLat(""); setLng(""); setSqft("");
    setBedrooms(1); setBathrooms(1);
  } catch (err) {
    setCreateErr(err.message || "Create listing failed");
  } finally {
    setCreating(false);
  }
}


  // --------- Browse (filters) ----------
  const [bCity, setBCity] = React.useState("");
  const [bType, setBType] = React.useState("");
  const [bBedrooms, setBBedrooms] = React.useState("");
  const [bPriceMin, setBPriceMin] = React.useState("");
  const [bPriceMax, setBPriceMax] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [searchErr, setSearchErr] = React.useState("");

  async function fetchListings() {
    setSearchErr("");
    setSearching(true);
    const params = new URLSearchParams();
    if (bCity) params.set("city", bCity);
    if (bType) params.set("type", bType);
    if (bBedrooms) params.set("bedrooms", String(bBedrooms));
    if (bPriceMin) params.set("priceMin", String(bPriceMin));
    if (bPriceMax) params.set("priceMax", String(bPriceMax));
    params.set("limit", "20");

    try {
      const res = await fetch(`${API_BASE}/listings?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Search failed");
      setResults(Array.isArray(data) ? data : data.results ?? data);
    } catch (err) {
      setSearchErr(err.message);
    } finally {
      setSearching(false);
    }
  }

  React.useEffect(() => {
    if (user) {
      fetchListings().catch(() => {});
    }
  }, [user]);

  // ---- Logged-in Dashboard ----
  if (user) {
    const myListings = results.filter((l) => l.ownerId && l.ownerId === user.id);

    return (
      <div className="min-h-screen bg-neutral-100 p-6">
        <div className="max-w-5xl mx-auto">
          <header className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome, {user.email}</h2>
              <p className="text-sm text-neutral-600">Role: {user.role}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-xl px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Log out
            </button>
          </header>

          <nav className="flex gap-2 mb-4">
            <button
              onClick={() => setTab("browse")}
              className={`px-3 py-1.5 rounded-xl border ${tab === "browse" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-300"}`}
            >
              Browse
            </button>
            <button
              onClick={() => setTab("create")}
              className={`px-3 py-1.5 rounded-xl border ${tab === "create" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-300"}`}
            >
              Create Listing
            </button>
            <button
              onClick={() => setTab("mylistings")}
              className={`px-3 py-1.5 rounded-xl border ${tab === "mylistings" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-300"}`}
            >
              My Listings
            </button>
          </nav>

          {tab === "browse" && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Browse Listings</h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <input className="border rounded-lg px-3 py-2" placeholder="City" value={bCity} onChange={e => setBCity(e.target.value)} />
                <select className="border rounded-lg px-3 py-2" value={bType} onChange={e => setBType(e.target.value)}>
                  <option value="">Any type</option>
                  <option value="RENT">RENT</option>
                  <option value="SALE">SALE</option>
                </select>
                <input className="border rounded-lg px-3 py-2" type="number" placeholder="Bedrooms ≥" value={bBedrooms} onChange={e => setBBedrooms(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" type="number" placeholder="Price min" value={bPriceMin} onChange={e => setBPriceMin(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" type="number" placeholder="Price max" value={bPriceMax} onChange={e => setBPriceMax(e.target.value)} />
              </div>

              <button
                onClick={fetchListings}
                disabled={searching}
                className="mb-4 rounded-xl px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800"
              >
                {searching ? "Searching..." : "Search"}
              </button>

              {searchErr && <div className="mb-3 text-red-600">{searchErr}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((l) => (
                  <article key={l.id} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-lg font-semibold">{l.title}</h4>
                      <span className="text-xs rounded-full px-2 py-0.5 border">{l.type}</span>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">{l.city} • {l.bedrooms} BR{l.bathrooms ? ` / ${l.bathrooms} BA` : ""} {l.sqft ? `• ${l.sqft} sqft` : ""}</p>
                    <p className="font-bold mb-2">${l.price?.toLocaleString?.() ?? l.price}</p>
                    <p className="text-sm line-clamp-3 mb-2">{l.description}</p>
                    {Array.isArray(l.amenities) && l.amenities.length > 0 && (
                      <p className="text-xs text-neutral-600 mb-2">
                        Amenities: {l.amenities.slice(0, 5).join(", ")}{l.amenities.length > 5 ? "..." : ""}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500">
                      Owner: {l.ownerId ? (l.ownerId === user.id ? "You" : l.ownerId) : "N/A"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === "create" && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold mb-2">Create a new listing</h3>
              <p className="text-sm text-neutral-600 mb-4">Please fill title, description, price, and city.</p>
              {createErr && <div className="mb-3 text-red-600">{createErr}</div>}
              {createMsg && <div className="mb-3 text-green-600">{createMsg}</div>}

              <form onSubmit={submitListing} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Title</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} placeholder="Spacious 2BHK Apartment near Downtown" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Description</label>
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Modern 2 bed, 2 bath with balcony..." />
                </div>
                <div>
                  <label className="block text-sm mb-1">Price</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={price} onChange={e => setPrice(e.target.value)} placeholder="1800" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Type</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={ltype} onChange={e => setLtype(e.target.value)}>
                    <option value="RENT">RENT</option>
                    <option value="SALE">SALE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">City</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={city} onChange={e => setCity(e.target.value)} placeholder="Boulder" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Bedrooms</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={bedrooms} onChange={e => setBedrooms(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Bathrooms</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={bathrooms} onChange={e => setBathrooms(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Sqft (optional)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={sqft} onChange={e => setSqft(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Amenities (comma separated)</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={amenitiesText} onChange={e => setAmenitiesText(e.target.value)} placeholder="balcony, parking, gym, pool" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Photos (comma separated URLs)</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={photosText} onChange={e => setPhotosText(e.target.value)} placeholder="https://picsum.photos/400/300, https://picsum.photos/401/300" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Latitude (optional)</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={lat} onChange={e => setLat(e.target.value)} placeholder="40.014984" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Longitude (optional)</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={lng} onChange={e => setLng(e.target.value)} placeholder="-105.270546" />
                </div>

                <div className="md:col-span-2">
                  <button type="submit" disabled={creating} className="w-full bg-neutral-900 text-white rounded-lg py-2">
                    {creating ? "Creating..." : "Create Listing"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === "mylistings" && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold mb-4">My Listings</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Showing results filtered by your user ID. If none appear, make sure your backend includes <code>ownerId</code> in the response.
              </p>
                            {myListings.length === 0 ? (
                <p className="text-neutral-600">No listings yet. Create one from the “Create Listing” tab or hit “Search” in Browse.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myListings.map((l) => (
                    <article key={l.id} className="border rounded-xl p-4">
                      <h4 className="text-lg font-semibold mb-1">{l.title}</h4>
                      <p className="text-sm text-neutral-600 mb-1">
                        {l.city} • {l.bedrooms} BR{l.bathrooms ? ` / ${l.bathrooms} BA` : ""} {l.sqft ? `• ${l.sqft} sqft` : ""}
                      </p>
                      <p className="font-bold mb-2">${l.price?.toLocaleString?.() ?? l.price}</p>
                      <p className="text-sm line-clamp-3">{l.description}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Auth screens ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">
          {mode === "login" ? "Log in" : "Sign up"}
        </h1>

        {error && <div className="mb-3 text-red-600">{error}</div>}
        {message && <div className="mb-3 text-green-600">{message}</div>}

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" required minLength={8} />
          </div>
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm mb-1">Confirm password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded-lg px-3 py-2" required minLength={8} />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option>BUYER</option>
                  <option>SELLER</option>
                  <option>RENTER</option>
                  <option>AGENT</option>
                </select>
              </div>
            </>
          )}
          <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white rounded-lg py-2">
            {loading ? (mode === "login" ? "Logging in..." : "Signing up...") : (mode === "login" ? "Log in" : "Sign up")}
          </button>
        </form>

        <button
          onClick={() => { clearFeedback(); setMode(mode === "login" ? "signup" : "login"); }}
          className="mt-3 text-sm underline"
        >
          {mode === "login" ? "Create an account" : "Have an account? Log in"}
        </button>
      </div>
    </div>
  );
}

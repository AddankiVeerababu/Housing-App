import { notFound } from "next/navigation";
import { getListing } from "@/lib/api";
import PropertyMap from "@/components/PropertyMap";
import ShareButton from "@/components/ShareButton"; // 👈 add this

type ListingGeo = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
};

function hasCoords(l: ListingGeo): l is { latitude: number; longitude: number } {
  return typeof l.latitude === "number" && typeof l.longitude === "number";
}

function moneyCents(cents: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      (cents ?? 0) / 100
    );
  } catch {
    return `$${((cents ?? 0) / 100).toLocaleString()}`;
  }
}

export default async function PropertyPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await Promise.resolve(params);

  const listing: any = await getListing(id);
  if (!listing) notFound();

  const lat: number | undefined =
    typeof listing.latitude === "number" ? listing.latitude : undefined;
  const lng: number | undefined =
    typeof listing.longitude === "number" ? listing.longitude : undefined;
  const title: string = typeof listing.title === "string" ? listing.title : "";
  const currency: string = typeof listing.currency === "string" ? listing.currency : "USD";
  const priceDollars: number = typeof listing.price === "number" ? listing.price / 100 : 0;

  // server-safe share URL (your frontend runs on 3000)
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/property/${id}`;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="text-2xl">
            {moneyCents(listing.price, currency)}
            {listing.category === "RENT" && listing.period && (
              <span className="text-gray-500 text-base">
                {" "}
                / {String(listing.period).toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* 👇 client share button */}
        <ShareButton url={shareUrl} text={title || "Check this listing"} />
      </div>

      {listing.photos?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {listing.photos
            .slice()
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((p: any) => (
              <img
                key={p.id ?? p.url}
                src={p.url}
                alt={p.caption || title}
                className="w-full h-56 object-cover rounded border"
              />
            ))}
        </div>
      ) : (
        <div className="text-gray-400 italic">No photos available</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <b>Beds:</b> {listing.bedrooms ?? "-"}
        </div>
        <div>
          <b>Baths:</b> {listing.bathrooms ?? "-"}
        </div>
        <div>
          <b>Sqft:</b> {listing.areaSqft ?? "-"}
        </div>
      </div>

      <div className="text-sm text-gray-400">
        {[listing.addressLine1, listing.city, listing.state, listing.postalCode]
          .filter(Boolean)
          .join(", ")}
      </div>

      {listing.amenities?.length ? (
        <div className="flex flex-wrap gap-2">
          {listing.amenities.map((a: any) => (
            <span key={a.amenity?.code ?? a.id} className="px-2 py-1 border rounded text-xs">
              {a.amenity?.label ?? a.amenity?.code}
            </span>
          ))}
        </div>
      ) : null}

      {lat !== undefined && lng !== undefined && (
        <PropertyMap lat={lat} lng={lng} title={title} price={priceDollars} currency={currency} />
      )}

      {listing.createdBy && (
        <div className="rounded-xl border p-4 bg-white/5">
          <div className="font-semibold mb-1">Agent / Owner</div>
          <div>
            <b>Name:</b> {listing.createdBy.name ?? "-"}
          </div>
          <div>
            <b>Email:</b> {listing.createdBy.email}
          </div>
          <div>
            <b>Role:</b> {listing.createdBy.role}
          </div>
        </div>
      )}

      {listing.description && (
        <p className="text-gray-300 whitespace-pre-wrap">{listing.description}</p>
      )}
    </main>
  );
}

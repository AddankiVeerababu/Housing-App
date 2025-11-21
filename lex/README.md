# Housing Template (Lex Metadata)

Primary collection: **listings** (Zillow-like cards + map).  
Shared add-ons we’ll use: **Reviews**, **Map/GPS**.

## Conventions
- Base fields on all docs: createdAt, updatedAt, ownerId, visibility ('public'|'private'|'unlisted').
- Money: **integer cents** (priceCents) with currency 'usd'.
- Images: `photos: string[]` (must include ≥1 square ≥512×512).
- Paths (multi-tenant style for design-time portability):
  - `/orgs/{orgId}/apps/{appId}/listings/{listingId}`
  - Public index: `/publicIndex/apps/{appId}/listings/{listingId}`

## Filters / Queries
- priceCents min/max, beds/baths gte, category/type eq, map bounds (geo.lat/lng in SW/NE).
- Sort by priceCents asc or updatedAt desc.

## Index Plan
- (visibility, priceCents asc)
- (visibility, category, propertyType)
- (visibility, geo.lat, geo.lng)
- (visibility, updatedAt desc)
- Reviews: (target.kind, target.id, createdAt desc)

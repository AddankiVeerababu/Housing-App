# Template Worksheet — Housing

Primary: **listings**

Fields
| key | type | req | constraints | notes |
|---|---|---|---|---|
| createdAt | datetime |  | ISO UTC | base |
| updatedAt | datetime |  | ISO UTC | base |
| ownerId | text |  | uid | base |
| visibility | enum | ✓ | public/private/unlisted | base |
| title | text | ✓ | ≤80 | card title |
| description | longtext |  |  | markdown ok |
| photos | images[] |  | ≤12 (≥1 square) | gallery |
| priceCents | number | ✓ | ≥0 | integer cents |
| currency | text |  | 'usd' | default |
| period | enum |  | mo/wk | rent cadence |
| beds | number |  | ≥0 |  |
| baths | number |  | ≥0 |  |
| sqft | number |  | ≥0 |  |
| address | text |  | ≤160 |  |
| geo | location |  | lat[-90..90], lng[-180..180] | required if map |
| amenities | tags[] |  |  |  |
| availabilityDate | date |  | ISO date | for rent |
| category | enum |  | SALE/RENT | |
| propertyType | enum |  | APARTMENT/HOUSE/VILLA/CONDO/TOWNHOUSE/LAND/OTHER | |

Filters: price range, beds/baths, category/type, map bounds, amenities.  
Indexes: (visibility, priceCents), (visibility, category, propertyType), (visibility, geo.lat, geo.lng), (visibility, updatedAt).

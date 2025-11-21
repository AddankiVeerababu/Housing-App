# Add-On — Reviews
Collection: reviews

Fields
| key | type | req | constraints |
|---|---|---|---|
| createdAt | datetime |  | ISO |
| updatedAt | datetime |  | ISO |
| authorId | text | ✓ | uid |
| target | object | ✓ | { kind:'listing', id:string } |
| rating | number | ✓ | int 1..5 |
| text | longtext |  | ≤1000 |
| visibility | enum | ✓ | public/private/unlisted |

Unique: (authorId, target.id)  
Indexes: (target.kind, target.id, createdAt desc), (target.kind, target.id, rating).

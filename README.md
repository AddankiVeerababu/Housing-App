# Housing App

Housing App is a mini real-estate platform where users can register as either **Buyers** or **Sellers** and get different experiences based on their role.  
Buyers focus on **discovering properties on a map**, while Sellers focus on **creating and managing listings**.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router, TypeScript, Tailwind CSS) – `/web`
- **Backend:** Express 5 (Node.js 22) – `/server`
- **ORM:** Prisma 5
- **Database:** PostgreSQL (Railway / Neon / local)
- **Auth:** JWT with `httpOnly` cookie (`auth_token`)
- **Maps:** Leaflet
- **Add-ons:** Map integration, Share button, Admin-style management hooks
- **Dev URLs:**
  - Frontend → `http://localhost:3000`
  - Backend → `http://localhost:4000`

---

## Core Concept

- Users register and choose a **role**: `Buyer` or `Seller`.
- After login:
  - **Buyers** are redirected to the **Property Listings** page.
  - **Sellers** are redirected to the **My Listings** dashboard.
- Listings created by sellers:
  - Show up in **My Listings** for that seller.
  - Show up in **Buyer Listings** and on the **map** for buyers.

Authentication is handled by the Express backend using JWTs stored in an `httpOnly` cookie, and the frontend uses this cookie for authenticated API calls.

---

## Authentication & Roles

1. **Register**
   - User signs up with basic details and selects a role:
     - **Buyer**
     - **Seller**
2. **Login**
   - Backend validates credentials and issues a JWT.
   - JWT is stored as an `httpOnly` cookie (`auth_token`).
   - Frontend calls a `/me`-style endpoint to detect the user & role and route accordingly.

---

## Buyer Experience

After a **Buyer** signs in, they land on the **Property Listings** page.

### Property Listings Page

- Shows all properties created by sellers.
- Displays an interactive **Leaflet map** with markers for each property.
- Supports **filters**, such as:
  - Property title
  - City and state
  - Category and type (sale / rent, apartment / house / condo, etc.)
  - Minimum & maximum price
  - Number of beds

### Property Detail Page

Clicking a listing opens the **Property Detail** page:

- Full property details:
  - Title, description, price, type, beds, baths, sqft, address, amenities, etc.
- Owner (seller) details.
- Embedded **map** centered on that property.
- **Share** button to share the property link using the native system share dialog.

Buyers have **read-only** access: they can view, filter, use the map, and share listings, but cannot edit or delete them.

---

## Seller Experience

After a **Seller** signs in, they land on the **My Listings** page.

### My Listings Page

- Lists all properties created by that seller.
- If no listings exist yet, an **empty state** explains how to create the first listing.
- Each listing includes management actions:
  - **View** – open the property detail page.
  - **Edit** – update property information and photos.
  - **Delete** – remove the listing.
  - **Share** – get a sharable link for the property.

### Create Listing Page

From **My Listings**, the seller can click **Create Listing**:

- Fill in property details:
  - Title, description, location, price, type, beds, baths, sqft, city, state, country, latitude/longitude, year built, etc.
- Add amenities (e.g., Parking, Gym, Pool).
- Upload photos and store photo URLs.
- Submit to create the listing.

Once created:

- The listing appears in **My Listings** for that seller.
- It also appears on the **Buyer Property Listings** page and **on the map**.
- The **Property Detail** page for that listing shows:
  - All saved property details
  - Owner info
  - Map view
  - Share button

---

## Admin Management (Add-on)

The project includes hooks for admin-style management and can be extended to:

- Inspect users and listings.
- Add controls like approvals, moderation, or reporting.
- Provide a centralized dashboard for monitoring activity.

---

## High-Level Architecture

- **Frontend (`/web`)**
  - Next.js 14 App Router with TypeScript.
  - Tailwind CSS for layout & styling.
  - Communicates with the backend at `NEXT_PUBLIC_API_BASE` (e.g., `http://localhost:4000`).
  - Uses REST endpoints such as:
    - `/auth/signup`, `/auth/login`, `/logout`, `/me`
    - `/listings`, `/listings/:id`, `/map/listings`
  - Reads authentication state via `/me` using the `auth_token` cookie.

- **Backend (`/server`)**
  - Express 5 application that exposes all auth and listing APIs.
  - Uses Prisma 5 as ORM to connect to PostgreSQL via `DATABASE_URL`.
  - Responsibilities:
    - User registration and login.
    - Role-based access (Buyer vs Seller).
    - CRUD for listings.
    - Issuing JWTs and setting the `httpOnly` cookie for auth.

- **Database (PostgreSQL)**
  - Stores:
    - Users & roles.
    - Property listings and metadata.
    - Photos / image URLs and related fields.
  - Can run locally or via services like Railway or Neon.

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 22+
- PostgreSQL (local, Railway, or Neon)
- Git

### 1. Clone the Repository

git clone https://github.com/YourUsername/Housing-App.git
cd Housing-App
### 2. Backend Setup (/server)

cd server

# Create .env and configure it, for example:
# DATABASE_URL="postgresql://user:password@localhost:5432/housing_app"
# JWT_SECRET="your-super-secret-key"
# PORT=4000

npm install
npx prisma migrate dev
npm run dev       # Backend on http://localhost:4000

### 3. Frontend Setup (/web)
cd ../web

# Create .env.local and configure it, for example:
# NEXT_PUBLIC_API_BASE="http://localhost:4000"

npm install
npm run dev       # Frontend on http://localhost:3000
Open your browser at http://localhost:3000 to use the app.

## Screenshots

### 1. Register with Role Selection
![Register screen](./screenshots/register-buyer.png)

New users can create an account by entering their name, email, password, and choosing a role (Buyer or Seller). The header also provides quick navigation to Login and Register.

---

### 2. Sign In
![Sign in screen](./screenshots/login.png)

Existing users can sign in with their email and password. After login, they are redirected based on their role: Buyers go to the listings map, Sellers go to My Listings.

---

### 3. Buyer – Listings + Map
![Buyer listings + map1](./screenshots/buyer-listings-map1.png)
![Buyer listings + map2](./screenshots/buyer-listings-map2.png)
Buyers see all homes for sale or rent, with filters (title, city, state, category, type, price, beds) and an interactive Leaflet map showing property locations.

---

### 4. Seller – My Listings & Edit Listing
![My listings](./screenshots/seller-my-listings.png)  
![Edit listing](./screenshots/seller-edit-listing.png)
![Create listing](./screenshots/seller-create-listing.png)
Sellers can view all their properties, and for each listing they can view, edit, or delete. The edit form supports updating details and photo URLs.

---

### 5. Property Detail + Share
![Property detail + map](./screenshots/property-detail-map.png)  
![Share dialog](./screenshots/property-share.png)

The property detail page shows photos, key info (beds, baths, sqft, address, amenities), an embedded map, agent/owner info, and a Share button that opens the native share dialog.





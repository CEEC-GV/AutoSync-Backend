# Autosync Backend

Backend for the Autosync EV charging app (issue #5 — Design Backend for Autosync).

## What it does

- **Auth**: signup and login using JWT tokens
- **Products** (chargers): full CRUD — create, view, update, delete
- **Images**: product images are stored in Google Cloud Storage (GCS)
- **Docker**: the whole thing runs in a container

## 1. Setup (do this first)

```bash
cd autosync-backend
npm install
```

Copy the example env file and fill in your real values:

```bash
cp .env.example .env
```

You'll need:
- `MONGO_URI` — your MongoDB connection string (local or Atlas)
- `JWT_SECRET` — any long random string
- `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_KEYFILE` — from your Google Cloud project (Storage bucket + a service account JSON key, saved as `gcs-key.json` in this folder)

## 2. Run it locally (without Docker)

```bash
npm run dev
```

Visit `http://localhost:5000` — you should see `{ "message": "Autosync backend is running" }`

## 3. Run it with Docker (this is what the issue asks for)

```bash
docker compose up --build
```

This starts the app AND a MongoDB container together. No need to install MongoDB separately.

## 4. API Endpoints

### Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | Returns a JWT token |
| POST | `/api/auth/login` | `{ email, password }` | Returns a JWT token |

For every request below, add this header:
`Authorization: Bearer <token from signup/login>`

### Products (catalog)

The catalog is organized into **6 fixed categories**: **Fastag, Air purifier, GPS, EV charger, Auto IOT devices, Number plate frame**. Every product MUST belong to one of them via `categoryId`. Product reads are public (no login needed).

| Method | Endpoint | Body | Who can use it |
|---|---|---|---|
| GET | `/api/products` | — (optional `?categoryId=xxx`) | Public |
| GET | `/api/products/:id` | — | Public |
| POST | `/api/products` | form-data (see below) | Admin only |
| PUT | `/api/products/:id` | form-data (all fields optional) | Admin only |
| DELETE | `/api/products/:id` | — | Admin only |

**Required form-data fields:** `name`, `description`, `categoryId`, `basePrice`, `gst`, `finalPrice`
**Optional fields:** `powerRating` (kW — chargers/powered devices only), `guns` (default 1), `stock` (inventory count, default 0), `category` (legacy AC/DC tag), `details` (JSON string of category-specific attributes), `image` (file)

**Category-specific `details` attributes** (sent as a JSON string in form-data):

| Category | details keys |
|---|---|
| Fastag | `vehicleClass`, `issuerName` |
| Air purifier | `cadr`, `filterType`, `powerSource` |
| GPS | `screenSize`, `connectivity` |
| EV charger | `powerOutputKw`, `connectorType`, `mountingType` |
| Auto IOT devices | `sensorType`, `appCompatible` |
| Number plate frame | `material`, `dimensions` |

The `details` object is flexible — the keys above are the convention, not enforced. The billed price everywhere (cart totals, order price snapshots) is `finalPrice`.

Note: `POST` and `PUT` for products must be sent as **form-data** (not JSON) because of the image file. Use Postman or Thunder Client for testing — set the body type to `form-data`.

**Legacy products:** items created before the 6-category system have no `categoryId`. They still show in listings, but the first time you edit one you must send a `categoryId` (the API will remind you).

### Categories

Categories organize the catalog (the 6 fixed ones: Fastag, Air purifier, GPS, EV charger, Auto IOT devices, Number plate frame). Viewing them is **public** — no login needed.

| Method | Endpoint | Body | Who can use it |
|---|---|---|---|
| GET | `/api/categories` | — | Public |
| GET | `/api/categories/:id` | — | Public |
| POST | `/api/categories` | `{ name, description }` | Admin only |
| PUT | `/api/categories/:id` | `{ name, description }` (both optional) | Admin only |
| DELETE | `/api/categories/:id` | — | Admin only |

Products link to a category through their `categoryId` field (optional — a product can exist without one). Extras:

- `GET /api/products?categoryId=xxx` — list only the products in that category
- Fetching a product automatically includes its category's name and description
- Every product links to exactly one category via its required `categoryId`; fetching a product automatically includes the category's name and description
- `GET /api/products?categoryId=xxx` lists only that category's products
- The old string `category` field (AC/DC/Electronics) is optional legacy, kept so older records still validate

### Charging Stations

Plain JSON bodies (no images here, so no form-data needed).

| Method | Endpoint | Body | Who can use it |
|---|---|---|---|
| GET | `/api/stations` | — | Any logged-in user |
| GET | `/api/stations/:id` | — | Any logged-in user |
| POST | `/api/stations` | `{ locationName, address, latitude, longitude, chargerType, numberOfUnits }` | Admin only |
| PUT | `/api/stations/:id` | same fields, all optional | Admin only |
| DELETE | `/api/stations/:id` | — | Admin only |

Validation rules:

- `chargerType` must be one of `AC`, `DC`, `AC/DC`
- `latitude` must be between -90 and 90, `longitude` between -180 and 180
- `numberOfUnits` must be at least 1
- Schema violations and malformed IDs return `400` with a clear message (not a 500)

Example create:
```json
{
  "locationName": "AutoSync Hub - Hitech City",
  "address": "Plot 12, Madhapur, Hyderabad",
  "latitude": 17.4483,
  "longitude": 78.3915,
  "chargerType": "AC/DC",
  "numberOfUnits": 4
}
```

To make a user an admin, manually update their `role` field to `"admin"` in MongoDB (e.g. using MongoDB Compass), since there's no public "make me admin" endpoint — that's intentional, for security.

### Charging History

Historical records of completed charging sessions, for user auditing and receipt viewing. Every record links to a real user and a real station from the Charging Stations module.

| Method | Endpoint | Body | Who can use it |
|---|---|---|---|
| POST | `/api/history` | `{ station, startTime, endTime, energyKwh, price }` (+ optional `userId`) | Logged-in users (for themselves); `userId` param = admin only |
| GET | `/api/history` | — | Logged-in users — but each user sees **only their own** logs; admins see **all** logs |
| GET | `/api/history/:id` | — | The record's owner, or any admin |
| DELETE | `/api/history/:id` | — | Admin only (remove erroneous records) |

Notes:

- `station` must be the ID of an existing charging station; `userId` (when an admin records on someone's behalf) must be an existing user
- Dates are ISO 8601 strings, e.g. `2026-09-22T14:30:00Z`; `endTime` must be after `startTime`
- `energyKwh` must be > 0, `price` ≥ 0
- Responses include the station's name/address, the user's name/email, and a computed `durationMinutes` (derived from the timestamps, not stored)
- There is intentionally **no PUT/UPDATE** — history records are immutable for audit integrity. Wrong record? Admin deletes it and records a fresh one.

Example create:
```json
{
  "station": "66f1a2b3c4d5e6f7a8b9c0d1",
  "startTime": "2026-09-22T14:30:00Z",
  "endTime": "2026-09-22T15:45:00Z",
  "energyKwh": 18.6,
  "price": 242.50
}
```

### Shopping Cart

One active cart per user, created automatically on first use. Every route works on the logged-in user's own cart — no admin concept here. Cart responses also include `itemCount` and `cartTotal` (sum of `finalPrice × quantity`).

| Method | Endpoint | Body | What it does |
|---|---|---|---|
| GET | `/api/cart` | — | Current user's cart with populated product details |
| POST | `/api/cart/add` | `{ productId, quantity? }` | Adds a product. If it's already in the cart, increments quantity and refreshes its `addedAt` |
| DELETE | `/api/cart/remove/:productId` | — | Removes that product from the cart completely |
| DELETE | `/api/cart/clear` | — | Empties the cart entirely |

Notes: `quantity` defaults to 1 and must be ≥ 1; out-of-stock products are rejected; adding a product that doesn't exist returns 404.

### Orders (Checkout)

| Method | Endpoint | Body | Who can use it |
|---|---|---|---|
| POST | `/api/orders` | `{ shippingAddress: { street, city, state, postalCode, country } }` | Any logged-in user |
| GET | `/api/orders/my-orders` | — | Any logged-in user — own orders, newest first |
| GET | `/api/orders` | — | Admin only — system-wide order list |
| GET | `/api/orders/:id` | — | The order's owner, or any admin |
| PUT | `/api/orders/:id/status` | `{ status }` — one of `Pending`, `Processing`, `Shipped`, `Delivered` | Admin only |

Checkout behavior (`POST /api/orders`):

- Reads the user's current cart — an empty cart returns 400
- Snapshots each item's **price at purchase time** (`finalPrice` per unit) and the product name, so later price changes or product deletions never rewrite order history
- Calculates and stores `totalPrice` for the whole order
- Order status starts at `Pending`
- **Automatically clears the cart** after the order is saved

Example checkout body:
```json
{
  "shippingAddress": {
    "street": "Flat 302, Green Meadows",
    "city": "Hyderabad",
    "state": "Telangana",
    "postalCode": "500081",
    "country": "India"
  }
}
```

To make a user an admin, manually update their `role` field to `"admin"` in MongoDB (e.g. using MongoDB Compass), since there's no public "make me admin" endpoint — that's intentional, for security.

## 5. Testing quickly with curl

Signup:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test1234"}'
```

Get products (replace TOKEN with what signup returned):
```bash
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer TOKEN"
```

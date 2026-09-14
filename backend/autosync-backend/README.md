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

### Products (chargers)
| Method | Endpoint | Body | Who can use it |
|---|---|---|---|
| GET | `/api/products` | — | Any logged-in user |
| GET | `/api/products/:id` | — | Any logged-in user |
| POST | `/api/products` | form-data: name, category, powerRating, basePrice, gst, finalPrice, guns, image (file) | Admin only |
| PUT | `/api/products/:id` | form-data, same fields (all optional) | Admin only |
| DELETE | `/api/products/:id` | — | Admin only |

Note: `POST` and `PUT` for products must be sent as **form-data** (not JSON) because of the image file. Use Postman or Thunder Client for testing — set the body type to `form-data`.

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

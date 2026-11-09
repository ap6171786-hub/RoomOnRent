# RoomOnRent

Find your room. Skip the brokerage.

RoomOnRent is a TypeScript monorepo for an owner-direct Indian room rental platform. The client uses React, Vite, Tailwind, React Router and TanStack Query. The API uses Express, Mongoose and MongoDB. MongoDB remains the source of truth; Redis is optional and is intended only for non-sensitive search caching.

## Current implementation

- Responsive landing and room discovery experience, including search by city, stay type and budget, sorting, dark mode and account-backed favourites.
- REST API for paginated room search and room details, with validated query parameters and MongoDB-backed data.
- Email/password registration and login, short-lived JWT access tokens, rotated HTTP-only refresh cookies, logout and current-profile endpoint.
- Authenticated room listing creation, editing and soft deletion, with owner-level authorization.
- Booking requests, owner acceptance/rejection, renter cancellation, in-app notifications and transactional overlap checks for accepted stays.
- Room detail and booking-request UI, with persistent, account-backed favourites.
- Server-verified mock payment endpoint with idempotency, payment records and webhook-signature verification helper; demo payments never collect money.
- Redis cache-aside for public room searches, with short TTL, write invalidation and MongoDB fallback.
- Mongoose room model with search indexes, API health check, environment validation, CORS allowlist, Helmet and rate limiting.
- Local MongoDB replica-set and Redis services in Docker Compose.
- Clearly marked Indian-city demo listings, seeded only outside production.

Account dashboard for managing owner listings and booking requests, renter bookings, and notifications. Listing images currently use validated URLs; upload storage is not implemented.

Razorpay is not configured and no payment UI is enabled; only the backend mock/test path exists and it does not collect money. Email verification and password recovery are also not implemented.

## Run locally (Windows PowerShell)

1. Install Node.js 20+ and Docker Desktop.
2. Copy `.env.example` to `.env`.
   The included JWT secret is for local development only; set a unique secret before deploying.
3. Start MongoDB and Redis:

   ```powershell
   docker compose up -d
   ```

4. Install packages and seed demo rooms:

   ```powershell
   npm install
   npm run seed
   ```

The local-only demo owner account is `demo-owner@roomonrent.local` / `DemoOwner!2026`. Never use these credentials outside local development.

5. Start both applications:

   ```powershell
   npm run dev
   ```

The client runs at `http://localhost:5173`, the API at `http://localhost:4000`, readiness at `http://localhost:4000/health`, and liveness at `http://localhost:4000/health/live`. To stop local services, run `docker compose down` (data remains in named volumes).

## Project structure

```text
client/                 React + Vite web application
  src/lib/               API client and runtime response validation
server/                 Express + Mongoose REST API
  src/config/            Validated environment configuration
  src/models/            MongoDB schemas and indexes
  src/routes/            Versioned API routes
docker-compose.yml       MongoDB replica set and Redis for local development
.env.example             Local configuration template (no secrets)
```

MongoDB runs as a single-node replica set locally because booking creation and conflict-safe acceptance use transactions. Redis is optional; when unavailable, room searches use MongoDB. Demo seed data is restricted to non-production environments.

## Data model and API

- `User` is one account that can both rent and own places. Owner rights are tied to the room's `ownerId`.
- `Room` belongs to a user and has indexed city, locality, room type, rent and availability fields.
- `Booking` references its renter, owner and room, and keeps a status history with a requested date range.
- `Favourite` has a unique `(userId, roomId)` pair. `Notification` belongs to one user and can be marked read.
- `RefreshToken` stores only a hash and expiry/revocation state. Password hashes are excluded from normal reads.
- `Payment` references an accepted booking and stores INR amount, provider status, transaction reference, timestamps and an idempotency key (never card data).

All application APIs are under `/api/v1`:

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`; `GET /auth/me` |
| Rooms | `GET /rooms`, `GET /rooms/:id`, `GET /rooms/mine`; authenticated `POST /rooms`, `PATCH /rooms/:id`, `DELETE /rooms/:id` |
| Bookings | `POST /bookings`, `GET /bookings/mine`, `/bookings/owner`; `PATCH /bookings/:id/accept`, `/reject`, `/cancel` |
| Favourites | `GET /favourites`, `POST /favourites`, `DELETE /favourites/:roomId` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read` |
| Payments | Authenticated demo-only `POST /payments/demo` (requires `Idempotency-Key`), `POST /payments/:id/verify` |

Booking request creation and acceptance are transactional. Acceptance writes the room record before checking for overlapping accepted date ranges, so concurrent accepts for one room conflict instead of both succeeding. Pending requests may overlap; only one overlapping request can be accepted. MongoDB must support transactions (the included local replica set does).

The demo payment endpoint only accepts an accepted booking owned by the renter and verifies the mock provider result server-side. The Razorpay provider adapter and HMAC webhook-signature utility are extension points, not a live payment integration.

## Deployment status and limitations

The client can be built for Vercel and the server for Render, but production deployment still requires configuring MongoDB Atlas, a managed Redis URL, a unique JWT secret, and the correct client origin. Email delivery, Cloudinary uploads, live Razorpay configuration, phone/email verification and password recovery remain future work. Demo seed credentials are for local use only.

## Checks

```powershell
npm run typecheck
npm test
npm run build
```

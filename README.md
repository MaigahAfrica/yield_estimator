# Yield Estimator Platform

This repository now hosts the original Flutter mobile application alongside a secure web dashboard and API for managing yield estimation records.

## Project structure

- `lib/` – Flutter mobile application used by field officers for offline-first data capture.
- `server/` – Node.js + TypeScript API that centralises records, enforces role-based access control, and exposes analytics endpoints.
- `dashboard/` – React + TypeScript web dashboard for supervisors and analysts to explore the central dataset.

## Backend API (`server/`)

The API provides authentication, paginated record retrieval (`GET /records`), aggregate KPIs (`GET /records/kpis`), record drill-down (`GET /records/:id`), CRUD endpoints and export helpers (`GET /records/export?format=csv|xlsx`). Dashboard-only permissions are enforced for read/update access while field officers may submit new records via `POST /records`.

### Getting started

```bash
cd server
npm install
npm run dev   # starts on http://localhost:4000 by default
```

Environment variables:

- `PORT` – optional, defaults to `4000`.
- `JWT_SECRET` – overrides the default signing key.

Seed users are stored in `server/data/db.json`:

| Role              | Username           | Password       |
|-------------------|--------------------|----------------|
| Dashboard admin   | `dashboard_admin`  | `dashboard123` |
| Field officer     | `field_officer`    | `officer123`   |

Only the dashboard admin role can view, export or edit centralised records through the API.

## Web dashboard (`dashboard/`)

The dashboard authenticates against the same API, visualises aggregate KPIs, renders trend charts by society/officer and surfaces a searchable, paginated table with drill-down views and direct CSV/Excel exports.

```bash
cd dashboard
npm install
npm run dev   # served on http://localhost:5173 by default
```

Optional environment variable:

- `VITE_API_BASE_URL` – defaults to `http://localhost:4000`. Point this to the deployed API when running the dashboard in production.

### Logging in

1. Ensure the API is running.
2. Visit the dashboard and sign in with a dashboard user (e.g. `dashboard_admin` / `dashboard123`).
3. Once authenticated you can:
   - Review KPI cards for totals, averages and monthly trends.
   - Toggle trend charts per society and officer.
   - Filter/search the records table by farmer ID, officer, location or date range.
   - Download filtered results as CSV or Excel directly from the API.
   - Open any record to inspect the same detail fields captured on mobile.

If a user without the `dashboard_admin` role signs in, access to dashboard routes is blocked.

## Mobile app (Flutter)

The Flutter application continues to support field officers with offline capture and local exports. Officers should keep using their existing workflow on device. When ready to integrate with the central API, reuse the authentication endpoints documented above; field officers authenticate with the `field_officer` role and can submit records to `/records`.

### Running the Flutter app

```bash
flutter pub get
flutter run
```

## Exports and analytics

The dashboard pulls exports straight from the API, ensuring that CSV/Excel downloads always reflect the central dataset. Aggregate endpoints deliver totals, averages and location/officer trends so analysts can monitor performance without extracting data from individual devices.

## Testing

- `server/`: run `npm run lint` for a TypeScript type check and `npm run build` for compilation.
- `dashboard/`: run `npm run build` to verify the React project compiles.

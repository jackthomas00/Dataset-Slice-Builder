# Dataset Slice Builder

A web app that lets you import Roboflow datasets, filter images by metadata (time-of-day, GPS, tags, split), save slices, and export manifests.

## Features

- **Import from Roboflow** — Paste API key + workspace + project to sync image metadata
- **Filtering UI** — Time-of-day, date range, GPS radius, tags, split, has-annotations
- **Virtualized image grid** — Browse large datasets efficiently
- **Saved slices** — Persist filter configurations for reuse
- **Export manifest** — Download slice as JSON
- **Map view** — See image locations (when GPS data available)
- **URL shareable filters** — Share filtered views via URL params

## Tech Stack

- **Frontend:** Next.js 16, TanStack Query, Leaflet, @tanstack/react-virtual
- **Backend:** Fastify, Prisma, Zod
- **Database:** PostgreSQL
- **Docker:** Compose for web, api, db

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (optional, for Postgres)
- npm or pnpm

### Local Development

1. **Start Postgres** (if using Docker):

   ```bash
   docker compose up -d db
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up the database:**

   ```bash
   cp .env.example .env
   npm run db:push
   npm run db:seed   # Optional: seed demo dataset
   ```

4. **Run the app:**

   ```bash
   npm run dev
   ```

   - Web: http://localhost:3000
   - API: http://localhost:4000

### Docker (full stack)

```bash
docker compose up --build
```

## Project Structure

```
/
├── packages/
│   ├── api/          # Fastify backend
│   └── web/          # Next.js frontend
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docker-compose.yml
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/datasets` | List datasets |
| GET | `/api/datasets/:id` | Get dataset |
| GET | `/api/datasets/:id/tags` | List tags for dataset |
| POST | `/api/datasets/import` | Import from Roboflow |
| GET | `/api/images` | Query images (filters + pagination) |
| GET | `/api/images/:id` | Get image |
| GET | `/api/slices` | List saved slices |
| POST | `/api/slices` | Save slice |
| GET | `/api/slices/:id/export` | Export slice manifest |

## Image Query Params

- `dataset_id` — Required
- `date_from`, `date_to` — Date range
- `time_of_day` — morning | afternoon | evening | night
- `lat`, `lng`, `radius_km` — GPS radius filter
- `tags` — Comma-separated tag names
- `split` — train | valid | test
- `has_annotations` — true | false
- `page`, `limit` — Pagination

## Highlights

- Implemented dataset slicing by metadata (time-of-day, GPS, tags) with indexed Postgres queries
- Built saved filter views + exportable manifests
- Integrated Roboflow REST API
- Dockerized dev environment with seeded demo dataset

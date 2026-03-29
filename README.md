# Industrial Monitoring Dashboard

A plant monitoring dashboard for industrial facilities. Displays real-time sensor data across assets — temperature, pressure, power, output, flow rate, and humidity — with automatic data refresh, time-series charts, and facility-level filtering.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui, Tailwind CSS, Recharts
- **Runtime**: Bun

## Prerequisites

- [Bun](https://bun.sh) 1.0+
- [Docker](https://www.docker.com) and Docker Compose

## Local Development

**1. Install dependencies**

```bash
bun install
```

**2. Start the database**

```bash
docker-compose up -d postgres
```

**3. Configure environment**

Create a `.env.local` file in the project root:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

**4. Run migrations and seed**

```bash
bun run db:migrate
bun run db:seed
```

**5. Start the dev server**

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker (Full Stack)

To run the entire stack in Docker:

```bash
docker-compose up --build
```

This starts PostgreSQL, runs migrations, and serves the app at [http://localhost:3000](http://localhost:3000). No additional setup required.

## Data Simulation

The app uses a lazy simulation strategy: on each API request, if no sensor readings have been recorded in the past 30 seconds, a new batch of readings is generated for all assets. This keeps the dashboard live without a separate background process.

To manually re-seed the database:

```bash
bun run db:seed
```

## Project Structure

```
src/
  app/
    api/               # REST API routes
      assets/
      facilities/
      sensor-readings/
      dashboard/summary/
    page.tsx           # Dashboard root
  components/          # UI components
  server/
    db/                # Drizzle schema, client, migrations
    simulation.ts      # Lazy data generation
scripts/
  seed.ts              # Database seed script
```

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/facilities` | List all facilities |
| `GET /api/assets?facilityId=` | List assets, optionally filtered by facility |
| `GET /api/sensor-readings?hours=&facilityId=&assetId=` | Time-bucketed sensor readings with adaptive resolution |
| `GET /api/dashboard/summary?facilityId=` | Aggregated metric averages, asset status counts |

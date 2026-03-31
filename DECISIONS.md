# Decisions & Development Notes

## Stack

**Next.js + TypeScript**- I've shipped two production systems with this stack and know where the strengths and weaknesses are. It places API routes with the frontend in shared directories, produces a single deployment artifact, and the App Router makes it straightforward to keep server and client code cleanly separated. I can move faster here than in a Python/React split setup.

**PostgreSQL + Drizzle ORM**- The brief specified PostgreSQL. Drizzle gives end-to-end type safety without a separate codegen step- the schema types flow directly into query results and into the frontend. Raw `pg` queries lose type safety; Prisma adds codegen overhead.

**TanStack Query**- Four components need overlapping data (section cards, area chart, pie chart, asset table). Without a shared cache layer, each component fetches independently- that's 4 requests per interval. With shared query keys, the first component to mount fetches and the rest read from cache. One request per 30 seconds regardless of how many consumers.

**shadcn/ui**- Radix UI primitives handle focus trapping, keyboard navigation, and ARIA roles by default. I didn't need to implement any of that manually, which mattered for the accessibility pass.

**Recharts**- Composable via JSX, stays within React's rendering model. D3 requires imperative DOM manipulation; Chart.js requires a canvas ref and imperative updates. Both fight React.

---

## Dashboard design

**Per-asset lines on the sensor chart, not facility-level aggregates**- A plant operator needs to know *which machine* is running hot, not the average across all machines. Aggregating to a single line would hide the signal that matters. The chart shows one line per asset for the selected metric, with min/max/avg in the tooltip at each time point.

**Facility selector scopes all data**- Every query on the page is scoped to the selected facility. This reflects how operators actually think: you're looking at one plant at a time. "All facilities" is available but the default experience is per-facility.

**Active issues always visible in the sidebar**- The initial design had a bell icon that opened a drawer. I replaced it with an always-visible issues list in the sidebar. In a real monitoring context, you shouldn't have to click anything to see what's broken. The sidebar shows live status (total/online/alerts) pinned at the top, and a scrollable issues list below- both updating on the same 30-second interval as the rest of the dashboard.

**30-second polling interval**- Industrial sensor readings on a summary dashboard don't require sub-second freshness. 30 seconds is frequent enough to feel live and responsive to real events, without hammering the database. `staleTime` matches `refetchInterval` so components never trigger a redundant fetch on mount or tab focus if data is already fresh.

---

## Data generation

**Live simulator, not static seed**- A static seed makes a monitoring dashboard look repetitive, and does not show new data. The simulator inserts a new reading per asset every 30 seconds, so charts update in real time and the "last updated" experience is genuine. The seed script generates ~24 hours of historical data at startup so the time-series chart has meaningful history immediately.

**Simulator runs fire-and-forget, not on the request path**- Early versions `await`-ed the simulation on every API request. When switching facilities, multiple queries fire simultaneously- each one would try to run the simulation, causing concurrent DB inserts and blocking responses. The fix: a module-level mutex and fire-and-forget. Concurrent callers skip if a run is already in progress; responses return immediately.

---

## What I didn't build

The brief said single page and depth over breadth. I didn't add authentication, facility/asset CRUD, data export, or analytics beyond what's shown. Those would have been padding. The things I focused on instead- query deduplication, accessible components, meaningful error states, a sidebar that earns its space- are more representative of how I actually build.
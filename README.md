# BeTrace

Behavioral assertions for distributed traces. Define rules about how your services *should* behave, evaluate them against OpenTelemetry trace data, and surface violations.

## What It Does

BeTrace lets you write declarative rules in a purpose-built DSL:

```
when {
  checkout-service.where(amount > 1000)
}
always {
  fraud-check-service
}
never {
  payment-service.where(status == "failed")
}
```

Translation: *When checkout processes orders over $1000, a fraud check must always run, and payment must never fail.*

Rules are evaluated against ingested OpenTelemetry spans. Violations are surfaced via API or the web UI.

## Architecture

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  OTel Traces  │────▶│  Go Backend   │────▶│  Violations  │
└──────────────┘     │  (gRPC/REST)  │     └──────────────┘
                     │  DSL Engine   │
                     │  Rule Store   │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │   Web UI      │
                     │  (TanStack)   │
                     └───────────────┘
```

- **Backend** — Go. gRPC + REST gateway. Span ingestion, DSL parsing/evaluation, rule management, violation detection.
- **Web UI (BFF)** — TanStack Start (React/TypeScript). Rule editor with Monaco, analytics dashboards, compliance views.
- **Grafana Plugin** — App plugin for viewing BeTrace data inside Grafana.

## Status

**Pre-release.** Backend is solid (compiles, tests pass). Web UI runs. Not yet packaged for distribution.

| Component | State |
|-----------|-------|
| Go Backend | ✅ Compiles, tests pass |
| Web UI (BFF) | ✅ Builds, dev server runs |
| Grafana Plugin | ⚠️ Builds, E2E tests not passing |
| SigNoz Plugin | 🚧 Stub |
| Kibana Plugin | 🚧 Stub |

## Quick Start

### Prerequisites

- Go 1.24+
- Node.js 22+ and pnpm
- Docker (for full stack)

### Backend

```bash
cd backend
go build ./cmd/betrace-backend
go test ./...
```

### Web UI

```bash
cd bff
pnpm install
pnpm dev
# → http://localhost:5173
```

### Docker Compose (full stack)

```bash
# Build the Grafana plugin first
cd grafana-betrace-app && pnpm install && pnpm build && cd ..

docker-compose up
# Backend: http://localhost:12011
# Grafana:  http://localhost:12015
```

## API

gRPC + REST (via grpc-gateway). Proto definitions in `api/betrace/v1/`:

- **SpanService** — `POST /v1/spans` — Ingest OpenTelemetry spans
- **RuleService** — `GET/POST/PUT/DELETE /v1/rules` — CRUD for behavioral rules
- **ViolationService** — `GET /v1/violations` — Query rule violations
- **HealthService** — `GET /v1/health` — Health checks

## DSL

The BeTrace DSL supports:

- **`when`** — Match traces by operation name and attributes
- **`always`** — Assert spans that must be present
- **`never`** — Assert spans that must not be present
- **`count()`** — Cardinality checks
- **`.where()`** — Attribute filtering with chaining
- Boolean operators: `and`, `or`, `not`

See `docs/DSL_SYNTAX_GUIDE.md` for the full grammar.

## Project Structure

```
backend/           Go backend (gRPC/REST, DSL engine, storage)
bff/               TanStack web UI
grafana-betrace-app/  Grafana app plugin
api/               Protobuf definitions
config/            Configuration files
docker-compose.yml Full stack setup
docs/              Technical documentation
```

## License

MIT

# Link Operations URL Shortener

Link Operations is a controlled engineering prototype for creating, managing, redirecting, and analyzing short URLs. It pairs a strict standalone Angular SPA with a Java 21 / Spring Boot modular monolith, MySQL, and Flyway. It also includes reviewer-facing evidence pages that clearly separate observed demo behavior from production approval.

This repository does **not** claim production use or production readiness. Management APIs are unauthenticated, abuse controls and production operations evidence are incomplete, and all human approval gates are pending.

## Architecture at a glance

- `frontend/`: Angular SPA with typed API services, accessible responsive workflows, engineering review, readiness, and optional portfolio routes.
- `backend/`: Spring Boot modules for URL lifecycle, redirect, analytics, idempotency, audit, rate limiting, and shared concerns.
- `backend/src/main/resources/db/migration/`: Flyway V1-V4 schema history.
- `api/openapi.yaml`: canonical implemented product API contract and Swagger UI source; human approval remains pending.
- `docs/`: requirements, architecture, scenarios, ADRs, risk, AI traceability, validation, and quality evidence.
- `scripts/`: quality and safe build-time metadata generation.

Runtime flow: browser -> Angular/Nginx -> same-origin `/api` or `/r` proxy -> Spring Boot -> MySQL. Reviewer pages load only packaged, allowlisted JSON. They do not expose a runtime filesystem endpoint.

## Quick start with Docker Compose

Prerequisites: Docker Engine or Docker Desktop with Compose v2. From the checked-out repository root:

```powershell
Copy-Item .env.example .env
docker compose up --build --detach --wait
```

macOS/Linux equivalent:

```bash
cp .env.example .env
docker compose up --build --detach --wait
```

Open:

- Application: <http://localhost:4200>
- Engineering Review: <http://localhost:4200/engineering-review>
- Production Readiness: <http://localhost:4200/production-readiness>
- Production Applications: <http://localhost:4200/production-applications>
- Swagger UI: <http://localhost:4200/swagger-ui/index.html>
- OpenAPI YAML: <http://localhost:4200/openapi.yaml>
- Aggregate health: <http://localhost:4200/actuator/health>

Inspect state with `docker compose ps` and `docker compose logs --tail 200`. Stop containers with `docker compose down`. Add `--volumes` only when you intentionally want to delete the local MySQL data volume.

The defaults in `.env.example` are local-only. Replace passwords before any shared deployment and never commit `.env`.

## Local development without containers

Prerequisites:

- JDK 21 and Maven 3.9+
- Node.js 20 and npm
- MySQL 8.4 reachable locally
- Chrome for the configured Karma and Playwright jobs

Create a MySQL schema and least-privilege local user matching the defaults in `backend/src/main/resources/application.yml`, or export `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD` for your environment. Then use separate terminals:

```powershell
mvn -f backend/pom.xml spring-boot:run
```

```powershell
Set-Location frontend
npm ci
npm run start
```

Angular listens on <http://localhost:4200> and proxies API, redirect, health, OpenAPI, and Swagger paths to <http://localhost:8080>. Flyway applies V1-V4 automatically before JPA validates the schema.

Regenerate the safe reviewer snapshot after relevant docs or repository structure changes:

```powershell
./scripts/generate-project-metadata.ps1
```

The script has no path parameter. It starts at the repository root, reads fixed allowlisted roots, emits relative names only, caps traversal depth/children, and excludes Git metadata, dependencies, outputs, environment files, and credential/key-like names.

## Validation commands

Backend:

```powershell
mvn -B -f backend/pom.xml verify
```

Frontend:

```powershell
Set-Location frontend
npm ci
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm run e2e:browser
```

The full-stack suite runs only against a live Angular/Spring/MySQL stack:

```powershell
$env:E2E_FULL_STACK='true'
npm run e2e:full-stack
```

Do not treat skipped Testcontainers tests, unavailable Docker, or an unexecuted CI workflow as a pass. Machine-readable quality files live under `docs/quality/`.

## Demo path

Use [docs/DEMO-GUIDE.md](docs/DEMO-GUIDE.md) for a short reviewer walkthrough. The recommended path is Dashboard -> Create URL -> Management/Details -> Redirect -> Analytics -> Engineering Review -> Production Readiness -> Production Applications empty state.

## Final review artifacts

- [Final engineering summary](docs/FINAL-ENGINEERING-SUMMARY.md)
- [Final status and directory tree](docs/FINAL-STATUS.md)
- [Security review](docs/FINAL-SECURITY-REVIEW.md)
- [Code review](docs/FINAL-CODE-REVIEW.md)
- [Simplification review](docs/FINAL-SIMPLIFICATION-REVIEW.md)
- [Defect summary](docs/DEFECT-SUMMARY.md)
- [Production-readiness assessment](docs/PRODUCTION-READINESS-ASSESSMENT.md)
- [Production evolution](docs/PRODUCTION-EVOLUTION.md)
- [Prompt 10 validation](docs/validation/PROMPT-10-FINAL-VALIDATION.md)
- [Interview talking points](docs/FINAL-INTERVIEW-TALKING-POINTS.md)

## Known limitations and security boundary

- No authentication, authorization, ownership, or accountable actor exists for management and analytics APIs. Keep the prototype on a controlled network.
- URL shortening can enable phishing/open-redirect abuse; moderation, reputation, takedown, and abuse operations are absent.
- Dependency evidence is contradictory: clean `npm ci` reports 29 findings, while immediate explicit production-only and full-tree audits report zero. Security remains `FAIL` until the toolchain/advisory result is reconciled.
- MySQL is a single dependency. Backups, restore, failover, disaster recovery, capacity, SLOs, and rollback are not production-validated.
- Cache and rate limits are process-local; cache is disabled by default and no Redis behavior is claimed.
- Analytics is privacy-minimized and best effort. It does not claim unique users or complete delivery.
- Swagger/metrics are appropriate only for the controlled prototype and must be protected or disabled for public deployment.
- Automated accessibility checks are not certification; manual screen-reader and non-Chrome validation remain `NOT_RUN`.
- Portfolio content remains `REQUIRES_HUMAN_INPUT`; no employer, customer, production metric, or link claim was invented.

See [docs/LIMITATIONS.md](docs/LIMITATIONS.md), [docs/RISK-REGISTER.md](docs/RISK-REGISTER.md), and [docs/HUMAN-APPROVAL-GATES.md](docs/HUMAN-APPROVAL-GATES.md) for the complete boundary.

## Troubleshooting

- Port conflict: change `FRONTEND_PORT`, `BACKEND_PORT`, or `MYSQL_PORT` in `.env`, then restart Compose.
- MySQL unhealthy: run `docker compose logs db`; verify the volume is writable and passwords are consistent. Do not delete the volume unless local data loss is intended.
- Backend unhealthy: run `docker compose logs backend`; common causes are database startup, credential mismatch, or Flyway validation failure.
- Frontend loads but API calls fail: check `docker compose ps`, then request `/actuator/health` through port 4200 to verify the proxy path.
- Metadata page fails: rerun `./scripts/generate-project-metadata.ps1`, rebuild the frontend, and confirm the two JSON files exist under `frontend/public/assets/engineering/`.
- Testcontainers skipped: start a compatible Docker daemon and rerun Maven verify; the suite deliberately reports `NOT_RUN` rather than faking database evidence.
- Dependency audit change: preserve the command/tool/date in validation evidence, review new findings, and do not force a major upgrade without compatibility and regression review.

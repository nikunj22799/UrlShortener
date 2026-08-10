# URL Shortener

A focused full-stack URL management platform for creating, managing, redirecting, and analyzing short URLs.

---

**Project GitHub:** <https://github.com/nikunj22799/UrlShortener>  
**Live Application:** <https://url-shortener-frontend-otys.onrender.com/>

---

## Technology Stack

```text
Frontend                    Backend                     Data
────────                    ───────                     ────
Angular 19.2                Java 21                     MySQL
TypeScript 5.8              Spring Boot 3.5            Flyway
Signals + RxJS              Spring Web                 JPA / Hibernate
Bootstrap Icons             Spring Validation          JdbcTemplate
                            Spring Data JPA
                            Spring Actuator
                            OpenAPI / Swagger

Quality                     Build / Tooling             AI
───────                     ───────────────             ──
JUnit                       Maven                       Codex
Testcontainers              npm                         Specialized agents
Jasmine / Karma             Docker                      Human approval gates
Playwright
axe-core
ESLint
JaCoCo
```

---

## System View

```text
┌─────────────────────────────── BROWSER ───────────────────────────────┐
│                                                                      │
│  Dashboard   Create URL   URL Management   Analytics   Project Review │
│      │           │               │              │             │       │
│      └───────────┴───────────────┴──────────────┴─────────────┘       │
│                              Angular 19                               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                          Typed REST / JSON
                                   │
                                   ▼
┌──────────────────────────── SPRING BOOT ──────────────────────────────┐
│                                                                      │
│  UrlController       RedirectController       AnalyticsController    │
│       │                     │                        │                 │
│       ▼                     ▼                        ▼                 │
│   UrlService          RedirectService          AnalyticsService      │
│       │                     │                        │                 │
│       └───────────────┬─────┴──────────────┬─────────┘                 │
│                       │                    │                           │
│         Reliability / Validation / Errors / Rate Limiting            │
│                       │                    │                           │
└───────────────────────┼────────────────────┼───────────────────────────┘
                        │                    │
                        ▼                    ▼
                Spring Data JPA       JdbcTemplate queries
                        │                    │
                        └─────────┬──────────┘
                                  ▼
                         ┌────────────────┐
                         │     MySQL      │
                         │ shortened_url  │
                         │ click_event    │
                         │ idempotency    │
                         └────────────────┘
```


I intentionally kept the backend as a **modular monolith**. URL management, redirect handling, and analytics have clear boundaries, but the current system does not benefit enough from separate deployments to justify distributed-system complexity.

That gives me simple deployment and debugging today, while preserving logical boundaries that can be extracted later if scale requires it.

---

## What the Application Does

| Capability | Implementation |
|---|---|
| Short URL creation | Generated short codes or custom aliases |
| URL lifecycle | Enable, disable, expire, soft-delete |
| Redirect | `GET /r/{shortCode}` with lifecycle validation |
| Safe retries | `Idempotency-Key` support on create |
| Concurrent updates | JPA `@Version` + HTTP `If-Match` / ETag |
| Analytics | Summary, time series, referrers, devices, browsers, OS |
| Abuse protection | Separate rate limits for create, redirect, management, analytics |
| Error contract | Centralized structured API errors |
| Observability | Correlation IDs, Actuator health/metrics |
| Database evolution | Flyway migrations |
| API review | OpenAPI / Swagger UI |
| Frontend quality | Responsive Angular UI, centralized API errors, lazy-loaded pages |
| Automated validation | JUnit, Testcontainers, Jasmine/Karma, Playwright, axe-core |

---

## Core Engineering

| Capability | Implementation | Purpose |
|---|---|---|
| **Idempotency** | Request key + fingerprint | Prevent duplicate creation on retries |
| **Concurrency** | JPA `@Version` + `If-Match` | Prevent lost updates |
| **Rate Limiting** | Endpoint-specific limits | Protect APIs from excessive traffic |
| **Data Integrity** | Validation + DB constraints | Enforce URL and uniqueness rules |
| **Analytics Reliability** | Best-effort recording | Analytics failure does not break redirects |
| **Schema Evolution** | Flyway | Version-controlled DB changes |
| **Error Handling** | Global handler + Angular interceptor | Consistent errors across layers |
| **Observability** | Correlation IDs | Trace requests across the application |

### Rate Limiting

```text
                    Incoming Traffic
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         Create URL    Management     Redirect
             │             │             │
          Stricter       Normal        Higher
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                      Spring Boot
```

Rate limits are currently instance-local. Redis or gateway-level rate limiting becomes appropriate when multiple backend instances require shared coordination.

### Concurrency Protection

```text
Client A reads V4 ──► updates ──► DB becomes V5
Client B reads V4 ──► updates ──► REJECTED (stale)
```

Optimistic locking fits this workload because concurrent management updates are expected to be uncommon.

---

# Architecture

## Request Path

<table>
<tr>
<td width="50%" valign="top">

<h3>Backend</h3>

<pre><code>HTTP Request
    │
    ▼
Controller
    │
    ▼
Service
    │
    ▼
Repository
    │
    ▼
MySQL</code></pre>

<strong>Responsibilities</strong>

<ul>
<li><strong>Controller</strong>: HTTP contract, headers, DTOs, status codes</li>
<li><strong>Service</strong>: business rules and application behavior</li>
<li><strong>Repository</strong>: persistence/query boundary</li>
<li><strong>MySQL + Flyway</strong>: data and schema integrity</li>
</ul>

</td>
<td width="50%" valign="top">

<h3>Frontend</h3>

<pre><code>Feature Page
    │
    ▼
Typed API Service
    │
    ▼
Angular HttpClient
    │
    ├── SUCCESS → Feature State / UI
    │
    └── ERROR
          │
          ▼
API Error Interceptor
          │
          ▼
FrontendApiError
          │
          ▼
Consistent UI</code></pre>

Frontend code is organized by <strong>feature</strong>, while application-wide infrastructure remains under <code>core</code>.

</td>
</tr>
</table>

---

# API Map

## URL Management

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/urls` | Create a short URL |
| `GET` | `/api/v1/urls` | Search, filter, sort, and paginate URLs |
| `GET` | `/api/v1/urls/{urlId}` | Get URL details |
| `PATCH` | `/api/v1/urls/{urlId}` | Update expiration using `If-Match` |
| `POST` | `/api/v1/urls/{urlId}/enable` | Enable URL using `If-Match` |
| `POST` | `/api/v1/urls/{urlId}/disable` | Disable URL using `If-Match` |
| `DELETE` | `/api/v1/urls/{urlId}` | Soft-delete URL using `If-Match` |

## Redirect

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/r/{shortCode}` | Redirect and record analytics |
| `HEAD` | `/r/{shortCode}` | Resolve redirect without recording analytics |

## Analytics

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/urls/{id}/analytics/summary` | Click summary |
| `GET` | `/api/v1/urls/{id}/analytics/timeseries` | Hour/day trend |
| `GET` | `/api/v1/urls/{id}/analytics/referrers` | Top referrer hosts |
| `GET` | `/api/v1/urls/{id}/analytics/devices` | Device, browser, and OS breakdown |

---

# Project Structure

<table>
<tr>
<td width="50%" valign="top">

<h3>Backend</h3>

<pre><code>backend/
├── src/main/java/.../
│   ├── config/
│   ├── controller/
│   ├── dto/
│   ├── entity/
│   ├── exception/
│   ├── repository/
│   ├── service/
│   └── util/
│
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/
│
└── src/test/
    ├── controller/
    ├── repository/
    ├── service/
    └── integration tests</code></pre>

</td>
<td width="50%" valign="top">

<h3>Frontend</h3>

<pre><code>frontend/src/app/
├── core/
│   ├── api/
│   ├── errors/
│   ├── interceptors/
│   ├── services/
│   └── utils/
│
├── features/
│   ├── dashboard/
│   ├── create-url/
│   ├── url-management/
│   ├── analytics/
│   └── project-review/
│
├── layout/
├── shared/
└── testing/</code></pre>

</td>
</tr>
</table>

---

## AI-Assisted Engineering

Each AI task was scoped with the **intent, relevant code context, constraints, and expected outcome**. Outputs were reviewed iteratively rather than accepted as one-shot generated solutions.

I used Codex through specialized engineering roles:

```text
                         ┌─────────────────────┐
                         │      ENGINEER       │
                         │ Requirements / Scope│
                         │ Architecture        │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      architecture-agent      backend-agent        frontend-agent
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                           Candidate Solution
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   ENGINEER REVIEW   │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
                  ACCEPT          MODIFY          REJECT
                    │               │
                    └───────┬───────┘
                            ▼
                   Security + Quality Review
                            │
                            ▼
                    Engineer Sign-Off
```

### Agents used

| Agent | How I used it |
|---|---|
| `architecture-agent` | Architecture alternatives, boundaries, scalability, trade-offs |
| `backend-agent` | Spring Boot APIs, persistence, reliability, refactoring |
| `frontend-agent` | Angular implementation, API integration, responsive UI |
| `security-review-agent` | Validation, exposure, error handling, abuse controls |
| `testing-quality-agent` | Edge cases, regression risks, tests, quality gates |

The agents did not autonomously decide what to build or approve each other's work. I remained the coordinator and final decision-maker.

### AI decision traceability

| AI Recommendation | My Decision | Reason |
|---|---|---|
| Split URL Management, Redirect, and Analytics into microservices | ❌ **Rejected** | Distributed-system complexity was not justified by current requirements |
| Add Redis for shared caching / rate limiting | ⏳ **Deferred** | Appropriate after horizontal scaling, unnecessary infrastructure today |
| Protect concurrent URL updates | ✅ **Accepted + Refined** | I selected `@Version` + `If-Match` based on low expected contention |
| Add idempotency to URL creation | ✅ **Accepted + Validated** | Solves a real retry problem and was verified through replay/conflict behavior |
| Add more generic abstractions/components | 🔧 **Modified / Rejected** | Removed complexity that did not improve reuse, testability, or clarity |

> **AI proposed options. I evaluated the trade-offs. Tests and review validated the result.**

---

## Engineering Scenarios

### 🌱 Greenfield: Build the URL Shortener

The initial requirement was decomposed before implementation:

```text
Requirement
    ↓
Architecture
    ↓
Domain + Database
    ↓
Core APIs
    ↓
Frontend Integration
    ↓
Reliability Features
    ↓
Testing + Review
```

The key point was not generating individual files. It was defining the right boundaries, sequencing the work, and validating the integrated system.

### 🔧 Brownfield: Add Idempotency

URL creation already worked. Idempotency was introduced as a reliability enhancement without breaking existing behavior.

Affected areas included:

```text
API Contract
Service Logic
Persistence
Flyway Migration
Frontend Requests
Replay / Conflict Handling
Regression Tests
```

This required codebase reasoning across an existing working flow rather than implementing an isolated feature.

### ❓ Ambiguous Requirement: Analytics Failure

The requirement said to track analytics when a short URL is used, but it did not define what happens if analytics storage fails.

I chose:

```text
Primary capability   = Redirect
Secondary capability = Analytics
```

Therefore analytics recording is best-effort. A secondary failure should not unnecessarily make a valid short URL unavailable.

---

## Validation and Security

AI-assisted code was treated as **candidate code**, not approved code.

```text
AI-Assisted Change
        ↓
Engineer Review
        ↓
Build / Static Checks
        ↓
Unit Tests
        ↓
Integration Tests
        ↓
E2E Validation
        ↓
Engineer Sign-Off
```

### Quality gates

**Backend**

- JUnit
- Spring Boot tests
- repository tests
- Testcontainers with MySQL
- JaCoCo

**Frontend**

- Angular unit tests
- TypeScript checks
- ESLint
- Playwright
- axe-core
- manual responsive review

### Security boundary

Security controls include validation, rate limiting, CORS, controlled error exposure, database constraints, bounded requests, and correlation IDs.

A complete authentication/authorization model is outside the current prototype scope. For a public multi-user deployment, management and analytics APIs would need Spring Security with OAuth 2.0 / OIDC and appropriate authorization rules.

---

## Containerization

Both frontend and backend use multi-stage Docker builds.

| Frontend | Backend |
|---|---|
| Node 20 Alpine build stage | Maven build stage |
| Angular production build | Spring Boot JAR build |
| `nginx-unprivileged` runtime | Java 21 runtime |
| Non-root runtime + health check | Build tooling excluded from runtime image |

```text
Frontend                              Backend
────────                              ───────
Node 20 Build                         Maven Build
     │                                     │
     ▼                                     ▼
Angular Build                         Spring Boot JAR
     │                                     │
     ▼                                     ▼
Unprivileged Nginx                    Java 21 Runtime
```

**Flyway** remains responsible for version-controlled database schema evolution.

---

## Deployment & Live Application

```text
User
 │
 ▼
Angular Frontend
Render - Static Web Service
 │
 ▼
Spring Boot Backend
Render - Web Service
 │
 ▼
MySQL Database
Aiven
```

| Component | Hosting |
|---|---|
| **Frontend** | Static web service on Render |
| **Backend** | Web service on Render |
| **Database** | MySQL hosted on Aiven |


Render and Aiven are third-party services used to host the assessment environment.

---

## Trade-offs & Limitations

| Current Decision | Trade-off / Evolution |
|---|---|
| **Modular monolith** | Simpler deployment today; services can be extracted if independent scaling becomes necessary |
| **Instance-local rate limiting** | Appropriate for current deployment; Redis or gateway coordination is needed for multiple instances |
| **Best-effort analytics** | Redirect availability is prioritized over guaranteed analytics delivery |
| **Optimistic locking** | Fits low-contention management operations |
| **No authentication/authorization** | Acceptable for assessment scope; public multi-user deployment would require OAuth 2.0 / OIDC |

---

## Architecture Evolution

Current architecture:

```text
Angular
   ↓
Spring Boot Modular Monolith
   ↓
MySQL
```

Possible evolution only when real requirements justify it:

```text
                     API Gateway
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   URL Management      Redirect       Analytics
                          │               ▲
                          ▼               │
                       Redis         Event Pipeline
                          │               │
                          └───────────────┘
```

The future architecture is not automatically better. It becomes appropriate only when independent scaling, distributed coordination, or workload characteristics justify the additional complexity.

---

## Setup Instructions

**Prerequisites:** JDK 21 · Maven 3.9+ · Node.js 20+ · npm · MySQL

### Database

```sql
CREATE DATABASE url_shortener;
```

Configure using `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`.

### Backend

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Runs on `http://localhost:8080`. Flyway migrations execute automatically at startup.

### Frontend

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:4200` and proxies API requests to the local backend.

---

## Final Takeaway

This project demonstrates both full-stack engineering and controlled AI-assisted execution.

```text
I define the requirement
        ↓
AI accelerates analysis / implementation
        ↓
I review and challenge the output
        ↓
I accept / modify / reject
        ↓
Automated + manual validation
        ↓
I own the final result
```

**Codex was an engineering accelerator, not the architect or decision-maker.**

Architecture, complexity, trade-offs, security decisions, code acceptance, validation strategy, and final sign-off remained engineer-owned. Known limitations were intentionally documented rather than hidden or solved through unnecessary complexity.

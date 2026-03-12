# snip — URL Shortener

A URL shortener built with **Node.js**, **TypeScript**, **Express**, and **PostgreSQL**.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## Features

- **URL shortening** with auto-generated or custom slugs
- **Link expiry** — configurable per link (1–365 days)
- **Click analytics** — total clicks, clicks by day, top browsers, OS, and referrers
- **Rate limiting** — per-IP limits on both creation and redirect endpoints
- **Input validation** — strict schema validation via Zod
- **Clean layered architecture** — Controller → Service → Repository pattern
- **Graceful shutdown** with SIGTERM/SIGINT handling
- **Full test suite** with Jest + ts-jest

---

## Architecture

```
src/
├── controllers/     # Request/response handling — no business logic
│   └── urlController.ts
├── services/        # Business logic, slug generation, UA parsing
│   └── urlService.ts
├── repositories/    # All database access via parameterised queries
│   └── urlRepository.ts
├── middleware/      # Validation (Zod), error handling
│   ├── validate.ts
│   └── errorHandler.ts
├── config/          # DB pool, schema migrations
│   ├── database.ts
│   └── schema.sql
├── types/           # Shared TypeScript interfaces
│   └── index.ts
├── app.ts           # Express app wiring
└── index.ts         # Server entry point + graceful shutdown
```

The layered design means each layer only depends on the one below it. Controllers never touch the database; repositories never contain business rules.

---

## API

### `POST /api/shorten`

Create a shortened URL.

**Request body:**
```json
{
  "url": "https://example.com/very/long/path",
  "customSlug": "my-link",        // optional, 3–20 alphanumeric chars
  "expiresInDays": 30             // optional, 1–365
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shortUrl": "http://localhost:3000/my-link",
    "slug": "my-link",
    "expiresAt": "2024-02-14T00:00:00.000Z"
  }
}
```

### `GET /:slug`

Redirects to the original URL (301). Records a click event asynchronously.

### `GET /api/analytics/:id`

Returns click analytics for a given URL ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClicks": 142,
    "clicksLast7Days": 38,
    "clicksLast30Days": 142,
    "topReferers": [{ "referer": "Direct", "count": 90 }],
    "topBrowsers": [{ "browser": "Chrome", "count": 110 }],
    "topOs": [{ "os": "macOS", "count": 75 }],
    "clicksByDay": [{ "date": "2024-01-15", "count": 12 }]
  }
}
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Setup

```bash
# 1. Clone and install
git clone https://github.com/reuben-claassen/url-shortener.git
cd url-shortener
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and preferred settings

# 3. Run the database schema
psql $DATABASE_URL -f src/config/schema.sql

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the UI.

---

## Running Tests

```bash
npm test              # Run all tests with coverage
npm test -- --watch   # Watch mode
```

---

## Design Decisions

**Why the Repository pattern?**  
Keeping all SQL in repository functions means the service layer stays database-agnostic. If the storage engine ever needed to change (e.g., to a Redis-backed store for hot paths), only the repositories would need updating — not the business logic.

**Why async click recording?**  
Redirect latency is user-facing; analytics recording is not. By firing the click recording without awaiting it, redirects return in ~1ms rather than waiting on two database writes.

**Why Zod for validation?**  
Zod integrates cleanly with TypeScript's type system. Validated input is automatically typed, eliminating an entire class of runtime type errors downstream.

**Collision-safe slug generation?**  
`nanoid` with a 62-character alphabet at 7 characters gives ~3.5 trillion possible slugs. A retry loop handles the unlikely collision case rather than relying on DB constraint errors for control flow.

---

## Potential Extensions

- [ ] QR code generation per link
- [ ] Password-protected links
- [ ] GeoIP-based analytics (country data)
- [ ] Link preview / unfurl metadata
- [ ] User accounts & dashboard
- [ ] Redis caching for hot slugs

---

## License

MIT

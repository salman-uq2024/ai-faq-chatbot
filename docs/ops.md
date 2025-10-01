# Operations Guide

## Runtime Overview

- **Framework**: Next.js App Router
- **Runtime Commands**:
  - `npm run dev` – local development server
  - `npm run start` – production server after `npm run build`
- **Storage**: JSON files under `data/` (replace with managed store in production if durability is required)

## Environment Variables

| Variable | Purpose | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | Enables Gemini-generated answers | Leave unset for fallback mode |
| `GEMINI_EMBEDDING_MODEL` | Embedding model identifier | Defaults to `models/embedding-001` |
| `RATE_LIMIT_PER_MINUTE` | Per-origin/IP limit for `/api/query` | Default 30 requests |

Changes require a server restart to take effect.

## Ingestion Jobs

Ingestion runs synchronously from the admin UI or `POST /api/admin/ingest`. Each job:

1. Crawls the requested origin (up to 25 pages) and/or downloads PDFs.
2. Normalises and chunks text.
3. Embeds each chunk (Gemini if available, hashed fallback otherwise).
4. Replaces existing chunks that share the same origin.
5. Stores a log entry at `data/ingestion-log.json`.

Monitor the “Recent ingestions” card in `/admin` to verify success. Errors return in the UI and API response body.

## Query Handling

- All widget/API calls hit `src/app/api/query/route.ts`.
- Origin allowlist is enforced via `data/settings.json`.
- Rate limiting is in `src/lib/security.ts`; adjust via environment variable.
- Without Gemini the fallback summariser stitches relevant sentences from retrieved chunks.

## Maintenance Tasks

| Task | Frequency | Command/Action |
| --- | --- | --- |
| Update dependencies | Monthly | `npm outdated`, `npm update` |
| Run quality gates | Before releases | `npm run lint && npm run test:e2e && npm run build` |
| Rotate API keys | Quarterly | Update Vercel env vars and redeploy |
| Backup knowledge base | As needed | Copy `data/chunks.json` / move to managed DB |

## Observability

- Server logs: standard output (Vercel dashboard or platform logs).
- API errors: logged via `console.error` with stack traces.
- Frontend issues: use browser dev tools; widget logs to console on failure.

## Incident Response

1. Check logs for rate-limit or origin errors (403/429).
2. Verify `allowOrigins` in `/admin` and `data/settings.json`.
3. Confirm environment variables exist and have correct values.
4. If ingestion fails, inspect the error toast and check remote robots.txt restrictions.

## Scaling Notes

- Stateless compute; horizontal scaling requires externalising the JSON storage.
- Replace `embedTexts` backend with managed vector DB for large datasets.
- Consider queueing ingestion jobs for larger crawls.

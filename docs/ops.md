# Operations Guide

This guide covers running the AI FAQ Chatbot in production, monitoring, scaling, and maintenance. It's designed for beginners managing the app post-deployment. For setup and deployment, refer to [install.md](docs/install.md) and [deploy.md](docs/deploy.md).

## Runtime in Production

The app uses Next.js App Router for server-side rendering and API routes.

- **Start Command**: After building (`npm run build`), run `npm run start` to serve on port 3000 (or as configured).
- **Environment**: Set `NODE_ENV=production` for optimized builds. Use serverless platforms like Vercel for auto-scaling.
- **Storage**: Defaults to JSON files in `data/` (ephemeral). For persistence, configure a backend like Supabase or Pinecone via `STORAGE_URL` env var (see [src/lib/storage.ts](src/lib/storage.ts)).

Key files:
- API routes: [src/app/api/query/route.ts](src/app/api/query/route.ts) for queries, [src/app/api/admin/ingest/route.ts](src/app/api/admin/ingest/route.ts) for ingestion.
- RAG pipeline: [src/lib/rag.ts](src/lib/rag.ts).

## Environment Variables

Configure these in your hosting platform (e.g., Vercel dashboard):

| Variable                  | Purpose                              | Example/Default                  |
|---------------------------|--------------------------------------|----------------------------------|
| `GEMINI_API_KEY`         | Enables AI embeddings and responses | `AIzaSy...` (required for full features) |
| `GEMINI_EMBEDDING_MODEL` | Model for text embeddings            | `models/embedding-001`           |
| `STORAGE_URL`             | Vector store endpoint                | `https://your-supabase-url` (optional) |
| `RATE_LIMIT_PER_MINUTE`  | Query rate limit per IP/origin       | `60` (higher for prod)           |

Changes require redeployment. Without `GEMINI_API_KEY`, fallback to snippet-based responses.

## Ingestion Jobs

Ingestion processes content (web crawls/PDFs) into vectors for RAG.

- **How it Works**:
  1. Trigger via admin dashboard (`/admin`) or POST to `/api/admin/ingest`.
  2. Crawl URLs ([src/lib/ingest/crawl.ts](src/lib/ingest/crawl.ts)) or parse PDFs ([src/lib/ingest/pdf.ts](src/lib/ingest/pdf.ts)).
  3. Chunk text ([src/lib/text.ts](src/lib/text.ts)), embed ([src/lib/embedding.ts](src/lib/embedding.ts)), store.
  4. Logs saved to `/api/admin/ingestion-log` endpoint.

- **Tips**:
  - Batch PDF processing: Limit concurrent files in [src/lib/ingest/pdf.ts](src/lib/ingest/pdf.ts) to avoid memory issues.
  - Handle rate limits: Gemini calls in [src/lib/embedding.ts](src/lib/embedding.ts) include retries; monitor API quotas.
  - For large datasets, scale by queuing jobs (e.g., Vercel Cron) or using external services.

View recent jobs in admin dashboard.

## Query Handling and Monitoring

- **Queries**: Handled in [src/app/api/query/route.ts](src/app/api/query/route.ts). Enforces origin allowlist ([src/lib/security.ts](src/lib/security.ts)) and rate limits.
- **Monitoring**:
  - Logs: Console output for errors (view in Vercel dashboard or server logs). Add Sentry for advanced error tracking (integrate via `npm install @sentry/nextjs` and config in [next.config.ts](next.config.ts)).
  - Metrics: Track ingestion success via `/api/admin/ingestion-log`. Use browser dev tools for frontend issues.
  - Performance: Queries use vector similarity; slow responses indicate unoptimized storage.

For scaling queries, leverage serverless auto-scaling. Externalize storage for high concurrency.

## Maintenance Tasks

Perform these regularly to keep the app healthy:

1. **Update Dependencies**: Monthly – Run `npm outdated` to check, then `npm update` and test.
2. **Run Tests and Build**: Before every deploy – `npm run lint && npm run test:e2e && npm run build`. Ensures no breaking changes.
3. **Backup Data**: Copy `data/chunks.json` or export from storage backend.
4. **Rotate Secrets**: Quarterly – Update API keys in env vars and redeploy.
5. **Optimize**: Review embeddings for large corpora; consider vector index tweaks in storage setup.

## Troubleshooting

- **Slow Queries**: Optimize vector index in your storage (e.g., Supabase pgvector). Reduce chunk size in [src/lib/ingest/pipeline.ts](src/lib/ingest/pipeline.ts). Check [src/lib/rag.ts](src/lib/rag.ts) for retrieval limits.
- **Security Issues**: Review allowlist and auth in [src/lib/security.ts](src/lib/security.ts). Ensure HTTPS in production.
- **Ingestion Failures**: Logs at `/api/admin/ingestion-log`. Common causes: Invalid URLs, robots.txt blocks, or API rate limits. Verify env vars.
- **Rate Limit Exceeded**: Increase `RATE_LIMIT_PER_MINUTE` or whitelist IPs in [src/lib/security.ts](src/lib/security.ts).
- **Storage Errors**: If using JSON, data may reset on restarts. Switch to persistent backend via [src/lib/storage.ts](src/lib/storage.ts).
- **No Responses**: Confirm ingestion completed and Gemini key is valid. Test fallback mode.

For deployment-specific issues, see [deploy.md](docs/deploy.md). If adding Sentry, follow their Next.js guide for setup.
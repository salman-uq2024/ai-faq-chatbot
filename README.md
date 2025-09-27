# AI FAQ Chatbot

A production-ready Next.js application for ingesting product documentation, running retrieval-augmented generation (RAG), and serving an embeddable AI assistant widget. Built for hands-off deployments with hardened security defaults, offline demo mode, and a polished admin experience.

![Landing screenshot](public/demo-landing.png)
![Admin screenshot](public/demo-admin.png)

## Features

- **Multi-source ingestion** – Crawl websites (depth-limited) and fetch PDFs, clean the text, chunk, embed, and persist locally.
- **Hybrid embeddings** – Uses OpenAI embeddings when a key is present, otherwise falls back to a deterministic hashed embedding for offline demos.
- **Secure RAG API** – `/api/query` performs similarity search, cites top sources, and calls OpenAI Responses API when available. Falls back to stitched summaries when offline.
- **Admin console** – Configure models, token limits, brand colour, and origin allowlist. Kick off ingestion jobs, monitor recent runs, and copy embed snippets.
- **Embeddable widget** – `/widget.js` injects a floating button and modal that talks to the hosted API from any allowlisted domain.
- **Safety rails** – Per-origin/IP rate limiting, strict origin allowlist enforcement, server-only access to secrets.
- **DX niceties** – TypeScript everywhere, SWR for data-fetching, Tailwind CSS v4, Playwright e2e smoke test, packaging script, sample screenshots, and GitHub Actions CI for Node.js 20 & 22.

## Getting Started

### Prerequisites

- Node.js 20.x or 22.x (LTS recommended)
- npm 10+

### Installation

```bash
npm install
```

```bash
npm run dev
```

- The app boots on `http://localhost:3000`.
- Admin dashboard lives at `http://localhost:3000/admin`.

### Environment variables

Copy `.env.example` to `.env.local` and adjust as needed:

```ini
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
RATE_LIMIT_PER_MINUTE=30
```

No secrets are required for local demos. Without a key, the app still ingests content and answers questions with the heuristic fallback.

### Data storage

- Ingested content is stored as JSON files under `data/` (ignored by git).
- Each chunk carries embeddings, metadata, and timestamps.
- Settings persist to `data/settings.json` so brand changes survive restarts.

## Ingestion Workflow

1. Visit `/admin`.
2. Enter a base URL (e.g. `https://nextjs.org`) and optionally PDF URLs (newline-separated).
3. Adjust crawl depth, page limit, and chunk options (defaults ingest ~10 pages).
4. Click **Start ingestion** and watch success/error states in the UI.
5. Recent runs appear in the log at the bottom of the page.

The crawler respects same-origin links only. PDF fetches stream binary data and extract text with `pdf-parse`. All text is normalised before chunking.

## Query API

`POST /api/query`

Request body:

```json
{ "question": "How do I deploy this bot?" }
```

Response body:

```json
{
  "answer": "...",
  "sources": [
    {
      "id": "chunk-id",
      "title": "Docs page title",
      "url": "https://example.com/docs",
      "snippet": "Matched text",
      "score": 0.82
    }
  ]
}
```

- When `OPENAI_API_KEY` is present, answers come from the OpenAI Responses API with grounded prompts.
- Without a key, answers stitch together the highest-scoring chunks so `/api/query` always responds.

## Admin Settings

- **Model ID** – Defaults to `gpt-4o-mini`. Enter any Responses-compatible model.
- **Max output tokens** – Clamped between 64 and 4096.
- **Brand colour** – Controls admin accents and widget styling.
- **Origin allowlist** – Domains allowed to call the API/widget (`http://localhost:3000`, `http://127.0.0.1:3100`, etc. seeded by default).

## Embedding the Widget

Drop the snippet on whatever site you want to support (must be in the allowlist):

```html
<script src="https://YOUR-APP-DOMAIN/widget.js" async></script>
```

- The script injects a button + modal, styles it using the configured brand colour, and posts questions to `/api/query`.
- When the widget loads multiple times it deduplicates itself via a small guard.

## Testing & Quality Gates

| Command | Description |
| --- | --- |
| `npm run lint` | ESLint with Next.js flat config |
| `npm run build` | Production build check |
| `npm run test:e2e` | Playwright smoke test (auto-starts dev server on port 3100) |

CI (`.github/workflows/ci.yml`) runs all of the above on Node.js 20 and 22.

## Packaging for Release

The `package` script builds the project and bundles an artifact in `dist/` with the current date stamp.

```bash
npm run package
# -> dist/ai-faq-chatbot-YYYY-MM-DD.zip
```

The archive contains source files, public assets, tests, scripts, and config—ready to upload to an artefact store or hand off to ops. `dist/` is git-ignored.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Create a new Vercel project and select the repo.
3. Set the environment variables from `.env.example` in Vercel’s dashboard.
4. Deploy with the default **Next.js** preset.

Vercel will run `npm install`, `npm run build`, and host the serverless routes (`/api/*` and `/widget.js`). For persistent storage in production, replace the JSON files under `data/` with a managed database (not included here; see TODOs in code comments if you extend it).

## Troubleshooting

- **OpenAI key missing** – The app falls back gracefully, but you’ll see console warnings when the API is not configured.
- **Rate limit hits** – Increase `RATE_LIMIT_PER_MINUTE` or widen the origin allowlist.
- **Large ingests** – Default max pages is 10 (configurable to 25). Consider adding a queue or external vector store if you need scale.

## Repository Structure

```
├── src/app              # Next.js App Router routes & pages
│   ├── api              # Route handlers for ingestion, settings, query
│   ├── admin            # Admin UI
│   └── widget.js        # Embeddable widget script
├── src/lib              # Storage, ingestion, embeddings, security, RAG helpers
├── public               # Static assets & lightweight mock screenshots
├── tests/e2e            # Playwright smoke test
├── scripts              # Packaging & screenshot generation
├── .github/workflows    # CI pipeline (lint + build + e2e)
└── data                 # Runtime JSON store (created on demand, ignored by git)
```

## Next Steps

- Integrate a persistent vector store (e.g. pgvector, Pinecone) for multi-instance deployments.
- Extend the admin log with job statuses and durations.
- Add authentication or SSO to the admin surface for production environments.

Enjoy shipping your AI FAQ assistant!

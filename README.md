# AI FAQ Chatbot

[![CI](https://github.com/salman-chowdhury/ai-faq-chatbot/actions/workflows/ci.yml/badge.svg)](https://github.com/salman-chowdhury/ai-faq-chatbot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)

A personal full-stack retrieval-augmented generation prototype that ingests website and PDF content, retrieves relevant evidence, produces cited answers, and exposes both an admin dashboard and an embeddable support widget.

![Verified local landing page](public/evidence/landing.png)

[Case study: architecture, trade-offs, measured validation, and limitations](docs/case-study.md)

## What it demonstrates

- Document and website ingestion
- Chunking, embeddings and cosine-similarity retrieval
- Grounded answer generation with source citations
- Deterministic hash-vector fallback when no model API key is present
- Versioned RAG evaluation covering stale, conflicting, unanswerable and injected evidence
- Admin controls for sources, chunks, settings and logs
- Embeddable JavaScript support widget
- Rate limiting and optional admin-token protection
- Type checking, production builds and Playwright end-to-end tests in CI

## Architecture

```mermaid
flowchart LR
    Sources[PDFs and permitted webpages] --> Ingest[parse and chunk]
    Ingest --> Embed[Gemini or offline vectors]
    Embed --> Store[file-backed vector store]
    Query --> Retrieve[similarity retrieval]
    Store --> Retrieve
    Retrieve --> Answer[grounded answer and citations]
```

The file-backed store keeps the project easy to run and review. A production deployment should replace ephemeral serverless storage with a durable database or managed vector store.

## Stack

- Next.js App Router
- React 19 and TypeScript
- Tailwind CSS
- Google Gemini API
- SWR
- Zod
- Playwright

## Quick start

```bash
git clone https://github.com/salman-chowdhury/ai-faq-chatbot.git
cd ai-faq-chatbot
npm ci
cp .env.example .env.local
npm run dev -- --hostname 127.0.0.1
```

Open `http://localhost:3000` for the public experience and `http://localhost:3000/admin` for ingestion and administration.

### Environment variables

- `GEMINI_API_KEY` — optional Gemini embeddings and generation
- `ADMIN_TOKEN` — recommended for protecting admin APIs
- `STORAGE_DIR` — optional persistent-data path
- `RATE_LIMIT_PER_MINUTE` — request-rate override

Without `GEMINI_API_KEY`, the project remains usable in deterministic offline-demo mode. With no `ADMIN_TOKEN`, admin APIs are open for local review; configure a strong token before exposing the app publicly.

## Live demo

[Open the deployed application](https://ai-faq-chatbot-omega.vercel.app)

## Embed the widget

```html
<script
  src="https://your-domain.example/widget.js"
  data-api-url="https://your-domain.example/api/query"
  data-button-text="Need help?"
  data-title="Support assistant"
  data-placeholder="Ask us anything..."
  data-brand-color="#2563EB"
  async>
</script>
```

## Screenshots

### Landing page

![Landing page](public/evidence/landing.png)

### Admin dashboard

![Admin dashboard](public/evidence/admin.png)

### Offline demo

![Offline demo](public/evidence/demo.png)

## Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

GitHub Actions runs these checks against Node.js 20 and 22.

## Reproducible RAG evaluation

The safe v1 fixture requires no provider key. In one terminal:

```bash
npm run eval:prepare -- /tmp/ai-faq-evaluation-v1
env -u GEMINI_API_KEY STORAGE_DIR=/tmp/ai-faq-evaluation-v1 npm run dev -- --hostname 127.0.0.1 --port 3102
```

In a second terminal:

```bash
npm run eval:run -- http://127.0.0.1:3102
```

The committed [sample report](evaluation/reports/v1/report.md) records 8 measured cases: mean Precision@5 `0.7083`, Recall@5 `0.875`, reciprocal rank `0.875`, citation coverage `0.875`, grounding overlap `0.6119`, refusal correctness `1.0`, local p50 `3.83 ms`, and p95 `15.06 ms`. Provider token usage and cost were unavailable in deterministic fallback mode and are reported as unobserved rather than estimated.

## Reviewer entry points

- [RAG pipeline](src/lib/rag.ts) and [query route](src/app/api/query/route.ts): follow a request through retrieval and answer generation.
- [Playwright tests](tests/e2e/basic.spec.ts): inspect the actual browser checks.
- [Evaluation cases](evaluation/datasets/v1/cases.json): inspect stale, conflicting, unanswerable and injected evidence.
- [Recorded results and limitations](docs/case-study.md): the reported millisecond latency is local fallback timing, not Gemini inference latency or a production service-level objective.

## Current limitations

- The default vector store is file-backed rather than a production database.
- Serverless filesystems may be ephemeral.
- Lexical quality metrics cannot establish semantic correctness on their own.
- Website ingestion must still respect site permissions and terms.
- Prompt-injection filtering covers explicit instruction patterns, not every adversarial phrasing.

## Next engineering milestones

- Add a durable PostgreSQL/pgvector storage adapter
- Add metadata-aware reranking that demotes superseded documents
- Add semantic and human-reviewed correctness judgments
- Add structured tracing for ingestion, retrieval, latency and token usage

## Documentation

- [Installation guide](docs/install.md)
- [Deployment guide](docs/deploy.md)
- [Operations guide](docs/ops.md)

## License

MIT

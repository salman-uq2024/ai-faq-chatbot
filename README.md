# AI FAQ Chatbot

Production-ready Next.js application for turning product documentation into an embeddable AI assistant. It ingests websites or PDFs, chunks and embeds the content, and serves citations through a secure query API and widget.

- Gemini (or fallback) powered retrieval-augmented responses
- Admin dashboard for ingestion, branding, and widget config
- Per-origin/IP rate limiting plus strict origin allowlists
- Fully offline demo mode when API keys are absent

## Quickstart

```bash
npm install
cp .env.example .env.local    # optional – fill in Gemini settings
npm run dev
```

Visit `http://localhost:3000` for the marketing page + widget, and `http://localhost:3000/admin` to ingest documents. Use the admin form to crawl a docs site or add PDF URLs, then ask questions through the widget or `POST /api/query`.

## Project Commands

| Command | Description |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server (after build) |
| `npm run lint` | Lint with ESLint |
| `npm run test:e2e` | Playwright smoke test (installs browsers automatically) |
| `npm run package` | Build and zip release → `dist/ai-faq-chatbot-YYYY-MM-DD.zip` |

## Environment Variables

Copy `.env.example` to `.env.local` and edit as required.

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Enables Gemini-generated answers | unset (fallback mode) |
| `GEMINI_EMBEDDING_MODEL` | Gemini embed model for vector search | `models/embedding-001` |
| `RATE_LIMIT_PER_MINUTE` | Requests per minute per origin/IP | `30` |

Secrets are read server-side only. When keys are missing the app responds using stored knowledge snippets.

## Tests

Run linting and the Playwright smoke test:

```bash
npm run lint
npm run test:e2e
```

The e2e test verifies `/widget.js` is served. Browsers are installed on demand.

## Packaging

Create a distributable archive containing sources, configs, and assets:

```bash
npm run package
ls dist/
```

The script runs the production build and outputs `dist/ai-faq-chatbot-YYYY-MM-DD.zip`.

## Deployment

The app is optimised for Vercel’s free tier:

1. Push the repo to GitHub.
2. Import it in Vercel, keep the detected Next.js settings.
3. Set `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`, and `RATE_LIMIT_PER_MINUTE` (optional).
4. Deploy – Vercel handles build, tests, and static optimisation automatically.

Detailed instructions for setup, operations, and deployment live in:

- `docs/install.md`
- `docs/deploy.md`
- `docs/ops.md`

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 403 “Origin not allowed” | Add the origin in `/admin` → Allowlist |
| 429 “Rate limit exceeded” | Raise `RATE_LIMIT_PER_MINUTE` or slow requests |
| Widget shows fallback text | Provide a valid Gemini API key and redeploy |
| Ingestion errors | Review the admin toast + `data/ingestion-log.json` |

## License

MIT — see [LICENSE](LICENSE).

# Installation Guide

Follow these step-by-step instructions to set up the AI FAQ Chatbot locally. This guide assumes you are a beginner and provides all necessary details for a smooth setup.

## Prerequisites

Before starting, ensure you have the following installed:

- Node.js version 18 or higher (recommended: 20.x or 22.x LTS). Download from [nodejs.org](https://nodejs.org/).
- npm (comes with Node.js) or yarn as your package manager.
- Git for cloning the repository. Install from [git-scm.com](https://git-scm.com/).
- A Google Gemini API key (optional but recommended for AI embeddings and responses). Get one from [Google AI Studio](https://aistudio.google.com/app/apikey). The project stores chunks on disk by default; you can point that storage at another location with `STORAGE_DIR` or extend [src/lib/storage.ts](../src/lib/storage.ts) to integrate a managed vector store.
- Optional: An account for a vector store if replacing the default JSON-based storage.

Verify installations:
```bash
node --version
npm --version
git --version
```

## Step 1: Clone the Repository

Clone the project from GitHub:
```bash
git clone https://github.com/[your-username]/ai-faq-chatbot.git
cd ai-faq-chatbot
```

Replace `[your-username]` with the actual GitHub username or fork the repository if needed.

## Step 2: Install Dependencies

Install the required packages:
```bash
npm install
```
(Or `yarn install` if using Yarn.)

This sets up Next.js, TypeScript, and other dependencies listed in [package.json](package.json).

## Step 3: Configure Environment Variables

Create a local environment file by copying the example:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values. Key variables include:

- `GEMINI_API_KEY=your-gemini-api-key-here`: Required for AI embeddings and query responses using Google Gemini. Without this, the app falls back to similarity matching (see [src/lib/embedding.ts](../src/lib/embedding.ts)).
- `GEMINI_EMBEDDING_MODEL=models/embedding-001`: The Gemini model for generating embeddings (default if unset). If unavailable, the app tries `models/text-embedding-004` automatically.
- `ADMIN_TOKEN=change-me`: Optional bearer token that protects `/admin` APIs in production. Save it locally in the dashboard to authenticate requests.
- `STORAGE_DIR=/tmp/data`: Override the chunks location. Set this to `/tmp/data` on Vercel/Netlify or to a mounted volume when self-hosting.
- `GEMINI_FALLBACK_MODEL=models/gemini-2.0-flash`: Optional alternate model to try if your primary model isn’t enabled on your key.
- `RATE_LIMIT_PER_MINUTE=30`: Limits queries per minute to prevent abuse (configurable in [src/lib/security.ts](../src/lib/security.ts)).

Example `.env.local`:
```
GEMINI_API_KEY=AIzaSy...your-key
GEMINI_EMBEDDING_MODEL=models/embedding-001
ADMIN_TOKEN=change-me
STORAGE_DIR=/tmp/data
RATE_LIMIT_PER_MINUTE=30
```

For more variables, refer to the code in [src/lib/types.ts](../src/lib/types.ts).

## Step 4: Start the Development Server

Run the app in development mode:
```bash
npm run dev
```

The server starts at `http://localhost:3000`. 
- Visit `http://localhost:3000` for the landing page and widget demo.
- Access `http://localhost:3000/admin` for the admin dashboard to ingest content.

## Step 5: Ingest Initial Content

In the admin dashboard:
1. Enter a base URL (e.g., your FAQ site) or PDF URLs.
2. Set crawl depth (default: 2) and limits.
3. Click "Start Ingestion". Monitor the progress toast.

This processes content using the RAG pipeline (see [src/lib/ingest/pipeline.ts](../src/lib/ingest/pipeline.ts) and [src/lib/rag.ts](../src/lib/rag.ts)).

## Step 6: Test the Setup

Query the chatbot:
- Embed the widget on a test page or visit `/widget.js`.
- Or use curl:
```bash
curl -X POST http://localhost:3000/api/query \
  -H 'Content-Type: application/json' \
  -d '{"question": "What is RAG?"}'
```

Run tests to verify:
```bash
npm run lint
npm run typecheck
npm run test:e2e
```

For a quick start overview, see the [README.md](README.md).

## Troubleshooting

- **npm install fails**: Delete `node_modules` and `package-lock.json`, then retry `npm install`. Ensure Node.js is >=18.
- **Port 3000 in use**: Kill the process with `lsof -ti:3000 | xargs kill -9`, or change the port in `package.json` scripts (e.g., `npm run dev -- -p 3001`).
- **Missing TypeScript types**: Run `npm install @types/node --save-dev` and restart the dev server.
- **Ingestion errors**: Check console logs for API key issues. Verify URL accessibility and robots.txt (see [src/lib/ingest/crawl.ts](../src/lib/ingest/crawl.ts)).
- **No responses**: Ensure content is ingested and Gemini key is set. Fallback mode uses stored snippets only.

If issues persist, check the [ops.md](docs/ops.md) for advanced debugging.

(Word count: ~285)

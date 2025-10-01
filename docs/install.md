# Installation Guide

Follow these steps to set up the AI FAQ Chatbot locally.

## Prerequisites

- Node.js 20.x or 22.x (LTS)
- npm 10+
- (Optional) Google Gemini API key for cloud answers

## 1. Clone and Install

```bash
git clone https://github.com/PROJECT_NAME/ai-faq-chatbot.git
cd ai-faq-chatbot
npm install
```

## 2. Configure Environment

Copy the example configuration and fill in values as needed:

```bash
cp .env.example .env.local
```

Populate `.env.local` with:

```ini
GEMINI_API_KEY=your-api-key
GEMINI_EMBEDDING_MODEL=models/embedding-001
RATE_LIMIT_PER_MINUTE=30
```

All variables are optional. Without a Gemini key the app runs in fallback mode and still answers using stored snippets.

## 3. Start the Dev Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` for the public widget preview and `http://localhost:3000/admin` for the admin dashboard.

## 4. Ingest Content

From the admin dashboard:

1. Enter a base URL or list of PDF URLs.
2. Adjust crawl depth and limits as desired.
3. Click **Start ingestion** and wait for the confirmation toast.

Existing chunks from the same origin are replaced, keeping responses fresh.

## 5. Verify Queries

Use either the embedded widget or call the API directly:

```bash
curl -X POST http://localhost:3000/api/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"How do I embed the widget?"}'
```

If a Gemini key is configured the answer comes from the LLM; otherwise the fallback summariser responds using the stored snippets.

## 6. Run Tests

```bash
npm run lint
npm run test:e2e
```

Playwright installs browsers on first run and performs a smoke test against the running dev server.

# Deployment Guide

These steps deploy AI FAQ Chatbot to Vercel using the free tier.

## 1. Prerequisites

- GitHub repository containing this project
- Vercel account (free tier is sufficient)
- Optional: Gemini API key for production answers

## 2. Prepare Environment Variables

Create the following variables in Vercel > Project > Settings > Environment Variables:

| Variable | Description | Example |
| --- | --- | --- |
| `GEMINI_API_KEY` | (Optional) Google AI Studio API key | `AIza...` |
| `GEMINI_EMBEDDING_MODEL` | (Optional) Gemini embedding model ID | `models/embedding-001` |
| `RATE_LIMIT_PER_MINUTE` | Requests per minute per origin/IP | `30` |

Leave blanks if you want the hosted demo to run in fallback mode without calling Gemini.

## 3. Deploy via Vercel Dashboard

1. Click **Add New… → Project**.
2. Import the repository.
3. Accept the detected Next.js settings (build command `npm run build`, output `.next`).
4. Confirm environment variables and click **Deploy**.
5. Wait for the build to finish; Vercel will produce a live URL.

## 4. Post-Deployment Checks

- Visit `/admin` using the generated URL to ensure the dashboard loads.
- Submit a query through `/widget.js` (embed snippet or open `<deployment-url>/widget.js` to confirm the script renders). The API will respond even without Gemini credentials.
- Trigger a sample ingestion from `/admin`; ingested JSON files persist in Vercel’s ephemeral storage during runtime. For long-lived data replace `data/` with a managed store (see TODOs in README).

## 5. Automatic Previews

Future pull requests automatically receive preview deployments. Vercel uses the same environment variables configured in the dashboard unless overridden with Environment overrides.

## 6. Alternative Hosts

The app also runs on other Node-compatible hosts (Railway, Render). Configure build/start commands as:

- Build: `npm run build`
- Start: `npm run start`

Ensure the platform attaches persistent storage if you need durable JSON files.

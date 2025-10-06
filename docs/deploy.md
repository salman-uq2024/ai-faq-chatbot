# Deployment Guide

This guide provides step-by-step instructions for deploying the AI FAQ Chatbot to production. It focuses on Vercel (recommended for Next.js apps) but includes alternatives. Assumes beginner users; we'll cover prerequisites, environment setup, and common issues.

## Prerequisites

- A GitHub account with the project repository pushed (see [install.md](docs/install.md) for local setup).
- Vercel account (free tier works for starters). Sign up at [vercel.com](https://vercel.com).
- Google Gemini API key for production AI features (optional; get from [Google AI Studio](https://aistudio.google.com/app/apikey)).
- Optional: Accounts for alternative hosts like Netlify or Docker for self-hosting.
- Persistent storage setup if needed (e.g., mounted volume or managed vector DB). Use `STORAGE_DIR` to pick a writable location or extend [src/lib/storage.ts](../src/lib/storage.ts) to plug in an external store.

Verify GitHub repo is public or accessible.

## Step 1: Prepare and Push to GitHub

Ensure your code is committed and pushed:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

Replace `main` with your default branch if different.

## Step 2: Deploy to Vercel (Recommended)

Vercel offers serverless deployment, automatic scaling, and easy env var management.

### Using Vercel Dashboard
1. Log in to [vercel.com](https://vercel.com) and click **New Project**.
2. Import your GitHub repository (authorize Vercel if prompted).
3. Configure build settings (auto-detected for Next.js):
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. In **Environment Variables**, add the same vars as local (from `.env.local`):
   - `GEMINI_API_KEY=your-production-api-key`: For secure AI queries and embeddings.
   - `GEMINI_EMBEDDING_MODEL=models/embedding-001`: Model for vector embeddings (tries `models/text-embedding-004` if unavailable).
   - `GEMINI_FALLBACK_MODEL=models/gemini-2.0-flash`: Optional alternate generation model.
   - `ADMIN_TOKEN=generate-a-strong-token`: Protects `/admin` APIs. Paste this token into the dashboard when prompted.
   - `STORAGE_DIR=/tmp/data`: Required on Vercel/Netlify so chunk files persist for the lifetime of the function.
   - `RATE_LIMIT_PER_MINUTE=60`: Higher limit for production (adjust as needed).
   Add any production secrets, like database URLs.
5. Click **Deploy**. Vercel builds and deploys; you'll get a live URL (e.g., `your-app.vercel.app`).

### Using Vercel CLI (Alternative)
Install Vercel CLI if not present:
```bash
npm i -g vercel
```
Then:
1. ```bash
   vercel login
   ```
2. In project root:
   ```bash
   vercel --prod
   ```
3. Follow prompts to link repo and set env vars (same as above).

Deployment takes 1-2 minutes. Preview branches/PRs get auto-previews.

## Step 3: Post-Deployment Verification

- Visit `<your-url>/admin` to access the dashboard and trigger a test ingestion.
- Embed the widget: Add `<script src="<your-url>/widget.js"></script>` to a test page and query it.
- Test API: 
  ```bash
  curl -X POST https://your-url.vercel.app/api/query \
    -H 'Content-Type: application/json' \
    -d '{"question": "Test query"}'
  ```
- Check logs in Vercel dashboard for errors.

For monitoring and operations, see [ops.md](docs/ops.md).

## Alternatives

- **Netlify**: Connect GitHub repo in Netlify dashboard. Set build command to `npm run build` and publish directory to `.next`. Add env vars in site settings. Supports serverless functions for API routes.
- **Self-Hosting with Docker** (for VPS like DigitalOcean):
  1. Create `Dockerfile`:
     ```
     FROM node:20-alpine
     WORKDIR /app
     COPY . .
     RUN npm ci --only=production
     RUN npm run build
     ENV NODE_ENV=production
     EXPOSE 3000
     CMD ["npm", "start"]
     ```
  2. Build and run:
     ```bash
     docker build -t ai-faq-chatbot .
     docker run -p 3000:3000 -e GEMINI_API_KEY=your-key ai-faq-chatbot
     ```
  3. For production, use Docker Compose with persistent volumes for `data/`. Ensure HTTPS via reverse proxy (e.g., Nginx).

## Scaling Notes

- Vercel/Netlify use serverless functions for API routes (`/api/query`, `/api/admin/*`), auto-scaling queries without manual config.
- For high traffic, externalize storage to avoid ephemeral file limits (update [src/lib/storage.ts](../src/lib/storage.ts)).
- Ingestion jobs run on-demand; for large-scale, queue them (e.g., via Vercel Cron).

## Troubleshooting

- **Build fails**: Check [next.config.ts](next.config.ts) for image domains or plugins. Ensure all deps are in [package.json](package.json). Run `npm run build` locally to debug.
- **API routes return 404**: Confirm App Router setup in `src/app/api/` directories. Redeploy after fixes.
- **Ingestion errors**: Verify storage connection in [src/lib/storage.ts](../src/lib/storage.ts) and env vars. Check for rate limits in Gemini API.
- **Env vars not loading**: In Vercel, ensure vars are set for "Production" environment and redeploy.
- **Slow queries**: Optimize embeddings in [src/lib/embedding.ts](../src/lib/embedding.ts); consider vector DB for faster retrieval.

If issues persist, review console logs or consult [ops.md](docs/ops.md).

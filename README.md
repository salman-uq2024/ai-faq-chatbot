# AI FAQ Chatbot

[![GitHub stars](https://img.shields.io/github/stars/salman/ai-faq-chatbot?style=social)](https://github.com/salman/ai-faq-chatbot)
[![GitHub forks](https://img.shields.io/github/forks/salman/ai-faq-chatbot?style=social)](https://github.com/salman/ai-faq-chatbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/salman/ai-faq-chatbot/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-green?style=flat&logo=react)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-API-4285F4?style=flat&logo=google)](https://ai.google.dev/)

AI-Powered FAQ Chatbot: Ingest documents via RAG, query intelligently, with admin dashboard and embeddable widget.

![Demo](public/demo-landing.png)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Demo](#demo)
- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Secure document ingestion**: Parse PDFs and crawl websites to build a knowledge base securely.
- **Intelligent querying**: Use embeddings and Retrieval-Augmented Generation (RAG) for accurate, context-aware responses.
- **Admin panel**: Manage ingestion, view logs, and configure settings via an intuitive dashboard.
- **Embeddable JavaScript widget**: Easily integrate the chatbot into any website with a lightweight script.
- **Production-ready**: Built with TypeScript, Tailwind CSS, and Playwright end-to-end tests for reliability.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [React](https://react.dev) 19 with [SWR](https://swr.vercel.app)
- [TypeScript](https://www.typescriptlang.org) for type safety
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Google Gemini API](https://ai.google.dev/) for embeddings and grounded responses (with offline fallback vectors). Default generation model is `models/gemini-2.0-flash`. You can change it in the Admin settings and the app will also try a fallback if the primary isn’t enabled for your key.
- File-based vector storage configurable via `STORAGE_DIR`, ready to swap for hosted options

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm (or yarn/pnpm)

### Installation

```bash
git clone https://github.com/salman/ai-faq-chatbot.git
cd ai-faq-chatbot
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and configure:

- `GEMINI_API_KEY`: Google Gemini API key used for embeddings and responses. Without it the app falls back to offline TF-IDF answers.
- `ADMIN_TOKEN`: Optional bearer token that locks down `/admin` APIs in production.
- `STORAGE_DIR`: Optional path override for chunk storage (set to `/tmp/data` on serverless hosts like Vercel).
- `RATE_LIMIT_PER_MINUTE`: Override the default per-origin rate limit.

For demo mode without keys, the app uses hashed TF-IDF style vectors to return stored snippets.

### Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the landing page and widget. Access the admin at [http://localhost:3000/admin](http://localhost:3000/admin) to ingest documents.

For full installation details, see [docs/install.md](docs/install.md).

## Demo

**Live Demo**: [TBD - Deployed on Vercel](https://ai-faq-chatbot.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/salman/ai-faq-chatbot&env=GEMINI_API_KEY,ADMIN_TOKEN,RATE_LIMIT_PER_MINUTE,STORAGE_DIR&envDescription=Set%20required%20environment%20variables%20for%20production%20usage.)

### Embed the Widget

Add this script to your website's `<head>` or `<body>`:

```html
<script src="https://yourdomain.com/widget.js"
        data-api-url="https://yourdomain.com/api/query"
        data-button-text="Need help?"
        data-brand-color="#2563EB"
        async></script>
```

Customize via admin settings for branding and behavior.

## Screenshots

### Landing Page
![Landing Demo](public/demo-landing.png)

### Admin Dashboard
![Admin Demo](public/demo-admin.png)

## How It Works

The chatbot uses a Retrieval-Augmented Generation (RAG) pipeline:

1. **Ingestion**: Parse PDFs or crawl web pages, chunk text, generate embeddings with Google Gemini (or fallback vectors offline), and store them locally or in your data store.
2. **Querying**: Embed user questions, retrieve relevant chunks via cosine similarity, augment prompts, and generate responses with citations.

For implementation details, explore [src/lib](src/lib) (e.g., [embedding.ts](src/lib/embedding.ts), [rag.ts](src/lib/rag.ts)).

## Deployment

Deploy seamlessly to Vercel with one click:

1. Push to GitHub.
2. Connect to Vercel and import the repo.
3. Add environment variables:
   - `GEMINI_API_KEY`
   - `ADMIN_TOKEN` (recommended for production dashboards)
   - `STORAGE_DIR=/tmp/data` (required on serverless platforms)
   - `RATE_LIMIT_PER_MINUTE`
4. Deploy – automatic builds and optimizations included.

For advanced setup, see [docs/deploy.md](docs/deploy.md).

## Contributing

Contributions are welcome! Please:

- Fork the repo and create a feature branch.
- Run `npm run lint`, `npm run typecheck`, and `npm run test:e2e` before submitting.
- Open a PR with a clear description.

For operations and FAQs, refer to [docs/ops.md](docs/ops.md).

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE).

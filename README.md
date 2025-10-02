# AI FAQ Chatbot

[![GitHub stars](https://img.shields.io/github/stars/salman/ai-faq-chatbot?style=social)](https://github.com/salman/ai-faq-chatbot)
[![GitHub forks](https://img.shields.io/github/forks/salman/ai-faq-chatbot?style=social)](https://github.com/salman/ai-faq-chatbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/salman/ai-faq-chatbot/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-green?style=flat&logo=react)](https://react.dev)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-orange?style=flat&logo=openai)](https://openai.com)

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
- **Production-ready**: Built with TypeScript, shadcn/ui components, and Playwright end-to-end tests for reliability.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router, Server Actions)
- [React](https://react.dev) with [shadcn/ui](https://ui.shadcn.com)
- [TypeScript](https://www.typescriptlang.org) for type safety
- [Tailwind CSS](https://tailwindcss.com) for styling
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings) for vector representations
- In-memory vector storage with plans for scalable options like Pinecone

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

- `OPENAI_API_KEY`: Your OpenAI API key for embeddings and generation.
- Other vars: See `.env.example` for rate limiting, etc.

For demo mode without keys, the app uses mock responses.

### Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the landing page and widget. Access the admin at [http://localhost:3000/admin](http://localhost:3000/admin) to ingest documents.

For full installation details, see [docs/install.md](docs/install.md).

## Demo

**Live Demo**: [TBD - Deployed on Vercel](https://ai-faq-chatbot.vercel.app)

### Embed the Widget

Add this script to your website's `<head>` or `<body>`:

```html
<script src="https://yourdomain.com/widget.js" 
        data-api-url="https://yourdomain.com/api/query" 
        data-origin="yourdomain.com">
</script>
<div id="chatbot-widget"></div>
```

Customize via admin settings for branding and behavior.

## Screenshots

### Landing Page
![Landing Demo](public/demo-landing.png)

### Admin Dashboard
![Admin Demo](public/demo-admin.png)

### Query Flow
![Query Flow](public/demo-query.png) <!-- Placeholder: Generate if needed via scripts/generate-demo-images.mjs -->

### Widget Embed
![Widget Embed](public/demo-widget.png) <!-- Placeholder: Generate if needed -->

## How It Works

The chatbot uses a Retrieval-Augmented Generation (RAG) pipeline:

1. **Ingestion**: Parse PDFs or crawl web pages, chunk text, generate embeddings with OpenAI, and store vectors locally (or in a DB).
2. **Querying**: Embed user questions, retrieve relevant chunks via similarity search, augment prompts, and generate responses with citations.

For implementation details, explore [src/lib](src/lib) (e.g., [embedding.ts](src/lib/embedding.ts), [rag.ts](src/lib/rag.ts)).

## Deployment

Deploy seamlessly to Vercel with one click:

1. Push to GitHub.
2. Connect to Vercel and import the repo.
3. Add environment variables (e.g., `OPENAI_API_KEY`).
4. Deploy – automatic builds and optimizations included.

For advanced setup, see [docs/deploy.md](docs/deploy.md).

## Contributing

Contributions are welcome! Please:

- Fork the repo and create a feature branch.
- Run `npm run lint` and `npm run test:e2e` before submitting.
- Open a PR with a clear description.

For operations and FAQs, refer to [docs/ops.md](docs/ops.md).

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE).
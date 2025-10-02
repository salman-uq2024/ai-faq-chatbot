import { addChunks, getChunks } from "@/lib/storage";
import { embedTexts } from "@/lib/embedding";
import Image from "next/image";
import { DemoClient } from "./client";

const sampleChunksData = [
  {
    id: "demo-1",
    sourceUrl: "demo://faq/rag",
    title: "What is Retrieval-Augmented Generation (RAG)?",
    content: "Retrieval-Augmented Generation (RAG) is a technique that combines information retrieval with generative AI models. It works by first retrieving relevant documents or chunks from a knowledge base using similarity search on embeddings, then passing those as context to a large language model (LLM) to generate accurate, grounded responses. This approach reduces hallucinations and ensures answers are based on provided data.",
  },
  {
    id: "demo-2",
    sourceUrl: "demo://faq/chatbot",
    title: "How does the AI FAQ Chatbot work?",
    content: "The AI FAQ Chatbot is built with Next.js and TypeScript. It ingests documentation, PDFs, or web pages via a crawler or direct upload, processes them into chunks, generates embeddings using Google Gemini or fallback methods, and stores them locally. When a user queries, it retrieves the top similar chunks using cosine similarity, then uses an LLM (or TF-IDF fallback without keys) to generate responses with citations.",
  },
  {
    id: "demo-3",
    sourceUrl: "demo://faq/security",
    title: "What security features does the chatbot include?",
    content: "Security is prioritized: Origin allowlists prevent unauthorized access, per-origin rate limiting avoids abuse, and all API calls to the LLM are server-side to protect keys. Embeddings and chunks are stored locally without external dependencies unless keys are provided. For demos, it falls back to offline TF-IDF search without needing API keys.",
  },
  {
    id: "demo-4",
    sourceUrl: "demo://faq/install",
    title: "How to install and run the AI FAQ Chatbot?",
    content: "To get started: 1. Clone the repository. 2. Copy .env.example to .env.local and add your GEMINI_API_KEY if desired (optional for demo). 3. Run 'npm install'. 4. Start the dev server with 'npm run dev'. 5. Visit /admin to ingest docs, or try the /demo page for a quick showcase. Deploy to Vercel for live use.",
  },
  {
    id: "demo-5",
    sourceUrl: "demo://faq/embed",
    title: "How to embed the chatbot widget?",
    content: "Embed the chatbot on any site by adding a script tag: <script src='https://your-vercel-app.vercel.app/widget.js' async></script>. Customize branding via the admin panel. The widget launches a floating chat interface that queries your ingested knowledge base securely.",
  },
];

async function addDemoChunksIfEmpty() {
  const chunks = await getChunks();
  if (chunks.length === 0) {
    const contents = sampleChunksData.map((data) => data.content);
    const embeddings = await embedTexts(contents);
    const chunksWithEmbeddings = sampleChunksData.map((data, index) => ({
      ...data,
      embedding: embeddings[index],
      tokens: contents[index].split(/\s+/).length, // Approximate
      createdAt: new Date().toISOString(),
    }));
    await addChunks(chunksWithEmbeddings);
  }
}

export default async function DemoPage() {
  await addDemoChunksIfEmpty();

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Demo the AI FAQ Chatbot
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Interact with a self-contained demo using sample FAQs about AI chatbots and RAG. No API keys required—uses offline fallback.
            For full functionality, set your GEMINI_API_KEY in .env.local.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <DemoClient />
          </div>

          <div className="space-y-6">
            <Image
              src="/demo-landing.png"
              alt="AI FAQ Chatbot demo"
              width={640}
              height={360}
              className="rounded-lg shadow-lg w-full h-auto"
            />
            <p className="text-sm text-slate-500 text-center">
              See more screenshots in <code>public/</code> or deploy to Vercel for live interaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
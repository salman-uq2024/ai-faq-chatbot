import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedTexts, cosineSimilarity } from "./embedding";
import { buildSnippet, cleanText } from "./text";
import { getChunks, getSettings } from "./storage";
import type { Chunk, QueryResult } from "./types";

const MAX_SOURCE_COUNT = 5;
const MIN_RELEVANCE_SCORE = 0.12;
const MAX_BULLETS = 2;
const SYSTEM_PROMPT =
  "You are a documentation assistant. Answer using only the provided sources and cite source numbers inline as [S1], [S2], etc.";
const GREETING_PATTERNS = [/^hi$/i, /^hello$/i, /^hey$/i, /^(good\s+(morning|afternoon|evening))$/i];
const GREETING_FILLER = new Set(["there", "team", "bot"]);
const NOISE_PATTERNS = [
  /read\s+more/i,
  /subscribe/i,
  /search\s+documentation/i,
  /cookies?/i,
  /privacy\s+policy/i,
  /\b⌘k\b/i,
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  /\b\d{4}\b/,
];
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "your",
  "about",
  "into",
  "when",
  "have",
  "this",
  "will",
  "what",
  "does",
  "then",
  "been",
  "make",
  "sure",
  "is",
  "are",
  "was",
  "were",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "it",
  "as",
]);

function isPureGreeting(question: string): boolean {
  const normalized = question
    .toLowerCase()
    .replace(/[!?.,:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  // Short-circuit exact matches like "hi", "hello", etc.
  if (GREETING_PATTERNS.some((p) => p.test(normalized))) return true;
  // Token-based check: only greetings + optional filler like "there"
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length > 3) return false;
  return tokens.every((t) => GREETING_FILLER.has(t) || ["hi", "hello", "hey", "good", "morning", "afternoon", "evening"].includes(t));
}

let geminiClient: GoogleGenerativeAI | null = null;

function getGemini(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

type RankedChunk = {
  chunk: Chunk;
  score: number;
};

function rankChunks(question: string, questionEmbedding: number[], chunks: Chunk[]): RankedChunk[] {
  return chunks
    .map((chunk) => {
      const cos = cosineSimilarity(chunk.embedding, questionEmbedding);
      const overlap = lexicalOverlap(question, chunk.content);
      const normalizedOverlap = Math.min(overlap, 5) / 5; // 0..1 boost from token overlap
      const combined = 0.8 * cos + 0.2 * normalizedOverlap;
      return { chunk, score: combined };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCE_COUNT);
}

function filterRelevant(chunks: RankedChunk[]): RankedChunk[] {
  return chunks.filter(({ score }) => Number.isFinite(score) && score >= MIN_RELEVANCE_SCORE);
}

function dedupeBySource(chunks: RankedChunk[]): RankedChunk[] {
  const seen = new Set<string>();
  const deduped: RankedChunk[] = [];
  for (const entry of chunks) {
    if (seen.has(entry.chunk.sourceUrl)) {
      continue;
    }
    seen.add(entry.chunk.sourceUrl);
    deduped.push(entry);
    if (deduped.length >= MAX_SOURCE_COUNT) {
      break;
    }
  }
  return deduped;
}

function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  const expanded: string[] = [];
  for (const t of base) {
    expanded.push(t);
    // Expand common tech tokens: nextjs -> next, js
    if (t.endsWith("js") && t.length > 4) {
      const root = t.slice(0, -2);
      if (root && !STOP_WORDS.has(root)) expanded.push(root);
      expanded.push("js");
    }
  }
  return Array.from(new Set(expanded));
}

function lexicalOverlap(question: string, content: string): number {
  const q = new Set(tokenize(question));
  if (q.size === 0) return 0;
  let overlap = 0;
  for (const token of tokenize(content)) {
    if (q.has(token)) overlap += 1;
  }
  return overlap;
}

function normalizeQuestion(question: string): string {
  return question.replace(/^[^a-z0-9]+/i, "").trim();
}

function inferTopic(question: string): string | null {
  const q = normalizeQuestion(question).toLowerCase();
  const patterns: Array<RegExp> = [
    /^what\s+is\s+(.+?)\??$/, // what is X
    /^tell\s+me\s+about\s+(.+?)\.?$/, // tell me about X
    /^explain\s+(.+?)\.?$/,
    /^describe\s+(.+?)\.?$/,
    /^what\s+(.+?)\??$/, // what X
    /^(.+?)\s+give\s+me\s+details\.?$/, // X give me details
  ];
  for (const p of patterns) {
    const m = q.match(p);
    if (m && m[1]) {
      return m[1].trim();
    }
  }
  return null;
}

function topicSynonymTokens(topic: string): string[] {
  const base = tokenize(topic).filter(Boolean);
  // Special handling for "next js" variants
  const joined = base.join(" ");
  if (/^next\s*\.?\s*js$/.test(joined) || base.includes("nextjs")) {
    return ["next", "js", "nextjs", "nextjs"]; // include variants
  }
  return base;
}

function containsTopic(topic: string, text: string): boolean {
  const tokens = new Set(topicSynonymTokens(topic));
  if (tokens.size === 0) return true;
  const sentenceTokens = new Set(tokenize(text));
  let hits = 0;
  for (const t of tokens) if (sentenceTokens.has(t)) hits += 1;
  return hits >= Math.min(2, tokens.size);
}

function trimToSentence(text: string, max = 480): string {
  if (text.length <= max) return text;
  const cutoff = text.slice(0, max);
  const idx = Math.max(cutoff.lastIndexOf("."), cutoff.lastIndexOf("!"), cutoff.lastIndexOf("?"));
  if (idx > 40) {
    return cutoff.slice(0, idx + 1);
  }
  return `${cutoff.trim()}…`;
}

function selectRelevantSentences(question: string, content: string, limit = 2): string[] {
  const sanitized = cleanText(content);
  if (!sanitized) {
    return [];
  }

  const sentences = sanitized
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    // Length heuristics to avoid one-word fragments or very long lists
    .filter((s) => {
      const wc = s.split(/\s+/).filter(Boolean).length;
      return wc >= 6 && wc <= 40;
    });
  if (sentences.length === 0) {
    return [];
  }

  const queryTokens = new Set(tokenize(question));
  if (queryTokens.size === 0) {
    return sentences.slice(0, limit).map((sentence) => sentence.trim());
  }

  const scored = sentences
    .filter((s) => !NOISE_PATTERNS.some((p) => p.test(s)))
    .map((sentence) => {
      const sentenceTokens = tokenize(sentence);
      const overlap = sentenceTokens.reduce(
        (total, token) => (queryTokens.has(token) ? total + 1 : total),
        0,
      );
      return { sentence: sentence.trim(), overlap };
    })
    .filter((item) => item.overlap > 0);

  if (scored.length === 0) {
    return sentences.slice(0, limit).map((sentence) => sentence.trim());
  }

  return scored
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((item) => item.sentence);
}

function formatStructuredFallbackAnswer(question: string, ranked: RankedChunk[]): string {
  if (ranked.length === 0) {
    return "I couldn’t find anything in the current knowledge base about that question.";
  }

  // Collect candidate sentences from top sources
  const top = ranked.slice(0, MAX_BULLETS);
  const candidates: Array<{ text: string; score: number }> = [];
  const topic = inferTopic(question);
  for (const { chunk } of top) {
    const picks = selectRelevantSentences(question, chunk.content, 5)
      .filter((s) => (topic ? containsTopic(topic, s) : true));
    for (const s of picks) {
      candidates.push({ text: s, score: lexicalOverlap(question, s) });
    }
  }

  // Dedupe and sort by lexical overlap
  const seen = new Set<string>();
  const unique = candidates
    .filter((c) => {
      const key = c.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map((c) => c.text);

  // Prefer a definition-like sentence if topic is known
  let definition: string | null = null;
  if (topic) {
    const topicTokens = topicSynonymTokens(topic);
    const topicPattern = new RegExp(`\\b${topicTokens.join("\\b|\\b")}\\b`, "i");
    definition = unique.find((s) => topicPattern.test(s) && /\bis\b/i.test(s)) ?? null;
  }

  // Build overview paragraph: definition (if any) + best complements
  const complementCandidates = unique.filter((s) => s !== definition);
  const overviewSentences = [definition, ...complementCandidates].filter(Boolean).slice(0, 3) as string[];
  const overview = trimToSentence(overviewSentences.join(" "), 480);

  // Optional highlights (next 1-2 sentences)
  const highlights = unique.slice(3, 5).map((s) => `• ${buildSnippet(s, 220)}`);

  const header = `Here’s a summary related to “${question}”:`;
  const parts = [header, "", overview];
  if (highlights.length) {
    parts.push("", "Highlights:");
    parts.push(...highlights);
  }
  return parts.join("\n");
}

export async function runRagPipeline(question: string): Promise<QueryResult> {
  if (isPureGreeting(question)) {
    return {
      answer: "Hi there! Ask me about the topics we’ve ingested, or let me know what you’d like to learn.",
      sources: [],
    };
  }

  const chunks = await getChunks();
  if (chunks.length === 0) {
    return {
      answer: "No knowledge base has been ingested yet.",
      sources: [],
    };
  }

  const [questionEmbedding] = await embedTexts([question]);
  const ranked = rankChunks(question, questionEmbedding, chunks);
  const filtered = filterRelevant(ranked).filter(({ chunk }) => lexicalOverlap(question, chunk.content) > 0);
  const relevant = dedupeBySource(filtered);

  if (relevant.length === 0) {
    return {
      answer: "I couldn’t find information about that. Try rephrasing your question or ingesting more relevant content.",
      sources: [],
    };
  }

  const settings = await getSettings();
  const sources = relevant.map(({ chunk, score }) => ({
    id: chunk.id,
    title: chunk.title,
    url: chunk.sourceUrl,
    snippet: buildSnippet(chunk.content),
    score,
  }));

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (!hasGemini) {
    return {
      answer: formatStructuredFallbackAnswer(question, relevant),
      sources,
    };
  }

  const client = getGemini();
  if (!client) {
    return {
      answer: "LLM client could not be initialised.",
      sources,
    };
  }

  const context = relevant
    .map(({ chunk }, index) => `Source ${index + 1}: ${chunk.title}\n${chunk.content}`)
    .join("\n\n");

  const candidateModels = [
    settings.model,
    process.env.GEMINI_FALLBACK_MODEL || "models/gemini-2.0-flash",
    "models/gemini-flash-latest",
    "models/gemini-2.5-flash",
  ].filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i) as string[];

  for (const modelId of candidateModels) {
    try {
      const model = client.getGenerativeModel({
        model: modelId,
        systemInstruction: {
          role: "system",
          parts: [{ text: SYSTEM_PROMPT }],
        },
      });
      const response = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Question: ${question}\n\nContext:\n${context}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: settings.maxTokens,
          temperature: 0.2,
        },
      });
      const text = response.response?.text() ?? "";
      if (text && text.trim()) {
        return { answer: text, sources };
      }
    } catch {
      // Try next model in sequence
      console.warn(`Model ${modelId} failed, trying next if available.`);
      continue;
    }
  }

  return {
    answer: formatStructuredFallbackAnswer(question, relevant),
    sources,
  };
}

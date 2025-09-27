export type Chunk = {
  id: string;
  sourceUrl: string;
  title: string;
  content: string;
  embedding: number[];
  tokens: number;
  createdAt: string;
};

export type SourceIngestRequest = {
  baseUrl?: string;
  crawlDepth?: number;
  maxPages?: number;
  pdfUrls?: string[];
  chunkSize?: number;
  chunkOverlap?: number;
};

export type AppSettings = {
  model: string;
  maxTokens: number;
  brandColor: string;
  allowOrigins: string[];
};

export type QueryRequest = {
  question: string;
  origin?: string;
};

export type QueryResult = {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    snippet: string;
    score: number;
  }>;
};

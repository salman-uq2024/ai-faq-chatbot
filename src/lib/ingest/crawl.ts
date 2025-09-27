import { load } from "cheerio";
import { htmlToText } from "../text";

type CrawlTarget = {
  url: string;
  depth: number;
};

type CrawlOptions = {
  baseUrl: string;
  maxPages: number;
  maxDepth: number;
};

export type PageDocument = {
  url: string;
  title: string;
  text: string;
  html: string;
};

function isSameOrigin(baseUrl: string, candidateUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const candidate = new URL(candidateUrl, baseUrl);
    return base.origin === candidate.origin;
  } catch {
    return false;
  }
}

function normalizeUrl(baseUrl: string, candidate: string): string | null {
  try {
    const url = new URL(candidate, baseUrl);
    url.hash = "";
    if (!isSameOrigin(baseUrl, url.toString())) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<PageDocument | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AI-FAQ-Chatbot-Crawler/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();
    const $ = load(html);
    const title = $("title").first().text().trim() || url;
    const text = htmlToText(html);
    
    if (!text) {
      return null;
    }

    return { url, title, text, html };
  } catch (error) {
    console.error(`Failed to fetch ${url}`, error);
    return null;
  }
}

export async function crawlSite(options: CrawlOptions): Promise<PageDocument[]> {
  const { baseUrl, maxPages, maxDepth } = options;
  const queue: CrawlTarget[] = [{ url: baseUrl, depth: 0 }];
  const visited = new Set<string>();
  const documents: PageDocument[] = [];

  while (queue.length > 0 && documents.length < maxPages) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (visited.has(current.url) || current.depth > maxDepth) {
      continue;
    }

    visited.add(current.url);
    const page = await fetchPage(current.url);
    if (!page) {
      continue;
    }
    documents.push(page);

    const $ = load(page.html);
    const links = new Set<string>();

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) {
        return;
      }
      const normalized = normalizeUrl(baseUrl, href);
      if (!normalized || visited.has(normalized)) {
        return;
      }
      links.add(normalized);
    });

    for (const link of links) {
      if (documents.length + queue.length >= maxPages) {
        break;
      }
      queue.push({ url: link, depth: current.depth + 1 });
    }
  }

  return documents;
}

import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import { HttpFetchError, SelectorMismatchError } from "./errors";

export type SelectorConfig = {
  title: string[];
  content: string[];
  image: string[];
};

export const DEFAULT_SELECTORS: SelectorConfig = {
  title: ["meta[property='og:title']", "h1", "title"],
  content: ["article", "main", "div#content", "div.article-body", "body"],
  image: ["meta[property='og:image']", "img"]
};

export type ScrapeResult = {
  title: string;
  summary: string;
  content: string;
  imageUrl: string | null;
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "i", "b",
    "ul", "ol", "li", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img", "figure", "figcaption", "pre", "code", "hr"
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title"]
  },
  allowedSchemes: ["http", "https", "mailto"]
};

export async function fetchHtml(url: string, userAgent: string, timeoutMs = 15_000): Promise<string> {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal
    });
  } catch (err) {
    throw new HttpFetchError(`Network error fetching ${url}: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new HttpFetchError(`404 Not Found: ${url}`, { status: 404, retryable: false });
  }
  if (!response.ok) {
    throw new HttpFetchError(`HTTP ${response.status} fetching ${url}`, { status: response.status });
  }
  return await response.text();
}

function firstMatch($: cheerio.CheerioAPI, selectors: string[], attr?: string): string | null {
  for (const selector of selectors) {
    const node = $(selector).first();
    if (node.length === 0) continue;
    const value = attr ? node.attr(attr) : node.text();
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function extractFromHtml(html: string, selectors: SelectorConfig = DEFAULT_SELECTORS): ScrapeResult {
  const $ = cheerio.load(html);

  const title =
    firstMatch($, ["meta[property='og:title']", "meta[name='twitter:title']"], "content") ??
    firstMatch($, selectors.title);
  if (!title) {
    throw new SelectorMismatchError("Title selector did not match");
  }

  let contentHtml: string | null = null;
  for (const selector of selectors.content) {
    const node = $(selector).first();
    if (node.length === 0) continue;
    const html = node.html();
    if (html && html.trim()) {
      contentHtml = html;
      break;
    }
  }
  if (!contentHtml) {
    throw new SelectorMismatchError("Content selector did not match");
  }

  const sanitized = sanitizeHtml(contentHtml, SANITIZE_OPTIONS).trim();
  if (!sanitized) {
    throw new SelectorMismatchError("Content was empty after sanitization");
  }

  const imageUrl =
    firstMatch($, ["meta[property='og:image']", "meta[name='twitter:image']"], "content") ??
    firstMatch($, ["img"], "src");

  const summarySource = sanitized.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const summary = summarySource.length > 480 ? `${summarySource.slice(0, 477)}...` : summarySource || title;

  return {
    title: title.slice(0, 200),
    summary: summary.slice(0, 500),
    content: sanitized,
    imageUrl: imageUrl ? imageUrl.slice(0, 500) : null
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || "article";
}

export type ArticleEmbeddingInput = {
  articleId: number;
  title: string;
  summary: string;
  description: string;
  source?: string | null;
  category?: string | null;
  language?: string | null;
  publishedAt?: Date | string | null;
  indexVersion?: number;
};

export type ArticleEmbeddingPayload = {
  articleId: number;
  text: string;
  payload: {
    articleId: number;
    indexVersion: number;
    title: string;
    summary: string;
    category: string;
    publishedAt: string;
    source: string;
    language: string;
  };
};

function normalizeText(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return new Date(0).toISOString();
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export function buildArticleEmbeddingPayload(input: ArticleEmbeddingInput): ArticleEmbeddingPayload {
  const title = normalizeText(input.title);
  const summary = normalizeText(input.summary);
  const description = normalizeText(input.description);
  const source = normalizeText(input.source || "unknown");
  const category = normalizeText(input.category || "uncategorized");
  const language = normalizeText(input.language || "vi");

  const sections = [
    `title: ${title}`,
    `summary: ${summary}`,
    `description: ${description}`,
    `source: ${source}`
  ];

  return {
    articleId: input.articleId,
    text: sections.join("\n"),
    payload: {
      articleId: input.articleId,
      indexVersion: input.indexVersion ?? 1,
      title,
      summary,
      category,
      publishedAt: toIsoString(input.publishedAt),
      source,
      language
    }
  };
}

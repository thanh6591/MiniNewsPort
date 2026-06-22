import { PDFParse } from "pdf-parse";
import { db } from "~/server/db/client";
import { categories } from "~/server/db/schema";
import { importService } from "~/server/services/import.service";
import { eq } from "drizzle-orm";

/**
 * Parse the PDF table format:
 * Chuyên mục | Tiêu đề bài viết | Đường dẫn (URL)
 *
 * Rows are extracted by finding lines that contain a URL pattern.
 * The category is carried forward until a new one is seen.
 */
function parsePdfTable(text: string): Array<{ categoryName: string; url: string }> {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: Array<{ categoryName: string; url: string }> = [];
  let currentCategory = "";

  for (const line of lines) {
    const urls = line.match(urlPattern);

    if (urls) {
      // Line contains URL(s) — extract first valid URL
      const url = urls[0].replace(/[.,;)]+$/, "");

      // The category might be prepended before the URL on the same line,
      // or set by a preceding non-URL line. Try to detect it inline.
      const beforeUrl = line.slice(0, line.indexOf(url)).trim();
      // Remove the title portion heuristically: category words are short (<30 chars) and appear at start
      const parts = beforeUrl.split(/\s{2,}/);
      const possibleCat = parts[0]?.trim();
      if (possibleCat && possibleCat.length > 0 && possibleCat.length <= 50 && !/https?:/.test(possibleCat)) {
        currentCategory = possibleCat;
      }

      if (currentCategory && url) {
        rows.push({ categoryName: currentCategory, url });
      }
    } else if (line.length <= 50 && !/^\d+$/.test(line)) {
      // Short non-URL line is likely a category header
      currentCategory = line;
    }
  }

  return rows;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

async function upsertCategory(name: string): Promise<number> {
  const slug = slugify(name);

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const inserted = await db
    .insert(categories)
    .values({ name, slug, createdAt: new Date(), updatedAt: new Date() })
    .returning({ id: categories.id });

  return inserted[0].id;
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const form = await readMultipartFormData(event);
  const filePart = form?.find((p) => p.name === "file");

  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: "Missing PDF file (field: file)" });
  }

  let text: string;
  try {
    const parser = new PDFParse({ data: filePart.data });
    const parsed = await parser.getText();
    text = parsed.text;
  } catch {
    throw createError({ statusCode: 422, statusMessage: "Could not parse PDF" });
  }

  const rows = parsePdfTable(text);
  if (rows.length === 0) {
    throw createError({ statusCode: 422, statusMessage: "No URL rows found in PDF table" });
  }

  // Group URLs by category name
  const byCategory = new Map<string, string[]>();
  for (const { categoryName, url } of rows) {
    const list = byCategory.get(categoryName) ?? [];
    list.push(url);
    byCategory.set(categoryName, list);
  }

  const results: Array<{ categoryName: string; batchId: number; acceptedCount: number; skippedCount: number }> = [];

  for (const [categoryName, urls] of byCategory.entries()) {
    const categoryId = await upsertCategory(categoryName);
    const result = await importService.submitBulk({ urls, categoryId });
    results.push({ categoryName, ...result });
  }

  setResponseStatus(event, 202);
  return {
    totalRows: rows.length,
    batches: results
  };
});

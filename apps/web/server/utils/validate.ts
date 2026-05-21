import { z, ZodSchema } from "zod";
import { H3Event, readBody, getQuery, getRouterParams } from "h3";
import { ValidationError } from "../services/errors";

type ValidationTarget = {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
};

type ValidationHint = {
  expected: string;
  example: string;
};

const validationHints: Record<string, ValidationHint> = {
  title: {
    expected: "non-empty string, max 200 characters",
    example: "Politics: policy reform insight #1"
  },
  slug: {
    expected: "non-empty string, max 220 characters",
    example: "politics-policy-reform-1"
  },
  summary: {
    expected: "non-empty string, max 500 characters",
    example: "Short summary of the article in one or two sentences."
  },
  content: {
    expected: "non-empty string",
    example: "Full article content with paragraphs."
  },
  imageUrl: {
    expected: "valid URL or null",
    example: "https://picsum.photos/seed/politics-1/1200/675"
  },
  status: {
    expected: '"DRAFT" or "PUBLISHED"',
    example: "PUBLISHED"
  },
  publishedAt: {
    expected: "ISO date-time string or null",
    example: "2026-05-21T03:00:00.000Z"
  },
  categoryId: {
    expected: "positive integer",
    example: "9"
  },
  page: {
    expected: "positive integer",
    example: "1"
  },
  limit: {
    expected: "positive integer <= 100",
    example: "20"
  },
  id: {
    expected: "positive integer",
    example: "161"
  }
};

export async function validate(
  event: H3Event,
  schemas: ValidationTarget
): Promise<{
  body?: unknown;
  query?: unknown;
  params?: unknown;
}> {
  const result: { body?: unknown; query?: unknown; params?: unknown } = {};
  const details: Array<{ field: string; message: string; expected?: string; example?: string }> = [];

  function collectIssues(source: "body" | "query" | "params", err: z.ZodError) {
    for (const issue of err.issues) {
      const path = issue.path.length ? issue.path.join(".") : "_root";
      const leafField = issue.path.length ? String(issue.path[issue.path.length - 1]) : "";
      const hint = validationHints[leafField];
      details.push({
        field: `${source}.${path}`,
        message: issue.message,
        expected: hint?.expected,
        example: hint?.example
      });
    }
  }

  if (schemas.body) {
    try {
      const body = await readBody(event);
      result.body = schemas.body.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        collectIssues("body", err);
      }
    }
  }

  if (schemas.query) {
    try {
      const query = getQuery(event);
      result.query = schemas.query.parse(query);
    } catch (err) {
      if (err instanceof z.ZodError) {
        collectIssues("query", err);
      }
    }
  }

  if (schemas.params) {
    try {
      const params = getRouterParams(event);
      result.params = schemas.params.parse(params);
    } catch (err) {
      if (err instanceof z.ZodError) {
        collectIssues("params", err);
      }
    }
  }

  if (details.length > 0) {
    throw new ValidationError("Validation failed", details);
  }

  return result;
}

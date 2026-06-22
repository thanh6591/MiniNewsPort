import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BULK_IMPORT_DEEP_DIVE_STAGES } from "~/pages/diagrams/bulk-import-messaging.deep-dive";
import { VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES } from "~/pages/diagrams/vector-search-recommendation-rag-chatbot.deep-dive";

type AllowedReference = {
  filePath: string;
  functionName: string;
};

const appRoot = resolve(process.cwd());
const repoRoot = resolve(appRoot, "../..");
const snippetLinesBefore = 4;
const snippetLinesAfter = 20;

const allowedReferences = new Set<string>(
  [
    ...BULK_IMPORT_DEEP_DIVE_STAGES,
    ...VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES
  ].flatMap((stage) => stage.functionWalkthrough.map((reference) => buildReferenceKey(reference)))
);

function buildReferenceKey(reference: AllowedReference): string {
  return `${reference.filePath}::${reference.functionName}`;
}

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/").replace(/^\/+/, "");
}

function isInsideAllowedRoots(absolutePath: string): boolean {
  return absolutePath.startsWith(`${appRoot}/`) || absolutePath.startsWith(`${repoRoot}/`);
}

async function resolveSourcePath(filePath: string): Promise<string> {
  const normalized = normalizePath(filePath);
  const pathWithoutAppPrefix = normalized.startsWith("apps/web/")
    ? normalized.slice("apps/web/".length)
    : normalized;

  const candidates = [
    resolve(appRoot, normalized),
    resolve(appRoot, pathWithoutAppPrefix),
    resolve(repoRoot, normalized),
    resolve(repoRoot, pathWithoutAppPrefix)
  ];

  for (const candidate of candidates) {
    if (!isInsideAllowedRoots(candidate)) {
      continue;
    }
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate path.
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: "Source file not found",
    data: {
      message: `Unable to resolve source file from ${filePath}.`
    }
  });
}

function extractSnippet(source: string, functionName: string): { startLine: number; endLine: number; snippet: string } {
  const lines = source.split(/\r?\n/);
  const matchedLineIndex = lines.findIndex((line) => line.includes(functionName));

  if (matchedLineIndex < 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Function not found",
      data: { message: `Could not find ${functionName} in source file.` }
    });
  }

  const startLine = Math.max(1, matchedLineIndex + 1 - snippetLinesBefore);
  const endLine = Math.min(lines.length, matchedLineIndex + 1 + snippetLinesAfter);
  const snippet = lines.slice(startLine - 1, endLine).join("\n");

  return { startLine, endLine, snippet };
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const filePath = readQueryValue(query.filePath as string | string[] | undefined);
  const functionName = readQueryValue(query.functionName as string | string[] | undefined);

  if (!filePath || !functionName) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing query parameters",
      data: { message: "filePath and functionName are required." }
    });
  }

  const lookupKey = buildReferenceKey({ filePath, functionName });
  if (!allowedReferences.has(lookupKey)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Unknown function reference",
      data: { message: "Function reference is not part of deep dive documentation." }
    });
  }

  const absolutePath = await resolveSourcePath(filePath);

  let source: string;
  try {
    source = await readFile(absolutePath, "utf8");
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: "Source file not found",
      data: {
        message: `Unable to read ${filePath}.`,
        details: error instanceof Error ? error.message : String(error)
      }
    });
  }

  const { startLine, endLine, snippet } = extractSnippet(source, functionName);

  return {
    filePath,
    functionName,
    startLine,
    endLine,
    snippet
  };
});

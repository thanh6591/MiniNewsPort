export function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function extractDomain(input: string): string | null {
  try {
    const u = new URL(input);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

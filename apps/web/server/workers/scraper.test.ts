import { describe, it, expect } from "vitest";
import { extractFromHtml, slugify } from "./scraper";
import { SelectorMismatchError } from "./errors";

describe("scraper.extractFromHtml", () => {
  it("extracts title, content, og image", () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="Hello World">
      <meta property="og:image" content="https://e.com/hero.jpg">
    </head><body><article><p>Body <b>bold</b> here.</p></article></body></html>`;
    const out = extractFromHtml(html);
    expect(out.title).toBe("Hello World");
    expect(out.content).toContain("<p>");
    expect(out.imageUrl).toBe("https://e.com/hero.jpg");
    expect(out.summary.length).toBeGreaterThan(0);
  });
  it("throws SelectorMismatchError when title missing", () => {
    const html = `<!doctype html><html><head></head><body><article><p>x</p></article></body></html>`;
    expect(() => extractFromHtml(html, { title: ["h1"], content: ["article"], image: [] })).toThrow(SelectorMismatchError);
  });
  it("strips disallowed tags", () => {
    const html = `<html><head><title>T</title></head><body><article><script>alert(1)</script><p>safe</p></article></body></html>`;
    const out = extractFromHtml(html);
    expect(out.content).not.toContain("script");
    expect(out.content).toContain("safe");
  });
});

describe("scraper.slugify", () => {
  it("kebabs lowercase", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
  it("handles diacritics", () => {
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
  });
});

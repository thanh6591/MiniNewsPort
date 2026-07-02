import { describe, it, expect } from "vitest";
import { extractFromHtml, inferCategoryFromUrl, slugify } from "./scraper";
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

describe("scraper.inferCategoryFromUrl", () => {
  it("infers first meaningful path segment", () => {
    expect(inferCategoryFromUrl("https://vnexpress.net/kinh-doanh/chung-khoan-123.html")).toEqual({
      slug: "kinh-doanh",
      name: "Kinh Doanh"
    });
  });

  it("skips generic segments like thread and infers next one", () => {
    expect(inferCategoryFromUrl("https://tinhte.vn/thread/cong-nghe-moi.12345/")).toEqual({
      slug: "cong-nghe-moi",
      name: "Cong Nghe Moi"
    });
  });

  it("returns null for invalid url", () => {
    expect(inferCategoryFromUrl("not-a-url")).toBeNull();
  });

  it("does not infer category from article-style slug with trailing id", () => {
    expect(
      inferCategoryFromUrl("https://vnexpress.net/cdv-world-cup-ngu-trong-xe-cam-trai-vi-gia-khach-san-dat-do-5092300.html")
    ).toBeNull();
  });

  it("does not infer category from overly long path segment", () => {
    expect(
      inferCategoryFromUrl("https://example.com/this-is-a-very-long-article-title-segment-that-should-not-be-a-category")
    ).toBeNull();
  });
});

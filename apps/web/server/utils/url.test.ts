import { describe, it, expect } from "vitest";
import { normalizeUrl, extractDomain } from "./url";

describe("normalizeUrl", () => {
  it("normalizes valid http(s) URLs", () => {
    expect(normalizeUrl("https://Example.com/Path?q=1 ")).toBe("https://example.com/Path?q=1");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
  });
  it("rejects non-http(s)", () => {
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
  it("rejects invalid", () => {
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});

describe("extractDomain", () => {
  it("returns lowercase hostname", () => {
    expect(extractDomain("https://Example.COM/path")).toBe("example.com");
  });
  it("returns null for invalid input", () => {
    expect(extractDomain("garbage")).toBeNull();
  });
});

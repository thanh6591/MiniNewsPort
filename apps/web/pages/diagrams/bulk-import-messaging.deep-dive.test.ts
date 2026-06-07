import {
  BULK_IMPORT_DEEP_DIVE_STAGES,
  BULK_IMPORT_TABS,
  resolveBulkImportTab
} from "./bulk-import-messaging.deep-dive";

describe("bulk import deep dive content model", () => {
  it("resolves supported tab ids and falls back safely", () => {
    expect(resolveBulkImportTab("deep-dive")).toBe("deep-dive");
    expect(resolveBulkImportTab("diagram")).toBe("diagram");
    expect(resolveBulkImportTab("unknown")).toBe("diagram");
    expect(resolveBulkImportTab(null)).toBe("diagram");
  });

  it("defines exactly two deterministic tabs", () => {
    expect(BULK_IMPORT_TABS).toEqual([
      { id: "diagram", label: "System Diagram" },
      { id: "deep-dive", label: "Backend Deep Dive" }
    ]);
  });

  it("keeps deterministic stage ordering for onboarding flow", () => {
    expect(BULK_IMPORT_DEEP_DIVE_STAGES.map((stage) => stage.id)).toEqual([
      "intake",
      "validation",
      "enqueue",
      "processing",
      "retry-dlq",
      "polling",
      "email-notification"
    ]);
  });

  it("ensures each stage has at least one code reference and one storage detail", () => {
    for (const stage of BULK_IMPORT_DEEP_DIVE_STAGES) {
      expect(stage.functionWalkthrough.length).toBeGreaterThan(0);
      expect(stage.storageDetails.length).toBeGreaterThan(0);
    }
  });
});

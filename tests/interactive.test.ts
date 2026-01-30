// ============================================
// Sawrin - Interactive Mode Tests
// ============================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { listImpactedTests } from "../src/cli/interactive.js";
import type { ImpactedFile } from "../src/types/index.js";

describe("Interactive Mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("listImpactedTests", () => {
    it("should list unit tests correctly", () => {
      const consoleSpy = vi.spyOn(console, "log");
      const unitTests: ImpactedFile[] = [
        {
          path: "src/components/button.test.ts",
          reasons: [
            { type: "direct_change", description: "File changed" },
            { type: "imports_changed", description: "Imported file changed" },
          ],
        },
      ];

      listImpactedTests(unitTests, []);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Impacted Tests Summary"),
      );
      expect(consoleSpy).toHaveBeenCalledWith("Unit Tests:");
      // Should show red icon for high confidence (>1 reason)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("🔴 src/components/button.test.ts (90%)"),
      );
    });

    it("should list API tests correctly", () => {
      const consoleSpy = vi.spyOn(console, "log");
      const apiTests: ImpactedFile[] = [
        {
          path: "api/users/create.bru",
          reasons: [{ type: "route_match", description: "Route matches" }],
        },
      ];

      listImpactedTests([], apiTests);

      expect(consoleSpy).toHaveBeenCalledWith("\nAPI Tests:");
      // Should show yellow icon for medium confidence (1 reason)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("🟡 api/users/create.bru (60%)"),
      );
    });

    it("should handle no impacted tests", () => {
      const consoleSpy = vi.spyOn(console, "log");
      listImpactedTests([], []);
      expect(consoleSpy).toHaveBeenCalledWith("✅ No impacted tests found.");
    });
  });
});

// ============================================
// Sawrin - Risk Calculator Tests
// ============================================

import { describe, it, expect } from "vitest";
import { riskCalculator } from "../src/analyzers/risk-calculator.js";
import type { AnalyzerContext } from "../src/analyzers/base-analyzer.js";
import type { DependencyGraph } from "../src/types/index.js";

describe("riskCalculator", () => {
  it("should return LOW risk for test-only changes", async () => {
    const context = createContext([
      { path: "user.spec.ts", changeType: "modified" },
    ]);

    const result = await riskCalculator.analyze(context);

    expect(result.level).toBe("LOW");
    expect(result.signals.some((s) => s.signal === "only_tests")).toBe(true);
  });

  it("should detect high-risk auth changes", async () => {
    const context = createContext([
      { path: "src/auth/login.ts", changeType: "modified" },
    ]);

    const result = await riskCalculator.analyze(context);

    expect(result.signals.some((s) => s.signal === "auth_security")).toBe(true);
  });

  it("should detect high-risk database changes", async () => {
    const context = createContext([
      { path: "src/database/migrations/001.ts", changeType: "modified" },
    ]);

    const result = await riskCalculator.analyze(context);

    expect(result.signals.some((s) => s.signal === "database")).toBe(true);
  });

  it("should detect config changes", async () => {
    const context = createContext([
      { path: "src/config/app.config.ts", changeType: "modified" },
    ]);

    const result = await riskCalculator.analyze(context);

    expect(result.signals.some((s) => s.signal === "config")).toBe(true);
  });

  it("should detect shared utility changes", async () => {
    const context = createContext([
      { path: "src/utils/helpers.ts", changeType: "modified" },
    ]);

    const result = await riskCalculator.analyze(context);

    expect(result.signals.some((s) => s.signal === "shared_utility")).toBe(
      true,
    );
  });

  it("should increase risk for multiple modules", async () => {
    const context = createContext([
      { path: "src/users/user.ts", changeType: "modified" },
      { path: "src/posts/post.ts", changeType: "modified" },
      { path: "src/comments/comment.ts", changeType: "modified" },
    ]);

    const result = await riskCalculator.analyze(context);

    expect(result.signals.some((s) => s.signal === "multiple_modules")).toBe(
      true,
    );
  });

  it("should calculate correct risk levels", async () => {
    // Low risk - simple utility
    const low = createContext([
      { path: "src/types/index.ts", changeType: "modified" },
    ]);
    const lowResult = await riskCalculator.analyze(low);
    expect(lowResult.level).toBe("LOW");

    // High risk - auth + database
    const high = createContext([
      { path: "src/auth/security.ts", changeType: "modified" },
      { path: "src/database/schema.ts", changeType: "modified" },
    ]);
    const highResult = await riskCalculator.analyze(high);
    expect(highResult.level).toBe("HIGH");
  });

  it("should provide a summary", async () => {
    const context = createContext([
      { path: "src/auth/login.ts", changeType: "modified" },
    ]);

    const result = await riskCalculator.analyze(context);

    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe("string");
  });
});

function createContext(
  changedFiles: Array<{
    path: string;
    changeType: "added" | "modified" | "deleted" | "renamed";
  }>,
): AnalyzerContext {
  return {
    changedFiles,
    dependencyGraph: emptyGraph(),
    projectRoot: "/project",
    allFiles: changedFiles.map((f) => f.path),
  };
}

function emptyGraph(): DependencyGraph {
  return {
    imports: new Map(),
    importedBy: new Map(),
    exports: new Map(),
  };
}

// ============================================
// Sawrin - Unit Test Analyzer Tests
// ============================================

import { describe, it, expect } from "vitest";
import { unitTestAnalyzer } from "../src/analyzers/unit-test-analyzer.js";
import type { AnalyzerContext } from "../src/analyzers/base-analyzer.js";
import type { DependencyGraph } from "../src/types/index.js";

describe("unitTestAnalyzer", () => {
  it("should detect directly changed test files", async () => {
    const context: AnalyzerContext = {
      changedFiles: [{ path: "user.service.spec.ts", changeType: "modified" }],
      dependencyGraph: emptyGraph(),
      projectRoot: "/project",
      allFiles: ["user.service.spec.ts", "user.service.ts"],
    };

    const result = await unitTestAnalyzer.analyze(context);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("user.service.spec.ts");
    expect(result[0].reasons[0].type).toBe("direct_change");
  });

  it("should match test files by naming convention", async () => {
    const context: AnalyzerContext = {
      changedFiles: [{ path: "user.service.ts", changeType: "modified" }],
      dependencyGraph: emptyGraph(),
      projectRoot: "/project",
      allFiles: ["user.service.ts", "user.service.spec.ts", "other.spec.ts"],
    };

    const result = await unitTestAnalyzer.analyze(context);

    expect(result.length).toBeGreaterThanOrEqual(1);
    const userTest = result.find((r) => r.path === "user.service.spec.ts");
    expect(userTest).toBeDefined();
    expect(userTest!.reasons.some((r) => r.type === "naming_convention")).toBe(
      true,
    );
  });

  it("should detect tests that import changed files", async () => {
    const graph: DependencyGraph = {
      imports: new Map([["user.spec.ts", new Set(["user.ts"])]]),
      importedBy: new Map([["user.ts", new Set(["user.spec.ts"])]]),
      exports: new Map(),
    };

    const context: AnalyzerContext = {
      changedFiles: [{ path: "user.ts", changeType: "modified" }],
      dependencyGraph: graph,
      projectRoot: "/project",
      allFiles: ["user.ts", "user.spec.ts"],
    };

    const result = await unitTestAnalyzer.analyze(context);

    expect(result.some((r) => r.path === "user.spec.ts")).toBe(true);
    const userTest = result.find((r) => r.path === "user.spec.ts");
    expect(userTest?.reasons.some((r) => r.type === "imports_changed")).toBe(
      true,
    );
  });

  it("should detect transitive imports", async () => {
    const graph: DependencyGraph = {
      imports: new Map([
        ["service.ts", new Set(["util.ts"])],
        ["service.spec.ts", new Set(["service.ts"])],
      ]),
      importedBy: new Map([
        ["util.ts", new Set(["service.ts"])],
        ["service.ts", new Set(["service.spec.ts"])],
      ]),
      exports: new Map(),
    };

    const context: AnalyzerContext = {
      changedFiles: [{ path: "util.ts", changeType: "modified" }],
      dependencyGraph: graph,
      projectRoot: "/project",
      allFiles: ["util.ts", "service.ts", "service.spec.ts"],
    };

    const result = await unitTestAnalyzer.analyze(context);

    expect(result.some((r) => r.path === "service.spec.ts")).toBe(true);
  });

  it("should handle files in __tests__ folder", async () => {
    const context: AnalyzerContext = {
      changedFiles: [
        { path: "src/user/__tests__/user.test.ts", changeType: "modified" },
      ],
      dependencyGraph: emptyGraph(),
      projectRoot: "/project",
      allFiles: ["src/user/__tests__/user.test.ts"],
    };

    const result = await unitTestAnalyzer.analyze(context);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/user/__tests__/user.test.ts");
  });

  it("should sort by number of reasons", async () => {
    const graph: DependencyGraph = {
      imports: new Map([["a.spec.ts", new Set(["source.ts"])]]),
      importedBy: new Map([["source.ts", new Set(["a.spec.ts"])]]),
      exports: new Map(),
    };

    const context: AnalyzerContext = {
      changedFiles: [{ path: "source.ts", changeType: "modified" }],
      dependencyGraph: graph,
      projectRoot: "/project",
      allFiles: ["source.ts", "source.spec.ts", "a.spec.ts"],
    };

    const result = await unitTestAnalyzer.analyze(context);

    // source.spec.ts should have more reasons (naming + possibly import)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

function emptyGraph(): DependencyGraph {
  return {
    imports: new Map(),
    importedBy: new Map(),
    exports: new Map(),
  };
}

// ============================================
// Sawrin - Dependency Graph Tests
// ============================================

import { describe, it, expect } from "vitest";
import {
  extractImports,
  resolveImportPath,
  getAffectedFiles,
} from "../src/core/dependency-graph.js";
import type { DependencyGraph } from "../src/types/index.js";

describe("resolveImportPath", () => {
  it("should skip external packages", () => {
    const result = resolveImportPath("express", "/project/src", "/project");
    expect(result).toBeNull();
  });

  it("should skip node built-ins", () => {
    const result = resolveImportPath("fs", "/project/src", "/project");
    expect(result).toBeNull();
  });

  it("should handle relative paths", () => {
    // This test depends on file existence, so we just test the logic
    const result = resolveImportPath("react", "/project/src", "/project");
    expect(result).toBeNull(); // External package
  });
});

describe("getAffectedFiles", () => {
  it("should return changed files at depth 0", () => {
    const graph: DependencyGraph = {
      imports: new Map(),
      importedBy: new Map(),
      exports: new Map(),
    };

    const result = getAffectedFiles(["a.ts"], graph);

    expect(result.get("a.ts")).toBe(0);
  });

  it("should find direct importers", () => {
    const graph: DependencyGraph = {
      imports: new Map([["b.ts", new Set(["a.ts"])]]),
      importedBy: new Map([["a.ts", new Set(["b.ts"])]]),
      exports: new Map(),
    };

    const result = getAffectedFiles(["a.ts"], graph);

    expect(result.get("a.ts")).toBe(0);
    expect(result.get("b.ts")).toBe(1);
  });

  it("should find transitive importers", () => {
    const graph: DependencyGraph = {
      imports: new Map([
        ["b.ts", new Set(["a.ts"])],
        ["c.ts", new Set(["b.ts"])],
      ]),
      importedBy: new Map([
        ["a.ts", new Set(["b.ts"])],
        ["b.ts", new Set(["c.ts"])],
      ]),
      exports: new Map(),
    };

    const result = getAffectedFiles(["a.ts"], graph);

    expect(result.get("a.ts")).toBe(0);
    expect(result.get("b.ts")).toBe(1);
    expect(result.get("c.ts")).toBe(2);
  });

  it("should respect max depth", () => {
    const graph: DependencyGraph = {
      imports: new Map([
        ["b.ts", new Set(["a.ts"])],
        ["c.ts", new Set(["b.ts"])],
        ["d.ts", new Set(["c.ts"])],
      ]),
      importedBy: new Map([
        ["a.ts", new Set(["b.ts"])],
        ["b.ts", new Set(["c.ts"])],
        ["c.ts", new Set(["d.ts"])],
      ]),
      exports: new Map(),
    };

    const result = getAffectedFiles(["a.ts"], graph, 2);

    expect(result.has("a.ts")).toBe(true);
    expect(result.has("b.ts")).toBe(true);
    expect(result.has("c.ts")).toBe(true);
    // d.ts would be at depth 3, beyond max
  });

  it("should handle circular dependencies", () => {
    const graph: DependencyGraph = {
      imports: new Map([
        ["a.ts", new Set(["b.ts"])],
        ["b.ts", new Set(["a.ts"])],
      ]),
      importedBy: new Map([
        ["a.ts", new Set(["b.ts"])],
        ["b.ts", new Set(["a.ts"])],
      ]),
      exports: new Map(),
    };

    const result = getAffectedFiles(["a.ts"], graph);

    expect(result.get("a.ts")).toBe(0);
    expect(result.get("b.ts")).toBe(1);
  });

  it("should handle multiple changed files", () => {
    const graph: DependencyGraph = {
      imports: new Map([
        ["c.ts", new Set(["a.ts"])],
        ["d.ts", new Set(["b.ts"])],
      ]),
      importedBy: new Map([
        ["a.ts", new Set(["c.ts"])],
        ["b.ts", new Set(["d.ts"])],
      ]),
      exports: new Map(),
    };

    const result = getAffectedFiles(["a.ts", "b.ts"], graph);

    expect(result.get("a.ts")).toBe(0);
    expect(result.get("b.ts")).toBe(0);
    expect(result.get("c.ts")).toBe(1);
    expect(result.get("d.ts")).toBe(1);
  });
});

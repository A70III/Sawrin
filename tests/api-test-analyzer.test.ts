// ============================================
// Sawrin - API Test Analyzer Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { apiTestAnalyzer } from "../src/analyzers/api-test-analyzer.js";
import type { AnalyzerContext } from "../src/analyzers/base-analyzer.js";
import {
  routeMatches,
  getRouteSimilarity,
} from "../src/heuristics/route-patterns.js";

const TEST_DIR = resolve(process.cwd(), "tests/fixtures/api-analyzer-test");

describe("routeMatches", () => {
  it("should match exact paths", () => {
    expect(routeMatches("/users", "/users")).toBe(true);
    expect(routeMatches("/api/users", "/api/users")).toBe(true);
  });

  it("should normalize paths", () => {
    expect(routeMatches("users", "/users")).toBe(true);
    expect(routeMatches("/users/", "/users")).toBe(true);
  });

  it("should match paths with parameters", () => {
    expect(routeMatches("/users/:id", "/users/123")).toBe(true);
    expect(routeMatches("/users/:id/posts/:postId", "/users/1/posts/2")).toBe(
      true,
    );
  });

  it("should not match different paths", () => {
    expect(routeMatches("/users", "/posts")).toBe(false);
    expect(routeMatches("/users", "/users/extra")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(routeMatches("/Users", "/users")).toBe(true);
    expect(routeMatches("/API/Users", "/api/users")).toBe(true);
  });
});

describe("getRouteSimilarity", () => {
  it("should return 1 for identical paths", () => {
    expect(getRouteSimilarity("/users", "/users")).toBe(1);
  });

  it("should return 0 for completely different paths", () => {
    expect(getRouteSimilarity("/users", "/posts")).toBe(0);
  });

  it("should return partial match for similar paths", () => {
    const similarity = getRouteSimilarity("/api/users", "/api/posts");
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it("should handle paths with parameters", () => {
    const similarity = getRouteSimilarity("/users/:id", "/users/123");
    expect(similarity).toBeGreaterThan(0.5);
  });
});

describe("apiTestAnalyzer", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it("should detect impacted tests based on route matching", async () => {
    // Create backend file with route
    const backendFile = resolve(TEST_DIR, "src/api/users.ts");
    mkdirSync(dirname(backendFile), { recursive: true });
    const backendContent = `
import { Router } from 'express';
const router = Router();
router.get('/users', (req, res) => res.json([]));
`;
    writeFileSync(backendFile, backendContent);

    // Create Bruno test
    const brunoFile = resolve(TEST_DIR, "api-tests/users.bru");
    mkdirSync(dirname(brunoFile), { recursive: true });
    writeFileSync(
      brunoFile,
      `meta {
  name: Get Users
  type: http
  seq: 1
}
get {
  url: http://localhost:3000/users
  body: none
  auth: none
}`,
    );

    const context: AnalyzerContext = {
      changedFiles: [{ path: "src/api/users.ts", changeType: "modified" }],
      dependencyGraph: {
        imports: new Map(),
        importedBy: new Map(),
        exports: new Map(),
      },
      projectRoot: TEST_DIR,
      allFiles: ["src/api/users.ts", "api-tests/users.bru"],
      config: {},
    };

    const results = await apiTestAnalyzer.analyze(context);

    expect(results.length).toBe(1);
    expect(results[0].path).toContain("api-tests/users.bru");
    expect(results[0].reasons[0].type).toBe("route_match");
  });

  it("should capture line numbers for route matches", async () => {
    // Create backend file with route at specific line
    const backendFile = resolve(TEST_DIR, "src/api/users.ts");
    mkdirSync(dirname(backendFile), { recursive: true });

    // Note: Line 1 is empty, Line 2 is import, Line 3 is router init, Line 4 is empty, Line 5 is route
    const backendContent = `
import { Router } from 'express';
const router = Router();

router.get('/users', (req, res) => {
  res.json([]);
});
`;
    writeFileSync(backendFile, backendContent);

    // Create Bruno test
    const brunoFile = resolve(TEST_DIR, "api-tests/users.bru");
    mkdirSync(dirname(brunoFile), { recursive: true });
    writeFileSync(
      brunoFile,
      `meta {
  name: Get Users
  type: http
  seq: 1
}
get {
  url: http://localhost:3000/users
  body: none
  auth: none
}`,
    );

    const context: AnalyzerContext = {
      changedFiles: [{ path: "src/api/users.ts", changeType: "modified" }],
      dependencyGraph: {
        imports: new Map(),
        importedBy: new Map(),
        exports: new Map(),
      },
      projectRoot: TEST_DIR,
      allFiles: ["src/api/users.ts", "api-tests/users.bru"],
      config: {},
    };

    const results = await apiTestAnalyzer.analyze(context);

    expect(results.length).toBe(1);
    expect(results[0].reasons[0].lineNumber).toBe(5);
  });
});

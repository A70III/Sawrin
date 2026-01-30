// ============================================
// Sawrin - API Test Analyzer Tests
// ============================================

import { describe, it, expect } from "vitest";
import {
  routeMatches,
  getRouteSimilarity,
} from "../src/heuristics/route-patterns.js";

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

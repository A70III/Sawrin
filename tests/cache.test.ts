// ============================================
// Sawrin - Cache Manager Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { CacheManager } from "../src/core/cache.js";

const TEST_DIR = resolve(process.cwd(), "tests/fixtures/cache-test");
const TEST_FILE = resolve(TEST_DIR, "test.ts");
const CACHE_DIR = ".cache/sawrin";

describe("CacheManager", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, 'import { x } from "./utils";');
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it("should save and load cache", () => {
    const cache = new CacheManager(TEST_DIR, CACHE_DIR);
    const hash = cache.getFileHash("content");
    const imports = ["./utils.ts"];

    cache.set("test.ts", hash, imports);
    cache.save();

    const newCache = new CacheManager(TEST_DIR, CACHE_DIR);
    const cachedImports = newCache.get("test.ts", hash);

    expect(cachedImports).toEqual(imports);
  });

  it("should return null for hash mismatch", () => {
    const cache = new CacheManager(TEST_DIR, CACHE_DIR);
    const hash = cache.getFileHash("content");
    cache.set("test.ts", hash, ["./utils.ts"]);

    const mismatch = cache.get("test.ts", "different-hash");
    expect(mismatch).toBeNull();
  });

  it("should clear cache", () => {
    const cache = new CacheManager(TEST_DIR, CACHE_DIR);
    cache.set("test.ts", "hash", []);
    cache.save();

    cache.clear();
    const cached = cache.get("test.ts", "hash");

    expect(cached).toBeNull();
    const cacheFile = resolve(TEST_DIR, CACHE_DIR, "deptree.json");
    const content = JSON.parse(readFileSync(cacheFile, "utf-8"));
    expect(Object.keys(content.entries).length).toBe(0);
  });

  it("should create cache directory if it does not exist", () => {
    const cache = new CacheManager(TEST_DIR, "new/nested/cache");
    cache.set("test.ts", "hash", []);
    cache.save();

    expect(existsSync(resolve(TEST_DIR, "new/nested/cache/deptree.json"))).toBe(
      true,
    );
  });
});

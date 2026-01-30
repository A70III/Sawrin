// ============================================
// Sawrin - Monorepo Support Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import {
  detectMonorepo,
  getPackageForFile,
  getAffectedPackages,
  resolvePackageImport,
} from "../src/core/monorepo.js";

const TEST_DIR = resolve(process.cwd(), "tests/fixtures/monorepo-test");

describe("Monorepo Detection", () => {
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("detectMonorepo", () => {
    it("should return isMonorepo: false for non-monorepo projects", async () => {
      // Create a simple package.json without workspaces
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ name: "single-package", version: "1.0.0" }),
      );

      const result = await detectMonorepo(TEST_DIR);

      expect(result.isMonorepo).toBe(false);
      expect(result.workspaces).toEqual([]);
    });

    it("should detect npm/yarn workspaces", async () => {
      // Create root package.json with workspaces
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({
          name: "monorepo-root",
          workspaces: ["packages/*"],
        }),
      );

      // Create a package in workspaces
      const pkgDir = resolve(TEST_DIR, "packages/utils");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        resolve(pkgDir, "package.json"),
        JSON.stringify({ name: "@app/utils", version: "1.0.0" }),
      );
      writeFileSync(resolve(pkgDir, "index.ts"), "export const foo = 1;");

      const result = await detectMonorepo(TEST_DIR);

      expect(result.isMonorepo).toBe(true);
      expect(result.type).toBe("npm");
      expect(result.workspaces.length).toBe(1);
      expect(result.workspaces[0].name).toBe("@app/utils");
    });

    it("should detect workspaces object format", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({
          name: "monorepo-root",
          workspaces: { packages: ["packages/*"] },
        }),
      );

      const pkgDir = resolve(TEST_DIR, "packages/core");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        resolve(pkgDir, "package.json"),
        JSON.stringify({ name: "@app/core" }),
      );

      const result = await detectMonorepo(TEST_DIR);

      expect(result.isMonorepo).toBe(true);
      expect(result.workspaces.length).toBe(1);
    });

    it("should detect lerna.json", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ name: "lerna-monorepo" }),
      );
      writeFileSync(
        resolve(TEST_DIR, "lerna.json"),
        JSON.stringify({ packages: ["packages/*"] }),
      );

      const pkgDir = resolve(TEST_DIR, "packages/lib");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        resolve(pkgDir, "package.json"),
        JSON.stringify({ name: "@app/lib" }),
      );

      const result = await detectMonorepo(TEST_DIR);

      expect(result.isMonorepo).toBe(true);
      expect(result.type).toBe("lerna");
    });

    it("should detect nx.json", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ name: "nx-monorepo" }),
      );
      writeFileSync(resolve(TEST_DIR, "nx.json"), JSON.stringify({}));

      const pkgDir = resolve(TEST_DIR, "packages/feature");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        resolve(pkgDir, "package.json"),
        JSON.stringify({ name: "@app/feature" }),
      );

      const result = await detectMonorepo(TEST_DIR);

      expect(result.isMonorepo).toBe(true);
      expect(result.type).toBe("nx");
    });
  });

  describe("getPackageForFile", () => {
    it("should return the correct package for a file path", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ workspaces: ["packages/*"] }),
      );

      const pkgDir = resolve(TEST_DIR, "packages/utils");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        resolve(pkgDir, "package.json"),
        JSON.stringify({ name: "@app/utils" }),
      );
      mkdirSync(resolve(pkgDir, "src"), { recursive: true });
      writeFileSync(resolve(pkgDir, "src/index.ts"), "");

      const monorepo = await detectMonorepo(TEST_DIR);
      const pkg = getPackageForFile("packages/utils/src/index.ts", monorepo);

      expect(pkg).not.toBeNull();
      expect(pkg?.name).toBe("@app/utils");
    });

    it("should return null for files outside any package", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ workspaces: ["packages/*"] }),
      );

      const monorepo = await detectMonorepo(TEST_DIR);
      const pkg = getPackageForFile("scripts/build.ts", monorepo);

      expect(pkg).toBeNull();
    });
  });

  describe("getAffectedPackages", () => {
    it("should return packages that depend on changed packages", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ workspaces: ["packages/*"] }),
      );

      // Create utils package
      const utilsDir = resolve(TEST_DIR, "packages/utils");
      mkdirSync(utilsDir, { recursive: true });
      writeFileSync(
        resolve(utilsDir, "package.json"),
        JSON.stringify({ name: "@app/utils" }),
      );

      // Create core package that depends on utils
      const coreDir = resolve(TEST_DIR, "packages/core");
      mkdirSync(coreDir, { recursive: true });
      writeFileSync(
        resolve(coreDir, "package.json"),
        JSON.stringify({
          name: "@app/core",
          dependencies: { "@app/utils": "*" },
        }),
      );

      const monorepo = await detectMonorepo(TEST_DIR);
      const affected = getAffectedPackages(["@app/utils"], monorepo);

      expect(affected.has("@app/utils")).toBe(true);
      expect(affected.has("@app/core")).toBe(true);
    });
  });

  describe("resolvePackageImport", () => {
    it("should resolve package import to entry file", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ workspaces: ["packages/*"] }),
      );

      const pkgDir = resolve(TEST_DIR, "packages/utils");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        resolve(pkgDir, "package.json"),
        JSON.stringify({ name: "@app/utils", main: "dist/index.js" }),
      );

      // Create src/index.ts as fallback
      mkdirSync(resolve(pkgDir, "src"), { recursive: true });
      writeFileSync(resolve(pkgDir, "src/index.ts"), "");

      const monorepo = await detectMonorepo(TEST_DIR);
      const resolved = resolvePackageImport("@app/utils", monorepo);

      expect(resolved).toBe("packages/utils/src/index.ts");
    });

    it("should return null for unknown packages", async () => {
      writeFileSync(
        resolve(TEST_DIR, "package.json"),
        JSON.stringify({ workspaces: ["packages/*"] }),
      );

      const monorepo = await detectMonorepo(TEST_DIR);
      const resolved = resolvePackageImport("@unknown/pkg", monorepo);

      expect(resolved).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { detectMonorepo, resolvePackageImport } from "../src/core/monorepo.js";

const TEST_DIR = resolve(process.cwd(), "tests/fixtures/monorepo-exports");

describe("Monorepo Exports Resolution", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it("should resolve basic exports", async () => {
    writeFileSync(
      resolve(TEST_DIR, "package.json"),
      JSON.stringify({ workspaces: ["packages/*"] }),
    );

    const pkgDir = resolve(TEST_DIR, "packages/ui");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      resolve(pkgDir, "package.json"),
      JSON.stringify({
        name: "@app/ui",
        exports: {
          ".": "./index.ts",
          "./button": "./src/button.ts",
        },
      }),
    );

    mkdirSync(resolve(pkgDir, "src"), { recursive: true });
    writeFileSync(resolve(pkgDir, "index.ts"), "");
    writeFileSync(resolve(pkgDir, "src/button.ts"), "");

    const monorepo = await detectMonorepo(TEST_DIR);

    // Main entry
    expect(resolvePackageImport("@app/ui", monorepo)).toBe(
      "packages/ui/index.ts",
    );

    // Subpath
    expect(resolvePackageImport("@app/ui/button", monorepo)).toBe(
      "packages/ui/src/button.ts",
    );

    // Invalid subpath
    expect(resolvePackageImport("@app/ui/invalid", monorepo)).toBeNull();
  });

  it("should fallback to legacy resolution for subpaths without exports", async () => {
    writeFileSync(
      resolve(TEST_DIR, "package.json"),
      JSON.stringify({ workspaces: ["packages/*"] }),
    );

    const pkgDir = resolve(TEST_DIR, "packages/utils");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      resolve(pkgDir, "package.json"),
      JSON.stringify({
        name: "@app/utils",
      }),
    );

    mkdirSync(resolve(pkgDir, "src"), { recursive: true });
    writeFileSync(resolve(pkgDir, "src/helpers.ts"), "");

    const monorepo = await detectMonorepo(TEST_DIR);

    // Should resolve path relative to src if not found directly
    // Logic added: try direct file, then try src/ prefix
    expect(resolvePackageImport("@app/utils/helpers", monorepo)).toBe(
      "packages/utils/src/helpers.ts",
    );
  });
});

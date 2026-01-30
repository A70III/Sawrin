// ============================================
// Sawrin - Configuration Loader Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import {
  loadConfig,
  findConfigFile,
  mergeConfig,
  validateConfig,
  shouldIgnoreFile,
  isConfiguredTestFile,
  isHighRiskFile,
  isLowRiskFile,
  DEFAULT_CONFIG,
} from "../src/core/config.js";

const TEST_DIR = resolve(process.cwd(), "tests/fixtures/config-test");

describe("Configuration Loader", () => {
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

  describe("findConfigFile", () => {
    it("should find .sawrinrc.json", () => {
      writeFileSync(resolve(TEST_DIR, ".sawrinrc.json"), "{}");
      const result = findConfigFile(TEST_DIR);
      expect(result).toContain(".sawrinrc.json");
    });

    it("should find .sawrinrc", () => {
      writeFileSync(resolve(TEST_DIR, ".sawrinrc"), "{}");
      const result = findConfigFile(TEST_DIR);
      expect(result).toContain(".sawrinrc");
    });

    it("should find sawrin.config.json", () => {
      writeFileSync(resolve(TEST_DIR, "sawrin.config.json"), "{}");
      const result = findConfigFile(TEST_DIR);
      expect(result).toContain("sawrin.config.json");
    });

    it("should return null when no config exists", () => {
      const result = findConfigFile(TEST_DIR);
      expect(result).toBeNull();
    });

    it("should prefer .sawrinrc.json over sawrin.config.json", () => {
      writeFileSync(resolve(TEST_DIR, ".sawrinrc.json"), "{}");
      writeFileSync(resolve(TEST_DIR, "sawrin.config.json"), "{}");
      const result = findConfigFile(TEST_DIR);
      expect(result).toContain(".sawrinrc.json");
    });
  });

  describe("loadConfig", () => {
    it("should return default config when no file exists", async () => {
      const config = await loadConfig(TEST_DIR);
      expect(config.ignorePatterns).toEqual(DEFAULT_CONFIG.ignorePatterns);
      expect(config.maxDepth).toBe(10);
    });

    it("should load and merge JSON config", async () => {
      writeFileSync(
        resolve(TEST_DIR, ".sawrinrc.json"),
        JSON.stringify({
          brunoPath: "./api-tests",
          maxDepth: 5,
        }),
      );

      const config = await loadConfig(TEST_DIR);
      expect(config.brunoPath).toBe("./api-tests");
      expect(config.maxDepth).toBe(5);
      // Default values should still be present
      expect(config.ignorePatterns).toEqual(DEFAULT_CONFIG.ignorePatterns);
    });

    it("should load custom ignore patterns", async () => {
      writeFileSync(
        resolve(TEST_DIR, ".sawrinrc.json"),
        JSON.stringify({
          ignorePatterns: ["**/vendor/**", "**/tmp/**"],
        }),
      );

      const config = await loadConfig(TEST_DIR);
      expect(config.ignorePatterns).toEqual(["**/vendor/**", "**/tmp/**"]);
    });
  });

  describe("mergeConfig", () => {
    it("should merge user config with defaults", () => {
      const userConfig = {
        brunoPath: "./tests/bruno",
        riskWeights: { authSecurityFile: 5 },
      };

      const merged = mergeConfig(DEFAULT_CONFIG, userConfig);

      expect(merged.brunoPath).toBe("./tests/bruno");
      expect(merged.riskWeights?.authSecurityFile).toBe(5);
      expect(merged.ignorePatterns).toEqual(DEFAULT_CONFIG.ignorePatterns);
    });

    it("should override arrays completely", () => {
      const userConfig = {
        testPatterns: ["**/*.test.ts"],
      };

      const merged = mergeConfig(DEFAULT_CONFIG, userConfig);
      expect(merged.testPatterns).toEqual(["**/*.test.ts"]);
    });
  });

  describe("validateConfig", () => {
    it("should return no warnings for valid config", () => {
      const warnings = validateConfig({
        maxDepth: 10,
        riskWeights: { authSecurityFile: 5 },
      });
      expect(warnings).toEqual([]);
    });

    it("should warn for invalid maxDepth", () => {
      const warnings = validateConfig({ maxDepth: 100 });
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain("maxDepth");
    });

    it("should warn for invalid riskWeights", () => {
      const warnings = validateConfig({
        riskWeights: { authSecurityFile: 15 },
      });
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe("shouldIgnoreFile", () => {
    it("should match node_modules", () => {
      const config = { ignorePatterns: ["**/node_modules/**"] };
      expect(shouldIgnoreFile("node_modules/lodash/index.js", config)).toBe(
        true,
      );
      expect(shouldIgnoreFile("src/utils.ts", config)).toBe(false);
    });

    it("should match dist folder", () => {
      const config = { ignorePatterns: ["**/dist/**"] };
      expect(shouldIgnoreFile("dist/index.js", config)).toBe(true);
      expect(shouldIgnoreFile("src/index.ts", config)).toBe(false);
    });
  });

  describe("isConfiguredTestFile", () => {
    it("should match test patterns", () => {
      const config = { testPatterns: ["**/*.test.ts", "**/*.spec.ts"] };
      expect(isConfiguredTestFile("src/user.test.ts", config)).toBe(true);
      expect(isConfiguredTestFile("src/user.spec.ts", config)).toBe(true);
      expect(isConfiguredTestFile("src/user.ts", config)).toBe(false);
    });
  });

  describe("isHighRiskFile", () => {
    it("should match high risk patterns", () => {
      const config = { highRiskFiles: ["**/payment/**", "**/crypto/**"] };
      expect(isHighRiskFile("src/payment/handler.ts", config)).toBe(true);
      expect(isHighRiskFile("src/user/profile.ts", config)).toBe(false);
    });
  });

  describe("isLowRiskFile", () => {
    it("should match low risk patterns", () => {
      const config = { lowRiskFiles: ["**/docs/**", "**/*.md"] };
      expect(isLowRiskFile("docs/readme.md", config)).toBe(true);
      expect(isLowRiskFile("src/index.ts", config)).toBe(false);
    });
  });
});

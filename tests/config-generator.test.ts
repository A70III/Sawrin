import { describe, it, expect, vi, afterEach } from "vitest";
import { generateConfigFile } from "../src/core/config-generator.js";
import * as fs from "fs";
import { resolve } from "path";

vi.mock("fs");

describe("configGenerator", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should create config file if none exists", async () => {
    // Mock existsSync to return false (file doesn't exist)
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    // Mock writeFileSync
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    const result = await generateConfigFile("/project");

    expect(result).toBe(true);
    expect(writeSpy).toHaveBeenCalled();
    expect(writeSpy.mock.calls[0][0]).toContain(".sawrinrc.json");
  });

  it("should not overwrite existing config", async () => {
    // Mock existsSync to return true
    vi.spyOn(fs, "existsSync").mockReturnValue(true);

    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await generateConfigFile("/project");

    expect(result).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

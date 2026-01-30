// ============================================
// Sawrin - Config Generator
// ============================================
// Generate default configuration file

import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { DEFAULT_CONFIG } from "./config.js";

/**
 * Generate a default configuration file in the project root
 */
export async function generateConfigFile(rootPath: string): Promise<boolean> {
  const configPath = resolve(rootPath, ".sawrinrc.json");

  // Check if config already exists
  if (existsSync(configPath)) {
    console.warn("⚠️  Configuration file .sawrinrc.json already exists.");
    return false;
  }

  // Check for other potential config files
  const otherConfigs = ["sawrin.config.js", "sawrin.config.json", ".sawrinrc"];

  for (const file of otherConfigs) {
    if (existsSync(resolve(rootPath, file))) {
      console.warn(`⚠️  Configuration file ${file} already exists.`);
      return false;
    }
  }

  try {
    // Write default config to file
    const content = JSON.stringify(DEFAULT_CONFIG, null, 2);
    writeFileSync(configPath, content, "utf-8");

    console.log("✅ Created .sawrinrc.json with default configuration.");
    return true;
  } catch (error) {
    console.error("❌ Failed to create configuration file:", error);
    return false;
  }
}

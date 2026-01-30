// ============================================
// Sawrin - Cache Manager
// ============================================
// Manages caching of dependency graph to speed up analysis

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { createHash } from "crypto";
import { logger } from "../shared/logger.js";

/**
 * Cache entry for a single file
 */
export interface CacheEntry {
  /** MD5 hash of the file content */
  hash: string;
  /** List of imported file paths */
  imports: string[];
  /** Last updated timestamp */
  timestamp: number;
}

/**
 * Structure of the cache file
 */
export interface CacheData {
  version: string;
  entries: Record<string, CacheEntry>;
}

/**
 * Manages the dependency graph cache
 */
export class CacheManager {
  private cachePath: string;
  private data: CacheData;
  private isDirty: boolean = false;
  private readonly VERSION = "1.0.0";

  constructor(projectRoot: string, cacheDir: string = ".cache/sawrin") {
    this.cachePath = resolve(projectRoot, cacheDir, "deptree.json");
    this.data = { version: this.VERSION, entries: {} };
    this.load();
  }

  /**
   * Load cache from disk
   */
  private load(): void {
    if (existsSync(this.cachePath)) {
      try {
        const content = readFileSync(this.cachePath, "utf-8");
        const loaded = JSON.parse(content);

        // Version check - invalidate if mismatch
        if (loaded.version === this.VERSION) {
          this.data = loaded;
        } else {
          // Reset if version differs
          this.data = { version: this.VERSION, entries: {} };
        }
      } catch (error) {
        // Assume corrupted cache, start fresh
        logger.warn("Failed to load cache, starting fresh");
        this.data = { version: this.VERSION, entries: {} };
      }
    }
  }

  /**
   * Save cache to disk if modified
   */
  public save(): void {
    if (!this.isDirty) return;

    try {
      const dir = dirname(this.cachePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.cachePath, JSON.stringify(this.data, null, 2));
      this.isDirty = false;
    } catch (error) {
      logger.warn("Failed to save cache:", error);
    }
  }

  /**
   * Calculate MD5 hash of a file content
   */
  public getFileHash(content: string): string {
    return createHash("md5").update(content).digest("hex");
  }

  /**
   * Get cached imports for a file if hash matches
   */
  public get(filePath: string, currentHash: string): string[] | null {
    const entry = this.data.entries[filePath];
    if (entry && entry.hash === currentHash) {
      return entry.imports;
    }
    return null;
  }

  /**
   * Set cached imports for a file
   */
  public set(filePath: string, hash: string, imports: string[]): void {
    this.data.entries[filePath] = {
      hash,
      imports,
      timestamp: Date.now(),
    };
    this.isDirty = true;
  }

  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.data = { version: this.VERSION, entries: {} };
    this.isDirty = true;
    this.save();
  }
}

// ============================================
// Sawrin - Git Operations
// ============================================
// Wrapper for git commands to retrieve diff and other info

import { execSync } from "child_process";
import type { GitDiffOptions } from "../types/index.js";

/**
 * Get the git diff as a string
 */
export function getDiff(options: GitDiffOptions = {}): string {
  const { base, head, staged } = options;

  let command: string;

  if (base && head) {
    // Compare two commits/branches
    command = `git diff ${base}...${head}`;
  } else if (base) {
    // Compare base to working tree
    command = `git diff ${base}`;
  } else if (staged) {
    // Compare staged changes
    command = "git diff --cached";
  } else {
    // Default: working tree changes (staged + unstaged)
    command = "git diff HEAD";
  }

  try {
    return execSync(command, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (error) {
    // If HEAD doesn't exist (new repo), try without it
    if (!base && !head && !staged) {
      try {
        return execSync("git diff", {
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
        });
      } catch {
        return "";
      }
    }
    throw error;
  }
}

/**
 * Get changed files using --name-status (faster)
 */
export function getDiffNameStatus(options: GitDiffOptions = {}): string {
  const { base, head, staged } = options;

  let command: string;

  if (base && head) {
    command = `git diff --name-status ${base}...${head}`;
  } else if (base) {
    command = `git diff --name-status ${base}`;
  } else if (staged) {
    command = "git diff --name-status --cached";
  } else {
    command = "git diff --name-status HEAD";
  }

  try {
    return execSync(command, { encoding: "utf-8" });
  } catch {
    try {
      return execSync("git diff --name-status", { encoding: "utf-8" });
    } catch {
      return "";
    }
  }
}

/**
 * Check if current directory is a git repository
 */
export function isGitRepository(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the root directory of the git repository
 */
export function getGitRoot(): string {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
  } catch {
    return process.cwd();
  }
}

/**
 * Get list of all tracked files in the repository
 */
export function getTrackedFiles(): string[] {
  try {
    const output = execSync("git ls-files", { encoding: "utf-8" });
    return output
      .trim()
      .split("\n")
      .filter((line) => line.trim());
  } catch {
    return [];
  }
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
}

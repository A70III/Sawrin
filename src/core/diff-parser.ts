// ============================================
// Sawrin - Diff Parser
// ============================================
// Parses git diff output into structured ChangedFile objects

import type { ChangedFile } from "../types/index.js";

/**
 * Parse a git diff string into an array of changed files
 * Supports unified diff format from `git diff` command
 */
export function parseDiff(diffString: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const lines = diffString.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Look for diff header: "diff --git a/path b/path"
    if (line.startsWith("diff --git ")) {
      const file = parseDiffHeader(lines, i);
      if (file) {
        files.push(file);
      }
    }

    i++;
  }

  return files;
}

/**
 * Parse a single diff header section
 */
function parseDiffHeader(
  lines: string[],
  startIndex: number,
): ChangedFile | null {
  const diffLine = lines[startIndex];

  // Extract paths from "diff --git a/path b/path"
  const match = diffLine.match(/^diff --git a\/(.+) b\/(.+)$/);
  if (!match) return null;

  const [, oldPath, newPath] = match;

  // Look ahead to determine change type
  let changeType: ChangedFile["changeType"] = "modified";
  let i = startIndex + 1;

  while (i < lines.length && !lines[i].startsWith("diff --git ")) {
    const line = lines[i];

    if (line.startsWith("new file mode")) {
      changeType = "added";
      break;
    }
    if (line.startsWith("deleted file mode")) {
      changeType = "deleted";
      break;
    }
    if (line.startsWith("rename from")) {
      changeType = "renamed";
      break;
    }
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      // Reached the actual diff content, stop looking
      break;
    }

    i++;
  }

  const result: ChangedFile = {
    path: newPath,
    changeType,
  };

  if (changeType === "renamed" && oldPath !== newPath) {
    result.oldPath = oldPath;
  }

  return result;
}

/**
 * Parse the --name-status output format (faster for just getting file list)
 * Format: "M\tpath/to/file" or "R100\told\tnew"
 */
export function parseNameStatus(output: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const lines = output
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 2) continue;

    const [status, ...paths] = parts;
    const statusChar = status.charAt(0);

    let changeType: ChangedFile["changeType"];
    let path: string;
    let oldPath: string | undefined;

    switch (statusChar) {
      case "A":
        changeType = "added";
        path = paths[0];
        break;
      case "D":
        changeType = "deleted";
        path = paths[0];
        break;
      case "M":
        changeType = "modified";
        path = paths[0];
        break;
      case "R":
        changeType = "renamed";
        oldPath = paths[0];
        path = paths[1] || paths[0];
        break;
      default:
        changeType = "modified";
        path = paths[0];
    }

    const file: ChangedFile = { path, changeType };
    if (oldPath) file.oldPath = oldPath;
    files.push(file);
  }

  return files;
}

/**
 * Extract just the file paths from a diff (convenience function)
 */
export function getChangedPaths(diffString: string): string[] {
  return parseDiff(diffString).map((f) => f.path);
}

// ============================================
// Sawrin - Diff Parser Tests
// ============================================

import { describe, it, expect } from "vitest";
import {
  parseDiff,
  parseNameStatus,
  getChangedPaths,
} from "../src/core/diff-parser.js";

describe("parseDiff", () => {
  it("should parse a simple modified file diff", () => {
    const diff = `diff --git a/src/user.ts b/src/user.ts
index abc1234..def5678 100644
--- a/src/user.ts
+++ b/src/user.ts
@@ -1,5 +1,6 @@
 export class User {
+  name: string;
 }`;

    const result = parseDiff(diff);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/user.ts");
    expect(result[0].changeType).toBe("modified");
  });

  it("should parse a new file diff", () => {
    const diff = `diff --git a/src/new-file.ts b/src/new-file.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new-file.ts
@@ -0,0 +1,3 @@
+export const hello = 'world';`;

    const result = parseDiff(diff);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/new-file.ts");
    expect(result[0].changeType).toBe("added");
  });

  it("should parse a deleted file diff", () => {
    const diff = `diff --git a/src/old-file.ts b/src/old-file.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old-file.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export const old = 'file';`;

    const result = parseDiff(diff);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/old-file.ts");
    expect(result[0].changeType).toBe("deleted");
  });

  it("should parse a renamed file diff", () => {
    const diff = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 95%
rename from src/old-name.ts
rename to src/new-name.ts
index abc1234..def5678 100644`;

    const result = parseDiff(diff);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/new-name.ts");
    expect(result[0].changeType).toBe("renamed");
    expect(result[0].oldPath).toBe("src/old-name.ts");
  });

  it("should parse multiple files", () => {
    const diff = `diff --git a/src/user.ts b/src/user.ts
index abc1234..def5678 100644
--- a/src/user.ts
+++ b/src/user.ts
@@ -1 +1 @@
-old
+new
diff --git a/src/auth.ts b/src/auth.ts
index 111..222 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1 +1 @@
-old
+new`;

    const result = parseDiff(diff);

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("src/user.ts");
    expect(result[1].path).toBe("src/auth.ts");
  });

  it("should handle empty diff", () => {
    const result = parseDiff("");
    expect(result).toHaveLength(0);
  });
});

describe("parseNameStatus", () => {
  it("should parse modified file", () => {
    const output = "M\tsrc/user.ts";
    const result = parseNameStatus(output);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/user.ts");
    expect(result[0].changeType).toBe("modified");
  });

  it("should parse added file", () => {
    const output = "A\tsrc/new-file.ts";
    const result = parseNameStatus(output);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/new-file.ts");
    expect(result[0].changeType).toBe("added");
  });

  it("should parse deleted file", () => {
    const output = "D\tsrc/old-file.ts";
    const result = parseNameStatus(output);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/old-file.ts");
    expect(result[0].changeType).toBe("deleted");
  });

  it("should parse renamed file", () => {
    const output = "R100\tsrc/old-name.ts\tsrc/new-name.ts";
    const result = parseNameStatus(output);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/new-name.ts");
    expect(result[0].changeType).toBe("renamed");
    expect(result[0].oldPath).toBe("src/old-name.ts");
  });

  it("should parse multiple files", () => {
    const output = `M\tsrc/user.ts
A\tsrc/new.ts
D\tsrc/old.ts`;

    const result = parseNameStatus(output);

    expect(result).toHaveLength(3);
    expect(result[0].changeType).toBe("modified");
    expect(result[1].changeType).toBe("added");
    expect(result[2].changeType).toBe("deleted");
  });

  it("should handle empty output", () => {
    const result = parseNameStatus("");
    expect(result).toHaveLength(0);
  });
});

describe("getChangedPaths", () => {
  it("should extract just the file paths", () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts`;

    const result = getChangedPaths(diff);

    expect(result).toEqual(["src/a.ts", "src/b.ts"]);
  });
});

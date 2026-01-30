/**
 * Shared glob matching utility
 * Supports * (wildcard), ** (globstar), and {a,b} (brace expansion)
 */
export function matchGlobPattern(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  // 1. Escape special regex characters except * ? { } ,
  let regexPattern = normalizedPattern.replace(/[.+^$()|[\]\\]/g, "\\$&");

  // 2. Handle brace expansion {a,b} -> (a|b)
  regexPattern = regexPattern
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/,/g, "|");

  // 3. Handle wildcards
  // Use placeholder for ** to avoid replacing * inside .* later
  regexPattern = regexPattern
    .replace(/\*\*/g, "%%GLOBSTAR%%")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");

  // If original pattern started with **/, allow optional leading path
  if (normalizedPattern.startsWith("**/")) {
    // regexPattern currently starts with %%GLOBSTAR%%/ due to step 3
    // Remove the leading "%%GLOBSTAR%%/" (length 13)
    const rest = regexPattern.slice(13);

    // Restore placeholder in rest of string
    const content = rest.replace(/%%GLOBSTAR%%/g, ".*");

    const regex = new RegExp(`^(?:.*/)?${content}$`);
    return regex.test(normalizedPath);
  }

  // Restore placeholder for normal cases
  regexPattern = regexPattern.replace(/%%GLOBSTAR%%/g, ".*");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedPath);
}

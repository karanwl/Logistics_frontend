import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components", "hooks"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const ALLOWED_MARKERS = [
  "readErrorMessage(",
  "setFormError(",
  "new ApiError(",
  "toErrorResponse(",
  "normalizeError(",
  "error-normalization-ignore",
];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".test-dist" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!EXTENSIONS.has(ext)) continue;
    out.push(full);
  }
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findBlockEnd(text, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function validateFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const violations = [];
  const catchRegex = /catch\s*\(([^)]*)\)\s*\{/g;
  let match;
  while ((match = catchRegex.exec(text)) !== null) {
    const catchStart = match.index;
    const braceIndex = catchRegex.lastIndex - 1;
    const end = findBlockEnd(text, braceIndex);
    if (end < 0) continue;
    const body = text.slice(braceIndex + 1, end);
    const normalized = ALLOWED_MARKERS.some((marker) => body.includes(marker));
    if (!normalized) {
      violations.push({
        line: lineNumberAt(text, catchStart),
        snippet: match[0],
      });
    }
  }
  return violations;
}

const files = [];
for (const dir of TARGET_DIRS) {
  walk(path.join(ROOT, dir), files);
}

const failures = [];
for (const file of files) {
  const violations = validateFile(file);
  if (violations.length === 0) continue;
  for (const violation of violations) {
    failures.push(`${path.relative(ROOT, file)}:${violation.line}: ${violation.snippet}`);
  }
}

if (failures.length > 0) {
  console.error("Found catch blocks without normalized error handling:");
  for (const item of failures) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`Error normalization check passed for ${files.length} files.`);

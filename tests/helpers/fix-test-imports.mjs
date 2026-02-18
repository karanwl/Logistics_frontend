import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const JS_EXTENSION_PATTERN = /\.(?:[cm]?js|json|node)$/i;
const RELATIVE_IMPORT_PATTERN = /(from\s+["'])(\.\.?\/[^"']+)(["'])/g;
const ALIAS_IMPORT_PATTERN = /(from\s+["'])@\/([^"']+)(["'])/g;

async function listJavaScriptFiles(rootDir) {
  const output = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.pop();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".js")) {
        output.push(fullPath);
      }
    }
  }

  return output;
}

function patchRelativeImports(source) {
  return source.replace(RELATIVE_IMPORT_PATTERN, (_match, prefix, specifier, suffix) => {
    if (JS_EXTENSION_PATTERN.test(specifier)) {
      return `${prefix}${specifier}${suffix}`;
    }
    return `${prefix}${specifier}.js${suffix}`;
  });
}

function patchAliasImports(source, filePath, distRoot) {
  return source.replace(ALIAS_IMPORT_PATTERN, (_match, prefix, aliasPath, suffix) => {
    const withExtension = JS_EXTENSION_PATTERN.test(aliasPath) ? aliasPath : `${aliasPath}.js`;
    const absoluteTarget = path.join(distRoot, withExtension);
    let relativeTarget = path.relative(path.dirname(filePath), absoluteTarget).replace(/\\/g, "/");
    if (!relativeTarget.startsWith(".")) {
      relativeTarget = `./${relativeTarget}`;
    }
    return `${prefix}${relativeTarget}${suffix}`;
  });
}

async function main() {
  const distRoot = path.resolve(process.cwd(), ".test-dist");
  const jsFiles = await listJavaScriptFiles(distRoot);

  await Promise.all(
    jsFiles.map(async (filePath) => {
      const original = await readFile(filePath, "utf8");
      const patched = patchAliasImports(patchRelativeImports(original), filePath, distRoot);
      if (patched !== original) {
        await writeFile(filePath, patched, "utf8");
      }
    })
  );
}

main().catch((error) => {
  console.error("Failed to patch .test-dist imports", error);
  process.exitCode = 1;
});

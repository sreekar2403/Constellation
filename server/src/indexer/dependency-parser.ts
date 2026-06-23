import * as path from 'node:path';

export interface Dependency {
  source: string;      // file that imports
  target: string;      // imported file/path
  type: 'import' | 'require' | 'dynamic';
}

// Patterns for different import styles
const IMPORT_PATTERNS = {
  // ES modules: import ... from '...'
  esm: /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g,
  // CommonJS: require('...')
  require: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Dynamic import: import('...')
  dynamic: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // TypeScript triple-slash reference
  tripleSlash: /\/\/\/\s*<reference\s+path\s*=\s*['"]([^'"]+)['"]\s*\/>/g,
};

// Extensions to parse
const PARSEABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.vue', '.svelte',
]);

/**
 * Extract dependencies from file content.
 * Returns array of dependencies with source and target paths.
 */
export function extractDependencies(
  filePath: string,
  content: string
): Dependency[] {
  const ext = path.extname(filePath).toLowerCase();
  if (!PARSEABLE_EXTENSIONS.has(ext)) {
    return [];
  }

  const dependencies: Dependency[] = [];
  const fileDir = path.dirname(filePath);

  // Extract imports using patterns
  for (const [type, pattern] of Object.entries(IMPORT_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(content)) !== null) {
      const importPath = match[1];

      // Skip node_modules imports and external packages
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        continue;
      }

      // Resolve relative path
      let targetPath: string;
      if (importPath.startsWith('.')) {
        targetPath = path.resolve(fileDir, importPath);
      } else {
        targetPath = importPath;
      }

      dependencies.push({
        source: filePath,
        target: targetPath,
        type: type as Dependency['type'],
      });
    }
  }

  return dependencies;
}

/**
 * Resolve import path to actual file path.
 * Handles index files and extensions.
 */
export async function resolveImportPath(
  importPath: string,
  basePath: string
): Promise<string | null> {
  const fs = await import('node:fs/promises');
  const pathMod = await import('node:path');

  // Try direct path
  if (await fileExists(importPath)) {
    return importPath;
  }

  // Try with common extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
  for (const ext of extensions) {
    const withExt = importPath + ext;
    if (await fileExists(withExt)) {
      return withExt;
    }
  }

  // Try as directory with index file
  for (const ext of extensions) {
    const indexPath = pathMod.join(importPath, `index${ext}`);
    if (await fileExists(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import('node:fs/promises');
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

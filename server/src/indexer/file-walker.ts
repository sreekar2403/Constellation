import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface FileNode {
  id: string;              // relative path from root
  name: string;            // filename
  path: string;            // absolute path
  type: 'file' | 'directory';
  extension: string;
  size: number;
}

/**
 * Walk directory tree recursively and return all files/directories.
 * Skips hidden files, node_modules, and common build directories.
 */
export async function walkDirectory(
  rootPath: string,
  options: {
    maxDepth?: number;
    ignorePatterns?: string[];
  } = {}
): Promise<FileNode[]> {
  const { maxDepth = 10, ignorePatterns = [] } = options;
  const defaultIgnore = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.cache',
    'coverage',
    '__pycache__',
    '.venv',
    'venv',
  ];
  const ignore = [...defaultIgnore, ...ignorePatterns];

  const nodes: FileNode[] = [];

  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files and ignored directories
        if (entry.name.startsWith('.') || ignore.includes(entry.name)) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootPath, fullPath);
        const ext = path.extname(entry.name).toLowerCase();

        if (entry.isDirectory()) {
          nodes.push({
            id: relativePath,
            name: entry.name,
            path: fullPath,
            type: 'directory',
            extension: '',
            size: 0,
          });

          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(fullPath);
            nodes.push({
              id: relativePath,
              name: entry.name,
              path: fullPath,
              type: 'file',
              extension: ext,
              size: stat.size,
            });
          } catch {
            // Skip files we can't stat
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walk(rootPath, 0);
  return nodes;
}

/**
 * Get file content for embedding generation.
 */
export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Limit content size for embedding (first 8KB)
    return content.slice(0, 8192);
  } catch {
    return null;
  }
}

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  children?: FileEntry[];
}

/**
 * List files and directories at a given path.
 * Returns basic info (name, path, type, size).
 */
export async function listDirectory(dirPath: string): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      // Skip hidden files and node_modules
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;

      const fullPath = path.join(dirPath, item.name);

      try {
        if (item.isDirectory()) {
          entries.push({
            name: item.name,
            path: fullPath,
            type: 'directory',
            size: 0,
          });
        } else if (item.isFile()) {
          const stat = await fs.stat(fullPath);
          entries.push({
            name: item.name,
            path: fullPath,
            type: 'file',
            size: stat.size,
          });
        }
      } catch {
        // Skip inaccessible entries
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
    throw new Error(`Cannot read directory: ${dirPath}`);
  }

  // Sort: directories first, then files, alphabetically
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

/**
 * Recursively build a full tree (limited depth to avoid huge payloads).
 */
export async function buildTree(
  rootPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<FileEntry[]> {
  if (currentDepth > maxDepth) return [];

  const entries: FileEntry[] = [];

  try {
    const items = await fs.readdir(rootPath, { withFileTypes: true });

    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;

      const fullPath = path.join(rootPath, item.name);

      try {
        if (item.isDirectory()) {
          const children = await buildTree(fullPath, maxDepth, currentDepth + 1);
          entries.push({
            name: item.name,
            path: fullPath,
            type: 'directory',
            size: 0,
            children,
          });
        } else if (item.isFile()) {
          const stat = await fs.stat(fullPath);
          entries.push({
            name: item.name,
            path: fullPath,
            type: 'file',
            size: stat.size,
          });
        }
      } catch {
        // Skip inaccessible
      }
    }
  } catch {
    return [];
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

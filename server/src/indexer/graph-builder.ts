import { walkDirectory, readFileContent, FileNode } from './file-walker.js';
import { extractDependencies, Dependency } from './dependency-parser.js';
import { generateEmbeddings, EmbeddingResult } from './ollama-client.js';
import { findSimilarEdges, SimilarityEdge } from './similarity.js';

export interface GraphNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  extension: string;
  size: number;
  embedding?: number[];
  agentActivity?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'import' | 'similarity' | 'reference';
  weight: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootPath: string;
  lastIndexed: Date;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalEdges: number;
    indexTimeMs: number;
  };
}

export interface IndexProgress {
  phase: 'walking' | 'parsing' | 'embedding' | 'building';
  current: number;
  total: number;
  message: string;
}

/**
 * Build a knowledge graph from a directory.
 */
export async function buildGraph(
  rootPath: string,
  onProgress?: (progress: IndexProgress) => void
): Promise<Graph> {
  const startTime = Date.now();

  // Phase 1: Walk directory
  onProgress?.({
    phase: 'walking',
    current: 0,
    total: 0,
    message: 'Scanning directory...',
  });

  const fileNodes = await walkDirectory(rootPath);
  const files = fileNodes.filter((n) => n.type === 'file');
  const directories = fileNodes.filter((n) => n.type === 'directory');

  onProgress?.({
    phase: 'walking',
    current: fileNodes.length,
    total: fileNodes.length,
    message: `Found ${files.length} files, ${directories.length} directories`,
  });

  // Phase 2: Parse dependencies
  onProgress?.({
    phase: 'parsing',
    current: 0,
    total: files.length,
    message: 'Parsing file dependencies...',
  });

  const allDependencies: Dependency[] = [];
  for (let i = 0; i < files.length; i++) {
    const content = await readFileContent(files[i].path);
    if (content) {
      const deps = extractDependencies(files[i].path, content);
      allDependencies.push(...deps);
    }

    if (i % 100 === 0) {
      onProgress?.({
        phase: 'parsing',
        current: i,
        total: files.length,
        message: `Parsed ${i}/${files.length} files`,
      });
    }
  }

  // Phase 3: Generate embeddings
  onProgress?.({
    phase: 'embedding',
    current: 0,
    total: files.length,
    message: 'Generating embeddings...',
  });

  const embeddingInputs: { id: string; text: string }[] = [];
  for (const file of files) {
    const content = await readFileContent(file.path);
    if (content) {
      // Use filename + first 512 chars for embedding
      const text = `${file.name}\n${content.slice(0, 512)}`;
      embeddingInputs.push({ id: file.id, text });
    }
  }

  const embeddings = await generateEmbeddings(embeddingInputs);

  onProgress?.({
    phase: 'embedding',
    current: files.length,
    total: files.length,
    message: `Generated ${embeddings.length} embeddings`,
  });

  // Phase 4: Build graph
  onProgress?.({
    phase: 'building',
    current: 0,
    total: files.length + directories.length,
    message: 'Building graph...',
  });

  // Create nodes
  const nodes: GraphNode[] = fileNodes.map((file) => {
    const embedding = embeddings.find((e) => e.id === file.id);
    return {
      id: file.id,
      name: file.name,
      type: file.type,
      extension: file.extension,
      size: file.size,
      embedding: embedding?.embedding,
    };
  });

  // Create edges from dependencies
  const dependencyEdges: GraphEdge[] = allDependencies
    .filter((dep) => {
      // Only include edges where both source and target exist in our graph
      const sourceExists = nodes.some((n) => n.id === dep.source || dep.source.includes(n.id));
      const targetExists = nodes.some((n) => n.id === dep.target || dep.target.includes(n.id));
      return sourceExists && targetExists;
    })
    .map((dep) => ({
      source: dep.source,
      target: dep.target,
      type: dep.type as GraphEdge['type'],
      weight: 1.0,
    }));

  // Create edges from similarity
  const embeddingsWithId = embeddings.filter((e) => e.embedding.length > 0);
  const similarityEdges: SimilarityEdge[] = findSimilarEdges(
    embeddingsWithId,
    0.7,  // threshold
    3     // max edges per node
  );

  const allEdges: GraphEdge[] = [
    ...dependencyEdges,
    ...similarityEdges.map((se) => ({
      source: se.source,
      target: se.target,
      type: 'similarity' as const,
      weight: se.weight,
    })),
  ];

  // Deduplicate edges
  const uniqueEdges = deduplicateEdges(allEdges);

  const indexTimeMs = Date.now() - startTime;

  onProgress?.({
    phase: 'building',
    current: nodes.length,
    total: nodes.length,
    message: `Graph built in ${indexTimeMs}ms`,
  });

  return {
    nodes,
    edges: uniqueEdges,
    rootPath,
    lastIndexed: new Date(),
    stats: {
      totalFiles: files.length,
      totalDirectories: directories.length,
      totalEdges: uniqueEdges.length,
      indexTimeMs,
    },
  };
}

/**
 * Deduplicate edges by source+target pair.
 */
function deduplicateEdges(edges: GraphEdge[]): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();

  for (const edge of edges) {
    const key = `${edge.source}->${edge.target}`;
    const reverseKey = `${edge.target}->${edge.source}`;

    // Keep the edge with higher weight
    if (!edgeMap.has(key) || edgeMap.get(key)!.weight < edge.weight) {
      edgeMap.set(key, edge);
    }
    // Also check reverse direction
    if (!edgeMap.has(reverseKey) || edgeMap.get(reverseKey)!.weight < edge.weight) {
      edgeMap.set(reverseKey, edge);
    }
  }

  return Array.from(edgeMap.values());
}

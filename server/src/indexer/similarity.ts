/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

export interface SimilarityEdge {
  source: string;
  target: string;
  weight: number;
}

/**
 * Find similar items based on embedding vectors.
 * Returns edges with similarity above threshold.
 */
export function findSimilarEdges(
  items: { id: string; embedding: number[] }[],
  threshold: number = 0.7,
  maxEdgesPerNode: number = 5
): SimilarityEdge[] {
  const edges: SimilarityEdge[] = [];

  for (let i = 0; i < items.length; i++) {
    const similarities: { index: number; score: number }[] = [];

    for (let j = i + 1; j < items.length; j++) {
      const score = cosineSimilarity(items[i].embedding, items[j].embedding);
      if (score >= threshold) {
        similarities.push({ index: j, score });
      }
    }

    // Sort by similarity score (descending) and take top N
    similarities.sort((a, b) => b.score - a.score);
    const topMatches = similarities.slice(0, maxEdgesPerNode);

    for (const match of topMatches) {
      edges.push({
        source: items[i].id,
        target: items[match.index].id,
        weight: match.score,
      });
    }
  }

  return edges;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL_NAME = 'nomic-embed-text';

export interface EmbeddingResult {
  id: string;
  embedding: number[];
}

/**
 * Generate embeddings for a batch of texts using Ollama.
 * Uses the /api/embed endpoint (not legacy /api/embeddings).
 */
export async function generateEmbeddings(
  texts: { id: string; text: string }[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  // Process in batches of 10 to avoid overloading Ollama
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Process a batch of texts for embedding generation.
 */
async function processBatch(
  batch: { id: string; text: string }[]
): Promise<EmbeddingResult[]> {
  const input = batch.map((item) => item.text);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        input,
        truncate: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = (await response.json()) as { embeddings?: number[][] };

    // Ollama returns { embeddings: number[][] }
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error('Invalid response format from Ollama');
    }

    return batch.map((item, index) => ({
      id: item.id,
      embedding: data.embeddings![index],
    }));
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    // Return empty embeddings on failure
    return batch.map((item) => ({
      id: item.id,
      embedding: [],
    }));
  }
}

/**
 * Generate embedding for a single text.
 */
export async function generateSingleEmbedding(
  id: string,
  text: string
): Promise<EmbeddingResult> {
  const results = await generateEmbeddings([{ id, text }]);
  return results[0];
}

/**
 * Check if Ollama is available and the model is loaded.
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  modelLoaded: boolean;
}> {
  try {
    // Check if Ollama is running
    const healthResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!healthResponse.ok) {
      return { available: false, modelLoaded: false };
    }

    const tagsData = (await healthResponse.json()) as { models?: { name: string }[] };
    const models = tagsData.models || [];
    const modelLoaded = models.some(
      (m: { name: string }) => m.name === MODEL_NAME
    );

    return { available: true, modelLoaded };
  } catch {
    return { available: false, modelLoaded: false };
  }
}

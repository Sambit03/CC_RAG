import type { Collection } from 'chromadb';
import { generateEmbedding } from '../embed/index.js';
import { config } from '../config/index.js';

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  filter?: Record<string, any>;
}

export interface MetadataFilter {
  [key: string]: any;
}

export async function similaritySearch(
  collection: Collection,
  query: string,
  topK?: number
): Promise<SearchResult[]> {
  const k = topK || config.rag.topKResults;

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
    });

    return formatSearchResults(results);
  } catch (error) {
    throw new Error(`Similarity search failed: ${(error as Error).message}`);
  }
}

export async function searchWithFilter(
  collection: Collection,
  query: string,
  filter: MetadataFilter,
  topK?: number
): Promise<SearchResult[]> {
  const k = topK || config.rag.topKResults;

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
      where: filter,
    });

    return formatSearchResults(results);
  } catch (error) {
    throw new Error(`Filtered search failed: ${(error as Error).message}`);
  }
}

export async function searchWithThreshold(
  collection: Collection,
  query: string,
  minScore: number,
  topK?: number
): Promise<SearchResult[]> {
  const results = await similaritySearch(collection, query, topK);

  return results.filter((result) => result.score >= minScore);
}

export async function advancedSearch(
  collection: Collection,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { topK, minScore, filter } = options;

  let results: SearchResult[];

  if (filter) {
    results = await searchWithFilter(collection, query, filter, topK);
  } else {
    results = await similaritySearch(collection, query, topK);
  }

  if (minScore !== undefined) {
    results = results.filter((r) => r.score >= minScore);
  }

  return results;
}

export function rerankResults(results: SearchResult[], query: string): SearchResult[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/);

  return results
    .map((result) => {
      const textLower = result.text.toLowerCase();

      const keywordScore =
        queryTerms.reduce((score, term) => {
          return score + (textLower.includes(term) ? 1 : 0);
        }, 0) / queryTerms.length;

      const combinedScore = result.score * 0.7 + keywordScore * 0.3;

      return {
        ...result,
        score: combinedScore,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function diversifyResults(
  results: SearchResult[],
  similarityThreshold: number = 0.9
): SearchResult[] {
  const diverse: SearchResult[] = [];

  for (const result of results) {
    const isDuplicate = diverse.some((existing) => {
      const similarity = calculateTextSimilarity(existing.text, result.text);
      return similarity > similarityThreshold;
    });

    if (!isDuplicate) {
      diverse.push(result);
    }
  }

  return diverse;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function formatSearchResults(results: any): SearchResult[] {
  const ids = results.ids[0] || [];
  const documents = results.documents[0] || [];
  const distances = results.distances[0] || [];
  const metadatas = results.metadatas[0] || [];

  return ids.map((id: string, index: number) => ({
    id,
    text: documents[index],
    score: 1 - (distances[index] || 0),
    metadata: metadatas[index] || {},
  }));
}

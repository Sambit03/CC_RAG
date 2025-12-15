import { ChromaClient, Collection } from 'chromadb';
import { config } from '../config/index.js';
import type { TextChunk } from '../chunk/index.js';

let chromaClient: ChromaClient | null = null;

export interface CollectionOptions {
  name: string;
  metadata?: Record<string, any>;
  embeddingDimension?: number;
}

export interface VectorStore {
  client: ChromaClient;
  getCollection: (name: string) => Promise<Collection>;
  createCollection: (options: CollectionOptions) => Promise<Collection>;
  deleteCollection: (name: string) => Promise<void>;
  listCollections: () => Promise<string[]>;
}

export async function initializeVectorStore(): Promise<VectorStore> {
  if (!chromaClient) {
    chromaClient = new ChromaClient({
      path: config.vectorDb.chromaUrl,
    });
  }

  return {
    client: chromaClient,
    getCollection: (name: string) => getCollection(chromaClient!, name),
    createCollection: (options: CollectionOptions) => createCollection(chromaClient!, options),
    deleteCollection: (name: string) => deleteCollection(chromaClient!, name),
    listCollections: () => listCollections(chromaClient!),
  };
}

async function getCollection(client: ChromaClient, name: string): Promise<Collection> {
  try {
    return await client.getCollection({ name });
  } catch (error) {
    throw new Error(`Collection '${name}' not found: ${(error as Error).message}`);
  }
}

async function createCollection(
  client: ChromaClient,
  options: CollectionOptions
): Promise<Collection> {
  const { name, metadata = {} } = options;

  try {
    try {
      const existing = await client.getCollection({ name });
      console.warn(`Collection '${name}' already exists, returning existing collection`);
      return existing;
    } catch {
      return await client.createCollection({
        name,
        metadata,
      });
    }
  } catch (error) {
    throw new Error(`Failed to create collection '${name}': ${(error as Error).message}`);
  }
}

async function deleteCollection(client: ChromaClient, name: string): Promise<void> {
  try {
    await client.deleteCollection({ name });
  } catch (error) {
    throw new Error(`Failed to delete collection '${name}': ${(error as Error).message}`);
  }
}

async function listCollections(client: ChromaClient): Promise<string[]> {
  try {
    const collections = await client.listCollections();
    return collections.map((c) => c.name);
  } catch (error) {
    throw new Error(`Failed to list collections: ${(error as Error).message}`);
  }
}

export async function addDocuments(
  collection: Collection,
  chunks: TextChunk[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error('Number of chunks must match number of embeddings');
  }

  try {
    const ids = chunks.map((chunk) => chunk.id);
    const documents = chunks.map((chunk) => chunk.text);
    const metadatas = chunks.map((chunk) => chunk.metadata);

    await collection.add({
      ids,
      documents,
      embeddings,
      metadatas,
    });
  } catch (error) {
    throw new Error(`Failed to add documents to collection: ${(error as Error).message}`);
  }
}

export async function getCollectionCount(collection: Collection): Promise<number> {
  try {
    return await collection.count();
  } catch (error) {
    throw new Error(`Failed to get collection count: ${(error as Error).message}`);
  }
}

export async function deleteDocuments(collection: Collection, ids: string[]): Promise<void> {
  try {
    await collection.delete({ ids });
  } catch (error) {
    throw new Error(`Failed to delete documents: ${(error as Error).message}`);
  }
}

export async function updateDocuments(
  collection: Collection,
  chunks: TextChunk[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error('Number of chunks must match number of embeddings');
  }

  try {
    const ids = chunks.map((chunk) => chunk.id);
    const documents = chunks.map((chunk) => chunk.text);
    const metadatas = chunks.map((chunk) => chunk.metadata);

    await collection.update({
      ids,
      documents,
      embeddings,
      metadatas,
    });
  } catch (error) {
    throw new Error(`Failed to update documents: ${(error as Error).message}`);
  }
}

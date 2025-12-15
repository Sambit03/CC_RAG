import OpenAI from 'openai';
import { config } from '../config/index.js';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }
  return openaiClient;
}

export async function generateEmbedding(text: string, model?: string): Promise<number[]> {
  const client = getOpenAIClient();
  const embeddingModel = model || config.openai.embeddingModel;

  try {
    const response = await client.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${(error as Error).message}`);
  }
}

export async function generateEmbeddingsBatch(
  texts: string[],
  options: {
    model?: string;
    batchSize?: number;
    delayMs?: number;
  } = {}
): Promise<number[][]> {
  const { model, batchSize = 100, delayMs = 1000 } = options;
  const client = getOpenAIClient();
  const embeddingModel = model || config.openai.embeddingModel;

  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      const response = await client.embeddings.create({
        model: embeddingModel,
        input: batch,
      });

      embeddings.push(...response.data.map((item) => item.embedding));

      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      throw new Error(
        `Failed to generate embeddings for batch ${i / batchSize + 1}: ${(error as Error).message}`
      );
    }
  }

  return embeddings;
}

export function getEmbeddingDimensions(model?: string): number {
  const embeddingModel = model || config.openai.embeddingModel;

  const dimensions: Record<string, number> = {
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'text-embedding-ada-002': 1536,
  };

  return dimensions[embeddingModel] || 1536;
}

export async function generateEmbeddingWithRetry(
  text: string,
  options: {
    model?: string;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<number[]> {
  const { model, maxRetries = 3, retryDelay = 1000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateEmbedding(text, model);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError?.message}`);
}

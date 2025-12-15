/**
 * Configuration Module
 * 
 * Responsibility:
 * - Load and validate environment variables
 * - Define application constants
 * - Provide typed configuration objects
 * - Handle different environments (dev, prod)
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_LLM_MODEL: z.string().default('gpt-4-turbo-preview'),
  
  // Vector Database Configuration
  VECTOR_DB_TYPE: z.enum(['chroma', 'qdrant']).default('chroma'),
  CHROMA_URL: z.string().default('http://localhost:8000'),
  
  // RAG Configuration
  CHUNK_SIZE: z.string().default('1000'),
  CHUNK_OVERLAP: z.string().default('200'),
  TOP_K_RESULTS: z.string().default('5'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  
  openai: {
    apiKey: env.OPENAI_API_KEY,
    embeddingModel: env.OPENAI_EMBEDDING_MODEL,
    llmModel: env.OPENAI_LLM_MODEL,
  },
  
  vectorDb: {
    type: env.VECTOR_DB_TYPE,
    chromaUrl: env.CHROMA_URL,
  },
  
  rag: {
    chunkSize: parseInt(env.CHUNK_SIZE, 10),
    chunkOverlap: parseInt(env.CHUNK_OVERLAP, 10),
    topKResults: parseInt(env.TOP_K_RESULTS, 10),
  },
} as const;

export const constants = {
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BATCH_SIZE: 100,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;

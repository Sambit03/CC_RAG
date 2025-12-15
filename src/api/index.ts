import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { crawlUrl } from '../crawl/index.js';
import { parseDocument } from '../parse/index.js';
import { cleanDocument } from '../clean/index.js';
import { smartChunk } from '../chunk/index.js';
import { generateEmbeddingsBatch } from '../embed/index.js';
import { initializeVectorStore, addDocuments } from '../vector-store/index.js';
import { similaritySearch, advancedSearch } from '../retrieve/index.js';
import { buildConversationPrompt } from '../prompt/index.js';
import { generateAnswer } from '../llm/index.js';
import { config } from '../config/index.js';

let vectorStore: Awaited<ReturnType<typeof initializeVectorStore>> | null = null;

async function getVectorStore() {
  if (!vectorStore) {
    vectorStore = await initializeVectorStore();
  }
  return vectorStore;
}

const IngestRequestSchema = z.object({
  url: z.string().url(),
  collectionName: z.string().min(1).default('default'),
  documentId: z.string().optional(),
});

const QueryRequestSchema = z.object({
  question: z.string().min(1),
  collectionName: z.string().min(1).default('default'),
  topK: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const DeleteCollectionSchema = z.object({
  name: z.string().min(1),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.post('/api/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = IngestRequestSchema.parse(request.body);
      const { url, collectionName, documentId } = body;

      app.log.info(`Ingesting document from: ${url}`);

      const crawlResult = await crawlUrl(url);
      if (crawlResult.error) {
        return reply.status(400).send({ error: `Failed to crawl URL: ${crawlResult.error}` });
      }

      const parsed = await parseDocument(crawlResult.content, crawlResult.contentType, url);
      const cleaned = cleanDocument(parsed.text);

      const docId = documentId || `doc-${Date.now()}`;
      const chunks = smartChunk(
        cleaned,
        {
          maxChunkSize: config.rag.chunkSize,
          chunkOverlap: config.rag.chunkOverlap,
        },
        docId,
        { ...parsed.metadata, url }
      );

      app.log.info(`Created ${chunks.length} chunks from document`);

      const texts = chunks.map((c) => c.text);
      const embeddings = await generateEmbeddingsBatch(texts);

      const store = await getVectorStore();
      const collection = await store.createCollection({ name: collectionName });
      await addDocuments(collection, chunks, embeddings);

      app.log.info(`Successfully ingested document into collection: ${collectionName}`);

      return {
        success: true,
        documentId: docId,
        chunksCreated: chunks.length,
        collectionName,
      };
    } catch (error) {
      app.log.error(error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: error.errors });
      }

      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  app.post('/api/query', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = QueryRequestSchema.parse(request.body);
      const { question, collectionName, topK, temperature } = body;

      app.log.info(`Processing query: ${question}`);

      const store = await getVectorStore();
      const collection = await store.getCollection(collectionName);

      const searchResults = await similaritySearch(collection, question, topK);

      if (searchResults.length === 0) {
        return {
          answer: "I don't have enough information in my knowledge base to answer this question.",
          sources: [],
        };
      }

      app.log.info(`Found ${searchResults.length} relevant chunks`);

      const { system, user } = buildConversationPrompt(question, searchResults);
      const answer = await generateAnswer(system, user, {
        temperature: temperature || 0.7,
      });

      return {
        answer,
        sources: searchResults.map((r) => ({
          text: r.text.substring(0, 200) + '...',
          score: r.score,
          metadata: r.metadata,
        })),
      };
    } catch (error) {
      app.log.error(error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: error.errors });
      }

      const errorMessage = (error as Error).message;
      if (errorMessage.includes('not found')) {
        return reply.status(404).send({ error: errorMessage });
      }

      return reply.status(500).send({ error: errorMessage });
    }
  });

  app.get('/api/collections', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const store = await getVectorStore();
      const collections = await store.listCollections();

      return {
        collections,
        count: collections.length,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  app.delete(
    '/api/collections/:name',
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      try {
        const { name } = request.params;

        const store = await getVectorStore();
        await store.deleteCollection(name);

        return {
          success: true,
          message: `Collection '${name}' deleted successfully`,
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: (error as Error).message });
      }
    }
  );

  app.post('/api/collections', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
        metadata: z.record(z.any()).optional(),
      });

      const body = schema.parse(request.body);
      const store = await getVectorStore();

      await store.createCollection({
        name: body.name,
        metadata: body.metadata,
      });

      return {
        success: true,
        collectionName: body.name,
      };
    } catch (error) {
      app.log.error(error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: error.errors });
      }

      return reply.status(500).send({ error: (error as Error).message });
    }
  });
}

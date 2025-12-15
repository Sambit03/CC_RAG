/**
 * RAG Q&A System Entry Point
 * 
 * This file bootstraps the Fastify server and initializes all modules.
 */

import Fastify from 'fastify';
import { config } from './config/index.js';
import { registerRoutes } from './api/index.js';

async function main() {
  // Create Fastify instance
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
  });

  // Register routes
  await registerRoutes(app);

  // Start server
  try {
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    
    console.log(`🚀 Server is running on http://localhost:${config.port}`);
    console.log(`📝 Environment: ${config.nodeEnv}`);
    console.log(`🤖 LLM Model: ${config.openai.llmModel}`);
    console.log(`📊 Vector DB: ${config.vectorDb.type}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

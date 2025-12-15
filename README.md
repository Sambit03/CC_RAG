# RAG-based Q&A System

A production-oriented TypeScript implementation of a Retrieval-Augmented Generation (RAG) system for question answering, built with Node.js and clear separation of concerns.

## Folder Structure

```
src/
├── crawl/          # Fetch HTML/PDF sources from URLs or file paths
├── parse/          # Parse HTML (cheerio) & PDF (pdf-parse) content
├── clean/          # Rule-based text cleaning and normalization
├── chunk/          # Section-based chunking with overlap
├── embed/          # Embedding generation using OpenAI
├── vector-store/   # Vector database setup (ChromaDB/Qdrant)
├── retrieve/       # Similarity search and retrieval logic
├── prompt/         # Prompt templates for context-only answering
├── llm/            # OpenAI LLM interaction and completion
├── api/            # Fastify routes for ingestion and querying
├── config/         # Environment variables and constants
└── index.ts        # Application entry point
```

### Module Responsibilities

| Module         | Purpose                                                               |
| -------------- | --------------------------------------------------------------------- |
| `crawl`        | HTTP client for fetching documents, handling different content types  |
| `parse`        | Extract text and metadata from HTML and PDF using specialized parsers |
| `clean`        | Remove noise, normalize text, strip boilerplate content               |
| `chunk`        | Split text into semantic chunks with configurable size and overlap    |
| `embed`        | Generate embeddings via OpenAI API with batching and rate limiting    |
| `vector-store` | Manage vector database connections, collections, and document storage |
| `retrieve`     | Query vector DB, rank results, implement retrieval strategies         |
| `prompt`       | Template management and prompt engineering for RAG                    |
| `llm`          | OpenAI API client for completions and streaming responses             |
| `api`          | REST endpoints for document ingestion and question answering          |
| `config`       | Centralized configuration with validation using Zod                   |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- OpenAI API key
- ChromaDB instance (or Qdrant)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd rag-qa-system
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your configuration:

   ```env
   OPENAI_API_KEY=your_api_key_here
   CHROMA_URL=http://localhost:8000
   ```

4. **Start ChromaDB (if using Docker)**
   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

### Running the Project

**Development mode** (with hot reload):

```bash
npm run dev
```

**Build for production**:

```bash
npm run build
npm start
```

**Linting and formatting**:

```bash
npm run lint
npm run format
```

### API Endpoints

Once running, the API will be available at `http://localhost:3000`:

- `GET /api/health` - Health check
- `POST /api/ingest` - Ingest documents into the knowledge base
- `POST /api/query` - Ask questions against the knowledge base
- `GET /api/collections` - List available collections
- `DELETE /api/collections/:id` - Delete a collection

## Development Philosophy

This project is designed as a **learning-focused repository** with these principles:

| Category         | Technology           |
| ---------------- | -------------------- |
| Runtime          | Node.js 18+          |
| Language         | TypeScript           |
| Web Framework    | Fastify              |
| Validation       | Zod                  |
| HTML Parsing     | Cheerio              |
| PDF Parsing      | pdf-parse            |
| Embeddings & LLM | OpenAI API           |
| Vector Database  | ChromaDB (or Qdrant) |
| Code Quality     | ESLint + Prettier    |

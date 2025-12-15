import type { SearchResult } from '../retrieve/index.js';

export const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based solely on the provided context.
If the context does not contain enough information to answer the question, say so clearly.
Do not make up information or use knowledge outside the provided context.
Always cite which parts of the context you used to formulate your answer.`;

export interface PromptOptions {
  includeMetadata?: boolean;
  maxContextLength?: number;
  citeSources?: boolean;
}

export function buildRAGPrompt(question: string, context: string[]): string {
  const formattedContext = context.map((chunk, index) => `[${index + 1}] ${chunk}`).join('\n\n');

  return `Context:
${formattedContext}

Question: ${question}

Answer:`;
}

export function formatContext(chunks: SearchResult[], options: PromptOptions = {}): string[] {
  const { includeMetadata = false, maxContextLength = 4000 } = options;

  let totalLength = 0;
  const formattedChunks: string[] = [];

  for (const chunk of chunks) {
    let formatted = chunk.text;

    if (includeMetadata && chunk.metadata) {
      const metadataStr = Object.entries(chunk.metadata)
        .filter(([key]) => key !== 'chunkIndex' && key !== 'startOffset' && key !== 'endOffset')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      if (metadataStr) {
        formatted = `${formatted}\n(Source: ${metadataStr})`;
      }
    }

    if (totalLength + formatted.length > maxContextLength) {
      break;
    }

    formattedChunks.push(formatted);
    totalLength += formatted.length;
  }

  return formattedChunks;
}

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildConversationPrompt(
  question: string,
  context: SearchResult[],
  options: PromptOptions = {}
): { system: string; user: string } {
  const formattedContext = formatContext(context, options);
  const userPrompt = buildRAGPrompt(question, formattedContext);

  return {
    system: getSystemPrompt(),
    user: userPrompt,
  };
}

export function buildPromptWithCitations(
  question: string,
  context: SearchResult[]
): { system: string; user: string } {
  const contextWithCitations = context.map((chunk, index) => {
    const sourceInfo = chunk.metadata.title || chunk.metadata.url || chunk.metadata.documentId;
    return `[Source ${index + 1}: ${sourceInfo}]\n${chunk.text}`;
  });

  const userPrompt = `Based on the following sources, please answer the question. Include source numbers in your answer.

${contextWithCitations.join('\n\n---\n\n')}

Question: ${question}

Answer (include [Source X] citations):`;

  return {
    system: SYSTEM_PROMPT,
    user: userPrompt,
  };
}

export function buildFewShotPrompt(
  question: string,
  context: SearchResult[],
  examples: Array<{ question: string; answer: string }> = []
): { system: string; user: string } {
  const formattedContext = formatContext(context);

  let examplesSection = '';
  if (examples.length > 0) {
    examplesSection =
      '\nExamples:\n' +
      examples.map((ex, i) => `Example ${i + 1}:\nQ: ${ex.question}\nA: ${ex.answer}`).join('\n\n');
  }

  const userPrompt = `Context:
${formattedContext.join('\n\n')}
${examplesSection}

Question: ${question}

Answer:`;

  return {
    system: SYSTEM_PROMPT,
    user: userPrompt,
  };
}

export function truncateContext(context: string[], maxTokens: number = 2000): string[] {
  const truncated: string[] = [];
  let estimatedTokens = 0;

  for (const chunk of context) {
    const chunkTokens = Math.ceil(chunk.length / 4);

    if (estimatedTokens + chunkTokens > maxTokens) {
      break;
    }

    truncated.push(chunk);
    estimatedTokens += chunkTokens;
  }

  return truncated;
}

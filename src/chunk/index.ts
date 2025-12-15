export interface TextChunk {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
    [key: string]: any;
  };
}

export interface ChunkOptions {
  maxChunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
  preserveSentences?: boolean;
}

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' '];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function generateChunkId(documentId: string, chunkIndex: number): string {
  return `${documentId}-chunk-${chunkIndex}`;
}

export function chunkByTokenLimit(
  text: string,
  maxTokens: number,
  documentId: string = 'doc',
  metadata: Record<string, any> = {}
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = '';
  let currentOffset = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

    if (estimateTokens(potentialChunk) > maxTokens && currentChunk) {
      // Save current chunk
      chunks.push({
        id: generateChunkId(documentId, chunkIndex),
        text: currentChunk.trim(),
        metadata: {
          documentId,
          chunkIndex,
          startOffset: currentOffset,
          endOffset: currentOffset + currentChunk.length,
          ...metadata,
        },
      });

      chunkIndex++;
      currentOffset += currentChunk.length;
      currentChunk = sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: generateChunkId(documentId, chunkIndex),
      text: currentChunk.trim(),
      metadata: {
        documentId,
        chunkIndex,
        startOffset: currentOffset,
        endOffset: currentOffset + currentChunk.length,
        ...metadata,
      },
    });
  }

  return chunks;
}

export function createChunkWithOverlap(
  text: string,
  chunkSize: number,
  overlap: number,
  documentId: string = 'doc',
  metadata: Record<string, any> = {}
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const textLength = text.length;
  let chunkIndex = 0;

  for (let i = 0; i < textLength; i += chunkSize - overlap) {
    const start = i;
    const end = Math.min(i + chunkSize, textLength);
    const chunkText = text.slice(start, end).trim();

    if (chunkText.length > 0) {
      chunks.push({
        id: generateChunkId(documentId, chunkIndex),
        text: chunkText,
        metadata: {
          documentId,
          chunkIndex,
          startOffset: start,
          endOffset: end,
          ...metadata,
        },
      });
      chunkIndex++;
    }

    if (end >= textLength) break;
  }

  return chunks;
}

export function chunkBySection(
  text: string,
  options: ChunkOptions = {},
  documentId: string = 'doc',
  metadata: Record<string, any> = {}
): TextChunk[] {
  const {
    maxChunkSize = 1000,
    chunkOverlap = 200,
    separators = DEFAULT_SEPARATORS,
    preserveSentences = true,
  } = options;

  const chunks: TextChunk[] = [];

  const sections = text.split('\n\n').filter((s) => s.trim().length > 0);

  let currentChunk = '';
  let currentOffset = 0;
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionText = section.trim();

    if (currentChunk.length + sectionText.length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + sectionText;
    } else {
      if (currentChunk) {
        chunks.push({
          id: generateChunkId(documentId, chunkIndex),
          text: currentChunk.trim(),
          metadata: {
            documentId,
            chunkIndex,
            startOffset: currentOffset,
            endOffset: currentOffset + currentChunk.length,
            ...metadata,
          },
        });
        chunkIndex++;
        currentOffset += currentChunk.length;
      }

      if (sectionText.length > maxChunkSize) {
        const subChunks = preserveSentences
          ? chunkByTokenLimit(sectionText, Math.ceil(maxChunkSize / 4), documentId, metadata)
          : createChunkWithOverlap(sectionText, maxChunkSize, chunkOverlap, documentId, metadata);

        chunks.push(...subChunks);
        chunkIndex = chunks.length;
        currentChunk = '';
      } else {
        currentChunk = sectionText;
      }
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: generateChunkId(documentId, chunkIndex),
      text: currentChunk.trim(),
      metadata: {
        documentId,
        chunkIndex,
        startOffset: currentOffset,
        endOffset: currentOffset + currentChunk.length,
        ...metadata,
      },
    });
  }

  return chunks;
}

export function smartChunk(
  text: string,
  options: ChunkOptions = {},
  documentId: string = 'doc',
  metadata: Record<string, any> = {}
): TextChunk[] {
  const { maxChunkSize = 1000, chunkOverlap = 200 } = options;

  return chunkBySection(
    text,
    { maxChunkSize, chunkOverlap, preserveSentences: true },
    documentId,
    metadata
  );
}

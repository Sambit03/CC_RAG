import OpenAI from 'openai';
import { config } from '../config/index.js';

let openaiClient: OpenAI | null = null;

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }
  return openaiClient;
}

export async function generateAnswer(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const client = getOpenAIClient();
  const { model = config.openai.llmModel, temperature = 0.7, maxTokens = 1000, topP = 1 } = options;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    throw new Error(`Failed to generate answer: ${(error as Error).message}`);
  }
}

export async function* streamAnswer(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {}
): AsyncGenerator<string> {
  const client = getOpenAIClient();
  const { model = config.openai.llmModel, temperature = 0.7, maxTokens = 1000, topP = 1 } = options;

  try {
    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    throw new Error(`Failed to stream answer: ${(error as Error).message}`);
  }
}

export async function generateAnswerWithRetry(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions & { maxRetries?: number; retryDelay?: number } = {}
): Promise<string> {
  const { maxRetries = 3, retryDelay = 1000, ...llmOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateAnswer(systemPrompt, userPrompt, llmOptions);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError?.message}`);
}

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateConversationTokens(systemPrompt: string, userPrompt: string): number {
  return countTokens(systemPrompt) + countTokens(userPrompt) + 10;
}

export async function generateAnswerWithHistory(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: LLMOptions = {}
): Promise<string> {
  const client = getOpenAIClient();
  const { model = config.openai.llmModel, temperature = 0.7, maxTokens = 1000, topP = 1 } = options;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    throw new Error(`Failed to generate answer with history: ${(error as Error).message}`);
  }
}

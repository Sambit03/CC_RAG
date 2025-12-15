import fs from 'fs/promises';
import path from 'path';

export interface CrawlOptions {
  maxRetries?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface CrawlResult {
  url: string;
  content: string | Buffer;
  contentType: 'html' | 'pdf';
  statusCode?: number;
  error?: string;
}

export async function fetchHTML(url: string, options: CrawlOptions = {}): Promise<string> {
  const { maxRetries = 3, timeout = 30000, headers = {} } = options;

  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; RAG-Crawler/1.0)',
    ...headers,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: defaultHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(`Expected HTML but got ${contentType}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Failed to fetch HTML after ${maxRetries} attempts: ${lastError?.message}`);
}

export async function fetchPDF(url: string, options: CrawlOptions = {}): Promise<Buffer> {
  const { maxRetries = 3, timeout = 30000, headers = {} } = options;

  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; RAG-Crawler/1.0)',
    ...headers,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: defaultHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        throw new Error(`Expected PDF but got ${contentType}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Failed to fetch PDF after ${maxRetries} attempts: ${lastError?.message}`);
}

export async function fetchLocalFile(filePath: string): Promise<CrawlResult> {
  const content = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.html' || ext === '.htm') {
    return {
      url: `file://${filePath}`,
      content: content.toString('utf-8'),
      contentType: 'html',
    };
  } else if (ext === '.pdf') {
    return {
      url: `file://${filePath}`,
      content,
      contentType: 'pdf',
    };
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

export async function crawlUrl(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  try {
    // Check if it's a local file
    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '');
      return await fetchLocalFile(filePath);
    }

    // Try to determine content type from URL
    const urlLower = url.toLowerCase();
    if (urlLower.endsWith('.pdf')) {
      const content = await fetchPDF(url, options);
      return { url, content, contentType: 'pdf' };
    } else {
      const content = await fetchHTML(url, options);
      return { url, content, contentType: 'html' };
    }
  } catch (error) {
    return {
      url,
      content: '',
      contentType: 'html',
      error: (error as Error).message,
    };
  }
}

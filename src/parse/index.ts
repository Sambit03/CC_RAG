import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';

export interface DocumentMetadata {
  title?: string;
  author?: string;
  description?: string;
  url?: string;
  createdAt?: Date;
  headers?: string[];
  [key: string]: any;
}

export interface ParsedDocument {
  text: string;
  metadata: DocumentMetadata;
}

export async function parseHTML(html: string, sourceUrl?: string): Promise<ParsedDocument> {
  const $ = cheerio.load(html);

  $('script, style, nav, footer, header, aside, .advertisement').remove();
  const title = $('title').text().trim() || $('h1').first().text().trim();
  const description = $('meta[name="description"]').attr('content') || '';
  const author = $('meta[name="author"]').attr('content') || '';

  const headers: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const headerText = $(el).text().trim();
    if (headerText) {
      headers.push(headerText);
    }
  });

  let contentElement = $('article, main, .content, .main-content, body').first();
  let text = contentElement.text();

  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return {
    text,
    metadata: {
      title,
      author,
      description,
      url: sourceUrl,
      headers,
    },
  };
}

export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  const data = await pdfParse(buffer);

  return {
    text: data.text,
    metadata: {
      title: data.info?.Title,
      author: data.info?.Author,
      createdAt: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
      pages: data.numpages,
    },
  };
}

export function extractMetadata(
  content: string,
  type: 'html' | 'pdf',
  sourceUrl?: string
): DocumentMetadata {
  if (type === 'html') {
    const $ = cheerio.load(content);
    return {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
      url: sourceUrl,
    };
  }

  return {
    url: sourceUrl,
  };
}

export async function parseDocument(
  content: string | Buffer,
  contentType: 'html' | 'pdf',
  sourceUrl?: string
): Promise<ParsedDocument> {
  if (contentType === 'html') {
    return parseHTML(content as string, sourceUrl);
  } else {
    return parsePDF(content as Buffer);
  }
}

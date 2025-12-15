export interface CleaningRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const DEFAULT_CLEANING_RULES: CleaningRule[] = [
  {
    name: 'remove-extra-whitespace',
    pattern: /\s+/g,
    replacement: ' ',
  },
  {
    name: 'remove-extra-newlines',
    pattern: /\n{3,}/g,
    replacement: '\n\n',
  },
  {
    name: 'remove-special-chars',
    pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    replacement: '',
  },
];

const BOILERPLATE_PATTERNS = [
  /copyright\s+©?\s*\d{4}/gi,
  /all rights reserved/gi,
  /privacy policy/gi,
  /terms of service/gi,
  /cookie policy/gi,
  /subscribe to our newsletter/gi,
  /follow us on/gi,
  /share on (facebook|twitter|linkedin)/gi,
];

export function cleanText(text: string): string {
  let cleaned = text;

  cleaned = cleaned.normalize('NFKC');

  cleaned = applyCleaningRules(cleaned, DEFAULT_CLEANING_RULES);
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return cleaned.trim();
}

export function removeBoilerplate(text: string): string {
  let cleaned = text;

  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  const lines = cleaned.split('\n');
  const filteredLines = lines.filter((line) => {
    const lineLower = line.toLowerCase();

    if (line.length < 20) {
      if (
        lineLower.includes('home') ||
        lineLower.includes('about') ||
        lineLower.includes('contact') ||
        lineLower.includes('menu')
      ) {
        return false;
      }
    }

    return true;
  });

  return filteredLines.join('\n');
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function applyCleaningRules(text: string, rules: CleaningRule[]): string {
  let cleaned = text;

  for (const rule of rules) {
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
  }

  return cleaned;
}

export function cleanDocument(
  text: string,
  options: {
    removeBoilerplate?: boolean;
    customRules?: CleaningRule[];
  } = {}
): string {
  const { removeBoilerplate: shouldRemoveBoilerplate = true, customRules = [] } = options;

  let cleaned = text;

  cleaned = cleanText(cleaned);

  if (shouldRemoveBoilerplate) {
    cleaned = removeBoilerplate(cleaned);
  }

  if (customRules.length > 0) {
    cleaned = applyCleaningRules(cleaned, customRules);
  }
  cleaned = normalizeWhitespace(cleaned);

  return cleaned;
}

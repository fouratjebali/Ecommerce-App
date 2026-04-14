const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'into',
  'is',
  'it',
  'make',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'show',
  'that',
  'the',
  'this',
  'to',
  'we',
  'with',
  'write',
]);

export function tokenizeQuery(input: string) {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
    ),
  );
}

export function scoreTextMatch(text: string, tokens: string[]) {
  if (!tokens.length) {
    return 0;
  }

  const haystack = text.toLowerCase();

  return tokens.reduce((score, token) => {
    if (!haystack.includes(token)) {
      return score;
    }

    const exactWord = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi');
    const exactMatches = haystack.match(exactWord)?.length ?? 0;
    const partialMatches = haystack.split(token).length - 1;

    return score + exactMatches * 3 + Math.max(partialMatches - exactMatches, 0);
  }, 0);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function toTitleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function chunkTextForStream(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

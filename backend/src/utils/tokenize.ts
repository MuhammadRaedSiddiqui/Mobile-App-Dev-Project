/**
 * Title tokenizer — builds the `titleKeywords` array used for Firestore
 * array-contains search (Technical Docs §4 search model). Pure and unit-tested.
 *
 * Rules: lowercase, split on non-alphanumerics, drop tokens shorter than 2 chars
 * and common stop words, de-duplicate while preserving first-seen order, and cap
 * the result at 20 tokens (Firestore array-contains query ceiling / Docs §4).
 */
const MAX_TOKENS = 20;

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'near',
]);

export function tokenize(input: string): string[] {
  if (!input) return [];
  const raw = input
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of raw) {
    if (!seen.has(token)) {
      seen.add(token);
      result.push(token);
      if (result.length >= MAX_TOKENS) break;
    }
  }
  return result;
}

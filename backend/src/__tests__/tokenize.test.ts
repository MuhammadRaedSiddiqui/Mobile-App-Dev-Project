import { tokenize } from '@/utils/tokenize';

describe('tokenize', () => {
  it('lowercases, splits on non-alphanumerics, and drops sub-2-char tokens', () => {
    // "1" is a single char and dropped; "13" (2 chars) is kept.
    expect(tokenize('1-Bed Flat, Block 13')).toEqual(['bed', 'flat', 'block', '13']);
  });

  it('drops stop words and sub-2-char tokens except numerics >= 2 chars', () => {
    expect(tokenize('A Flat in the Gulshan')).toEqual(['flat', 'gulshan']);
  });

  it('removes near as a stop word', () => {
    expect(tokenize('Studio near Johar')).toEqual(['studio', 'johar']);
  });

  it('de-duplicates while preserving first-seen order', () => {
    expect(tokenize('Gulshan Gulshan Flat Flat')).toEqual(['gulshan', 'flat']);
  });

  it('returns an empty array for empty/whitespace input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });

  it('caps the result at 20 tokens', () => {
    const many = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    const result = tokenize(many);
    expect(result).toHaveLength(20);
    expect(result[0]).toBe('word0');
    expect(result[19]).toBe('word19');
  });
});

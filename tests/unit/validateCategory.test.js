'use strict';

const { validateCategory, MAX_CATEGORY_NAME_LENGTH } =
  require('../helpers/pure-functions');

const EXISTING = ['Food', 'Transport', 'Fun'];

// ===========================================================================
// Valid category names
// ===========================================================================
describe('validateCategory — valid names', () => {
  test('simple unique name', () => {
    const result = validateCategory('Health', EXISTING);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('exactly 50 characters (boundary)', () => {
    const name = 'a'.repeat(MAX_CATEGORY_NAME_LENGTH);
    expect(validateCategory(name, EXISTING).valid).toBe(true);
  });

  test('name with leading/trailing whitespace is trimmed', () => {
    expect(validateCategory('  Health  ', EXISTING).valid).toBe(true);
  });

  test('name different from existing by case variant ("entertainment" vs none)', () => {
    expect(validateCategory('entertainment', EXISTING).valid).toBe(true);
  });

  test('single character name', () => {
    expect(validateCategory('X', EXISTING).valid).toBe(true);
  });

  test('empty existing categories list', () => {
    expect(validateCategory('Anything', []).valid).toBe(true);
  });
});

// ===========================================================================
// Invalid — empty / whitespace
// ===========================================================================
describe('validateCategory — empty name', () => {
  test('empty string → error', () => {
    const result = validateCategory('', EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('whitespace-only → error', () => {
    const result = validateCategory('   ', EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('non-string input (null) → error', () => {
    const result = validateCategory(null, EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('non-string input (undefined) → error', () => {
    const result = validateCategory(undefined, EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('non-string input (number) → error', () => {
    const result = validateCategory(123, EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ===========================================================================
// Invalid — too long
// ===========================================================================
describe('validateCategory — name too long', () => {
  test('51-character name → error', () => {
    const name = 'a'.repeat(MAX_CATEGORY_NAME_LENGTH + 1);
    const result = validateCategory(name, EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('100-character name → error', () => {
    const name = 'b'.repeat(100);
    const result = validateCategory(name, EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ===========================================================================
// Invalid — case-insensitive duplicate
// ===========================================================================
describe('validateCategory — duplicate detection', () => {
  test('exact match is a duplicate', () => {
    const result = validateCategory('Food', EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });

  test('uppercase variant is a duplicate', () => {
    const result = validateCategory('FOOD', EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('lowercase variant is a duplicate', () => {
    const result = validateCategory('transport', EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('mixed-case variant is a duplicate', () => {
    const result = validateCategory('FuN', EXISTING);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('duplicate in custom list', () => {
    const cats = [...EXISTING, 'Health'];
    const result = validateCategory('health', cats);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

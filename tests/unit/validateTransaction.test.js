'use strict';

const { validateTransaction, MAX_NAME_LENGTH, MIN_AMOUNT, MAX_AMOUNT } =
  require('../helpers/pure-functions');

// ---------------------------------------------------------------------------
// Helper: build a valid baseline input
// ---------------------------------------------------------------------------
function valid(overrides = {}) {
  return { name: 'Coffee', amount: 4.50, category: 'Food', ...overrides };
}

// ===========================================================================
// Valid inputs — should always return { valid: true, errors: {} }
// ===========================================================================
describe('validateTransaction — valid inputs', () => {
  test('typical valid transaction', () => {
    const result = validateTransaction(valid());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('minimum allowed amount (0.01)', () => {
    expect(validateTransaction(valid({ amount: 0.01 })).valid).toBe(true);
  });

  test('maximum allowed amount (999999999.99)', () => {
    expect(validateTransaction(valid({ amount: MAX_AMOUNT })).valid).toBe(true);
  });

  test('amount as a numeric string', () => {
    expect(validateTransaction(valid({ amount: '12.50' })).valid).toBe(true);
  });

  test('name exactly 100 characters long', () => {
    const longName = 'a'.repeat(MAX_NAME_LENGTH);
    expect(validateTransaction(valid({ name: longName })).valid).toBe(true);
  });

  test('name with surrounding whitespace is trimmed and accepted', () => {
    expect(validateTransaction(valid({ name: '  Snack  ' })).valid).toBe(true);
  });

  test('custom (non-default) category string', () => {
    expect(validateTransaction(valid({ category: 'Entertainment' })).valid).toBe(true);
  });
});

// ===========================================================================
// Invalid name
// ===========================================================================
describe('validateTransaction — invalid name', () => {
  test('empty name → name error', () => {
    const result = validateTransaction(valid({ name: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  test('whitespace-only name → name error', () => {
    const result = validateTransaction(valid({ name: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  test('name exceeding 100 characters → name error', () => {
    const result = validateTransaction(valid({ name: 'a'.repeat(101) }));
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  test('non-string name (null) → name error', () => {
    const result = validateTransaction(valid({ name: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  test('non-string name (number) → name error', () => {
    const result = validateTransaction(valid({ name: 42 }));
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });
});

// ===========================================================================
// Invalid amount
// ===========================================================================
describe('validateTransaction — invalid amount', () => {
  test('zero amount → amount error', () => {
    const result = validateTransaction(valid({ amount: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('negative amount → amount error', () => {
    const result = validateTransaction(valid({ amount: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('amount below minimum (0.001) → amount error', () => {
    const result = validateTransaction(valid({ amount: 0.001 }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('amount above maximum → amount error', () => {
    const result = validateTransaction(valid({ amount: MAX_AMOUNT + 0.01 }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('empty string amount → amount error', () => {
    const result = validateTransaction(valid({ amount: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('null amount → amount error', () => {
    const result = validateTransaction(valid({ amount: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('undefined amount → amount error', () => {
    const result = validateTransaction(valid({ amount: undefined }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('non-numeric string amount → amount error', () => {
    const result = validateTransaction(valid({ amount: 'abc' }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('Infinity amount → amount error', () => {
    const result = validateTransaction(valid({ amount: Infinity }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  test('NaN amount → amount error', () => {
    const result = validateTransaction(valid({ amount: NaN }));
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });
});

// ===========================================================================
// Invalid category
// ===========================================================================
describe('validateTransaction — invalid category', () => {
  test('empty category → category error', () => {
    const result = validateTransaction(valid({ category: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  test('whitespace-only category → category error', () => {
    const result = validateTransaction(valid({ category: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  test('null category → category error', () => {
    const result = validateTransaction(valid({ category: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });
});

// ===========================================================================
// Multiple errors at once
// ===========================================================================
describe('validateTransaction — multiple simultaneous errors', () => {
  test('all three fields invalid → three distinct errors', () => {
    const result = validateTransaction({ name: '', amount: -1, category: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.amount).toBeDefined();
    expect(result.errors.category).toBeDefined();
  });

  test('invalid name and amount, valid category → no category error', () => {
    const result = validateTransaction({ name: '', amount: -1, category: 'Food' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.amount).toBeDefined();
    expect(result.errors.category).toBeUndefined();
  });
});

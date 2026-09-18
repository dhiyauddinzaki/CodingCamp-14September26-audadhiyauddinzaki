'use strict';

const { calculateTotal, formatCurrency } = require('../helpers/pure-functions');

// ---------------------------------------------------------------------------
// Helper: build a minimal transaction
// ---------------------------------------------------------------------------
function txn(amount, id = '1') {
  return { id, name: 'Item', amount, category: 'Food', timestamp: Date.now() };
}

// ===========================================================================
// calculateTotal
// ===========================================================================
describe('calculateTotal', () => {
  test('empty array → 0', () => {
    expect(calculateTotal([])).toBe(0);
  });

  test('null / non-array → 0', () => {
    expect(calculateTotal(null)).toBe(0);
    expect(calculateTotal(undefined)).toBe(0);
  });

  test('single transaction', () => {
    expect(calculateTotal([txn(5)])).toBeCloseTo(5, 10);
  });

  test('multiple transactions sum correctly', () => {
    const txns = [txn(10), txn(20), txn(5)];
    expect(calculateTotal(txns)).toBeCloseTo(35, 10);
  });

  test('fractional amounts sum correctly', () => {
    const txns = [txn(1.25), txn(2.75)];
    expect(calculateTotal(txns)).toBeCloseTo(4, 10);
  });

  test('large amounts', () => {
    const txns = [txn(999999999.99), txn(0.01)];
    expect(calculateTotal(txns)).toBeCloseTo(1000000000, 5);
  });

  test('amount stored as string is coerced to number', () => {
    const txns = [{ id: '1', name: 'X', amount: '3.50', category: 'Food', timestamp: 0 }];
    expect(calculateTotal(txns)).toBeCloseTo(3.5, 10);
  });

  test('transaction with invalid amount field (NaN) is treated as 0', () => {
    const txns = [txn(10), { id: '2', name: 'Bad', amount: 'abc', category: 'Food', timestamp: 0 }];
    // 'abc' → Number('abc') → NaN → treated as 0 by || 0
    expect(calculateTotal(txns)).toBeCloseTo(10, 10);
  });
});

// ===========================================================================
// formatCurrency
// ===========================================================================
describe('formatCurrency', () => {
  test('zero → "$0.00"', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  test('integer → two decimal places', () => {
    expect(formatCurrency(10)).toBe('$10.00');
  });

  test('one decimal place → padded to two', () => {
    expect(formatCurrency(1234.5)).toBe('$1234.50');
  });

  test('already two decimal places', () => {
    expect(formatCurrency(4.99)).toBe('$4.99');
  });

  test('0.1 + 0.2 floating-point case → "$0.30"', () => {
    expect(formatCurrency(0.1 + 0.2)).toBe('$0.30');
  });

  test('large amount', () => {
    expect(formatCurrency(999999999.99)).toBe('$999999999.99');
  });

  test('rounds to two decimals (banker rounding through toFixed)', () => {
    // 1.005 is a common floating-point rounding edge case
    // toFixed(2) rounds it — just verify we get a "$X.XX" shaped string
    const result = formatCurrency(1.005);
    expect(result).toMatch(/^\$\d+\.\d{2}$/);
  });

  test('string-typed number is coerced', () => {
    expect(formatCurrency('7.5')).toBe('$7.50');
  });
});

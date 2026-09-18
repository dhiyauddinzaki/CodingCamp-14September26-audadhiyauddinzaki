'use strict';

const { groupByMonth, formatMonthLabel } = require('../helpers/pure-functions');

// ---------------------------------------------------------------------------
// Helper: build a transaction with a Date-derived timestamp
// ---------------------------------------------------------------------------
function txnAt(year, month /* 1-indexed */, amount, id = `${year}-${month}`) {
  const ts = new Date(year, month - 1, 15).getTime(); // day 15 — avoid DST edge cases
  return { id, name: 'Item', amount, category: 'Food', timestamp: ts };
}

// ===========================================================================
// formatMonthLabel
// ===========================================================================
describe('formatMonthLabel', () => {
  test('returns "January YYYY" for month 0 (January)', () => {
    const d = new Date(2025, 0, 1);
    expect(formatMonthLabel(d)).toBe('January 2025');
  });

  test('returns "June 2025" for month 5 (June)', () => {
    const d = new Date(2025, 5, 15);
    expect(formatMonthLabel(d)).toBe('June 2025');
  });

  test('accepts a Unix timestamp (number)', () => {
    const ts = new Date(2024, 11, 25).getTime(); // December 2024
    expect(formatMonthLabel(ts)).toBe('December 2024');
  });

  test('output always contains a 4-digit year', () => {
    const d = new Date(2030, 3, 1); // April 2030
    expect(formatMonthLabel(d)).toMatch(/\d{4}/);
  });
});

// ===========================================================================
// groupByMonth
// ===========================================================================
describe('groupByMonth', () => {
  test('empty array → empty array', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  test('single transaction → one group', () => {
    const txns = [txnAt(2025, 6, 10)];
    const result = groupByMonth(txns);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('June 2025');
    expect(result[0].total).toBeCloseTo(10, 10);
  });

  test('two transactions in the same month → one group with combined total', () => {
    const txns = [txnAt(2025, 3, 5, 'a'), txnAt(2025, 3, 15, 'b')];
    const result = groupByMonth(txns);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBeCloseTo(20, 10);
  });

  test('transactions in different months → separate groups', () => {
    const txns = [txnAt(2025, 1, 10), txnAt(2025, 2, 20)];
    const result = groupByMonth(txns);
    expect(result).toHaveLength(2);
  });

  test('groups are sorted descending (most recent first)', () => {
    const txns = [
      txnAt(2024, 11, 10, 'a'), // November 2024
      txnAt(2025,  2, 20, 'b'), // February 2025
      txnAt(2025,  1, 30, 'c'), // January 2025
    ];
    const result = groupByMonth(txns);
    expect(result[0].label).toBe('February 2025');
    expect(result[1].label).toBe('January 2025');
    expect(result[2].label).toBe('November 2024');
  });

  test('no month appears more than once', () => {
    const txns = [
      txnAt(2025, 1, 5,  'a'),
      txnAt(2025, 1, 10, 'b'),
      txnAt(2025, 2, 3,  'c'),
    ];
    const result = groupByMonth(txns);
    const labels = result.map(r => r.label);
    const uniqueLabels = [...new Set(labels)];
    expect(labels.length).toBe(uniqueLabels.length);
  });

  test('month total equals sum of transaction amounts in that month', () => {
    const txns = [
      txnAt(2025, 5, 10, 'a'),
      txnAt(2025, 5, 20, 'b'),
      txnAt(2025, 6, 50, 'c'),
    ];
    const result = groupByMonth(txns);
    const may = result.find(r => r.label === 'May 2025');
    const jun = result.find(r => r.label === 'June 2025');
    expect(may).toBeDefined();
    expect(jun).toBeDefined();
    expect(may.total).toBeCloseTo(30, 10);
    expect(jun.total).toBeCloseTo(50, 10);
  });

  test('label format is "[Full Month Name] [4-digit Year]"', () => {
    const txns = [txnAt(2026, 8, 5)]; // August 2026
    const result = groupByMonth(txns);
    expect(result[0].label).toMatch(/^[A-Z][a-z]+ \d{4}$/);
  });

  test('each group only has label and total keys', () => {
    const txns = [txnAt(2025, 1, 10)];
    const result = groupByMonth(txns);
    expect(Object.keys(result[0]).sort()).toEqual(['label', 'total'].sort());
  });

  test('transactions spanning year boundary group correctly', () => {
    const txns = [
      txnAt(2024, 12, 100, 'dec'),
      txnAt(2025,  1,  50, 'jan'),
    ];
    const result = groupByMonth(txns);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('January 2025'); // most recent first
    expect(result[1].label).toBe('December 2024');
  });
});

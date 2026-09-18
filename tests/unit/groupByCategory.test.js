'use strict';

const { groupByCategory } = require('../helpers/pure-functions');

// ---------------------------------------------------------------------------
// Helper: build a minimal transaction
// ---------------------------------------------------------------------------
function txn(category, amount, id = category + amount) {
  return { id, name: 'Item', amount, category, timestamp: Date.now() };
}

// ===========================================================================
// groupByCategory
// ===========================================================================
describe('groupByCategory', () => {
  test('empty array → empty arrays', () => {
    const result = groupByCategory([]);
    expect(result.labels).toEqual([]);
    expect(result.data).toEqual([]);
    expect(result.percentages).toEqual([]);
  });

  test('single transaction → one group, 100.0%', () => {
    const result = groupByCategory([txn('Food', 10)]);
    expect(result.labels).toEqual(['Food']);
    expect(result.data).toEqual([10]);
    expect(result.percentages).toEqual(['100.0%']);
  });

  test('two transactions same category → aggregated', () => {
    const result = groupByCategory([txn('Food', 3), txn('Food', 7)]);
    expect(result.labels).toEqual(['Food']);
    expect(result.data[0]).toBeCloseTo(10, 10);
    expect(result.percentages).toEqual(['100.0%']);
  });

  test('two different categories → correct proportions', () => {
    const result = groupByCategory([txn('Food', 25), txn('Transport', 75)]);
    const foodIdx = result.labels.indexOf('Food');
    const transIdx = result.labels.indexOf('Transport');
    expect(foodIdx).toBeGreaterThanOrEqual(0);
    expect(transIdx).toBeGreaterThanOrEqual(0);
    expect(result.percentages[foodIdx]).toBe('25.0%');
    expect(result.percentages[transIdx]).toBe('75.0%');
  });

  test('percentages are rounded to one decimal place', () => {
    // 1/3 ≈ 33.3%, 2/3 ≈ 66.7%
    const result = groupByCategory([txn('A', 1), txn('B', 2)]);
    const aIdx = result.labels.indexOf('A');
    const bIdx = result.labels.indexOf('B');
    expect(result.percentages[aIdx]).toBe('33.3%');
    expect(result.percentages[bIdx]).toBe('66.7%');
  });

  test('sum of data equals calculateTotal of same transactions', () => {
    const txns = [txn('Food', 10), txn('Transport', 20), txn('Fun', 30)];
    const result = groupByCategory(txns);
    const dataSum = result.data.reduce((s, v) => s + v, 0);
    expect(dataSum).toBeCloseTo(60, 10);
  });

  test('sum of percentage values ≈ 100%', () => {
    const txns = [txn('Food', 10), txn('Transport', 20), txn('Fun', 30)];
    const result = groupByCategory(txns);
    const pctSum = result.percentages
      .map(p => parseFloat(p))
      .reduce((s, v) => s + v, 0);
    // Sum of rounded percentages can be slightly off from 100 due to rounding
    expect(pctSum).toBeGreaterThan(99);
    expect(pctSum).toBeLessThanOrEqual(100.1);
  });

  test('parallel arrays have the same length', () => {
    const txns = [txn('Food', 5), txn('Transport', 3), txn('Fun', 2)];
    const result = groupByCategory(txns);
    expect(result.labels.length).toBe(result.data.length);
    expect(result.labels.length).toBe(result.percentages.length);
  });

  test('categories with total ≤ 0 are excluded (zero amount)', () => {
    // A transaction with amount 0 should be excluded from labels
    const txns = [txn('Food', 10), txn('Empty', 0)];
    const result = groupByCategory(txns);
    expect(result.labels).not.toContain('Empty');
    expect(result.labels).toContain('Food');
  });

  test('only zero-amount transactions → empty result', () => {
    const txns = [txn('Food', 0), txn('Transport', 0)];
    const result = groupByCategory(txns);
    expect(result.labels).toHaveLength(0);
    expect(result.data).toHaveLength(0);
  });

  test('percentages end with "%"', () => {
    const txns = [txn('Food', 5), txn('Transport', 5)];
    const result = groupByCategory(txns);
    result.percentages.forEach(p => expect(p).toMatch(/%$/));
  });
});

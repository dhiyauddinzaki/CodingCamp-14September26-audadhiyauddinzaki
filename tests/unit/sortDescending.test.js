'use strict';

const { sortDescending } = require('../helpers/pure-functions');

// ---------------------------------------------------------------------------
// Helper: build a transaction with a given timestamp
// ---------------------------------------------------------------------------
function txn(ts, id = String(ts)) {
  return { id, name: 'Item', amount: 1, category: 'Food', timestamp: ts };
}

// ===========================================================================
// sortDescending
// ===========================================================================
describe('sortDescending', () => {
  test('empty array → empty array', () => {
    expect(sortDescending([])).toEqual([]);
  });

  test('single item → same item', () => {
    const t = txn(1000);
    expect(sortDescending([t])).toEqual([t]);
  });

  test('two items in wrong order → corrected', () => {
    const older = txn(1000);
    const newer = txn(2000);
    const result = sortDescending([older, newer]);
    expect(result[0]).toEqual(newer);
    expect(result[1]).toEqual(older);
  });

  test('two items already in correct order → unchanged', () => {
    const newer = txn(2000);
    const older = txn(1000);
    const result = sortDescending([newer, older]);
    expect(result[0]).toEqual(newer);
    expect(result[1]).toEqual(older);
  });

  test('multiple items are sorted most-recent-first', () => {
    const items = [txn(300), txn(100), txn(500), txn(200), txn(400)];
    const result = sortDescending(items);
    const timestamps = result.map(t => t.timestamp);
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }
  });

  test('does not mutate the original array', () => {
    const original = [txn(100), txn(300), txn(200)];
    const originalCopy = [...original];
    sortDescending(original);
    expect(original).toEqual(originalCopy);
  });

  test('real-world timestamps (milliseconds)', () => {
    const now  = Date.now();
    const t1   = txn(now - 10000, 'old');
    const t2   = txn(now,         'new');
    const t3   = txn(now - 5000,  'mid');
    const result = sortDescending([t1, t2, t3]);
    expect(result.map(t => t.id)).toEqual(['new', 'mid', 'old']);
  });

  test('equal timestamps preserve order (stable or consistent)', () => {
    // If two items share a timestamp the sort order is unspecified,
    // but sortDescending must not throw and must return both items.
    const t1 = txn(1000, 'a');
    const t2 = txn(1000, 'b');
    const result = sortDescending([t1, t2]);
    expect(result).toHaveLength(2);
    const ids = result.map(t => t.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });
});

/**
 * tests/helpers/pure-functions.js
 *
 * Re-exports every pure function from js/app.js so the Jest test suite can
 * import them without a browser environment.  The strategy is to define all
 * the constants and pure functions inline here, keeping them in perfect sync
 * with app.js.  Storage / DOM / Chart.js functions are intentionally excluded.
 */

'use strict';

// =============================================================================
// Constants (mirrors SECTION 1 of js/app.js)
// =============================================================================

const DEFAULT_CATEGORIES    = ['Food', 'Transport', 'Fun'];
const MAX_NAME_LENGTH        = 100;
const MAX_CATEGORY_NAME_LENGTH = 50;
const MIN_AMOUNT             = 0.01;
const MAX_AMOUNT             = 999999999.99;

// =============================================================================
// Validation (mirrors SECTION 4 of js/app.js)
// =============================================================================

function validateTransaction({ name, amount, category }) {
  const errors = {};

  const trimmedName = (typeof name === 'string') ? name.trim() : '';
  if (trimmedName.length === 0) {
    errors.name = 'Item name is required.';
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.name = `Item name must not exceed ${MAX_NAME_LENGTH} characters.`;
  }

  const parsedAmount = Number(amount);
  if (
    amount === null ||
    amount === undefined ||
    amount === '' ||
    !isFinite(parsedAmount) ||
    isNaN(parsedAmount)
  ) {
    errors.amount = 'Amount must be a valid number.';
  } else if (parsedAmount < MIN_AMOUNT || parsedAmount > MAX_AMOUNT) {
    errors.amount = `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}.`;
  }

  const trimmedCategory = (typeof category === 'string') ? category.trim() : '';
  if (trimmedCategory.length === 0) {
    errors.category = 'Category is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function validateCategory(name, existingCategories) {
  const trimmed = (typeof name === 'string') ? name.trim() : '';

  if (trimmed.length === 0) {
    return { valid: false, error: 'Category name is required.' };
  }

  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return {
      valid: false,
      error: `Category name must not exceed ${MAX_CATEGORY_NAME_LENGTH} characters.`,
    };
  }

  const lowerName = trimmed.toLowerCase();
  const isDuplicate = Array.isArray(existingCategories) &&
    existingCategories.some(c => typeof c === 'string' && c.toLowerCase() === lowerName);

  if (isDuplicate) {
    return { valid: false, error: 'This category already exists.' };
  }

  return { valid: true };
}

// =============================================================================
// Business Logic (mirrors SECTION 5 of js/app.js)
// =============================================================================

function calculateTotal(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }
  return transactions.reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0);
}

function formatCurrency(n) {
  return '$' + Number(n).toFixed(2);
}

function sortDescending(transactions) {
  return [...transactions].sort((a, b) => b.timestamp - a.timestamp);
}

function groupByCategory(transactions) {
  const totals = new Map();

  for (const txn of transactions) {
    const cat = txn.category;
    totals.set(cat, (totals.get(cat) || 0) + Number(txn.amount));
  }

  const entries = [...totals.entries()].filter(([, total]) => total > 0);
  const overallTotal = entries.reduce((sum, [, total]) => sum + total, 0);

  const labels = [];
  const data = [];
  const percentages = [];

  for (const [label, total] of entries) {
    labels.push(label);
    data.push(total);
    percentages.push(
      overallTotal > 0
        ? (total / overallTotal * 100).toFixed(1) + '%'
        : '0.0%'
    );
  }

  return { labels, data, percentages };
}

function formatMonthLabel(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function groupByMonth(transactions) {
  const months = new Map();

  for (const txn of transactions) {
    const d = new Date(txn.timestamp);
    const year  = d.getFullYear();
    const month = d.getMonth();
    const key   = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!months.has(key)) {
      months.set(key, {
        label:   formatMonthLabel(d),
        total:   0,
        sortKey: year * 100 + month,
      });
    }

    months.get(key).total += Number(txn.amount);
  }

  return [...months.values()]
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ label, total }) => ({ label, total }));
}

// =============================================================================
// Merging helper (mirrors SECTION 3 of js/app.js)
// =============================================================================

function mergeCategories(customCategories) {
  const merged = [...DEFAULT_CATEGORIES];
  const lowerSet = new Set(DEFAULT_CATEGORIES.map(c => c.toLowerCase()));

  for (const cat of customCategories) {
    if (typeof cat === 'string' && !lowerSet.has(cat.toLowerCase())) {
      merged.push(cat);
      lowerSet.add(cat.toLowerCase());
    }
  }

  return merged;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  DEFAULT_CATEGORIES,
  MAX_NAME_LENGTH,
  MAX_CATEGORY_NAME_LENGTH,
  MIN_AMOUNT,
  MAX_AMOUNT,
  validateTransaction,
  validateCategory,
  calculateTotal,
  formatCurrency,
  sortDescending,
  groupByCategory,
  formatMonthLabel,
  groupByMonth,
  mergeCategories,
};

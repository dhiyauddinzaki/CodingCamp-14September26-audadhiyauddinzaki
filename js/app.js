// js/app.js — Expense & Budget Visualizer
// Structured following the module boundaries described in design.md:
//   Constants → Storage → State → Validation → Business Logic
//   → Rendering → Event Handlers → Initialization

'use strict';

// =============================================================================
// SECTION 1 — Constants
// =============================================================================

/** Default categories always available in the Input Form selector. */
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

/** localStorage key names used throughout the application. */
const STORAGE_KEYS = {
  transactions: 'evb_transactions',
  categories:   'evb_categories',
  theme:        'evb_theme',
};

/** Maximum number of characters allowed for a transaction item name. */
const MAX_NAME_LENGTH = 100;

/** Maximum number of characters allowed for a custom category name. */
const MAX_CATEGORY_NAME_LENGTH = 50;

/** Maximum number of user-defined custom categories. */
const MAX_CUSTOM_CATEGORIES = 50;

/** Minimum valid transaction amount (inclusive). */
const MIN_AMOUNT = 0.01;

/** Maximum valid transaction amount (inclusive). */
const MAX_AMOUNT = 999999999.99;

// =============================================================================
// SECTION 1b — Data-model JSDoc typedefs
// =============================================================================

/**
 * A single spending transaction.
 *
 * @typedef {Object} Transaction
 * @property {string} id        - UUID v4 generated via crypto.randomUUID()
 * @property {string} name      - Item name, 1–100 characters
 * @property {number} amount    - Positive number in [0.01, 999,999,999.99]
 * @property {string} category  - Category label string
 * @property {number} timestamp - Unix timestamp (Date.now()) at creation time
 */

/**
 * A category label string.
 * Default categories are always available; user-defined categories are
 * persisted separately and merged at runtime.
 *
 * @typedef {string} Category
 */

/**
 * The single in-memory state object authoritative for the running session.
 *
 * @typedef {Object} AppState
 * @property {Transaction[]}        transactions - All transactions for the session
 * @property {string[]}             categories   - Default + custom categories (merged)
 * @property {'light'|'dark'}       theme        - Current UI theme
 * @property {'main'|'summary'}     view         - Active view
 */

// =============================================================================
// SECTION 2 — Storage
// =============================================================================

/**
 * Tracks whether any storage operation encountered an unrecoverable error.
 * `init()` reads these flags to display toast notifications after first render.
 */
const storageError = { transactions: false, categories: false, theme: false };

/**
 * Reads and parses the transaction list from localStorage.
 *
 * @returns {Transaction[]} The stored transactions, or `[]` on any failure.
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.transactions);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Stored transactions value is not an array');
    }
    return parsed;
  } catch (_err) {
    storageError.transactions = true;
    return [];
  }
}

/**
 * Serialises and writes the transaction list to localStorage.
 * Write errors are non-fatal; a toast is surfaced by `init()` via storageError.
 *
 * @param {Transaction[]} txns
 */
function saveTransactions(txns) {
  try {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(txns));
  } catch (_err) {
    // Silent — write errors for transactions are handled by init() toast logic
  }
}

/**
 * Reads and parses the custom category list from localStorage.
 * Returns an empty array when no value is stored (not an error; defaults are
 * merged at init time).
 *
 * @returns {string[]} Custom categories only, or `[]` on any failure / absent key.
 */
function loadCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.categories);
    if (raw === null || raw === undefined) {
      // No stored value — not an error; caller merges with DEFAULT_CATEGORIES
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Stored categories value is not an array');
    }
    return parsed;
  } catch (_err) {
    storageError.categories = true;
    return [];
  }
}

/**
 * Serialises and writes the custom category list to localStorage.
 * Does NOT mutate any state.
 *
 * @param {string[]} cats
 * @returns {boolean} `true` on success, `false` on failure.
 */
function saveCategories(cats) {
  try {
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(cats));
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Reads the stored theme preference from localStorage.
 *
 * @returns {'light'|'dark'|null}
 *   The stored theme if valid, `null` if no preference is stored,
 *   or `null` on error (with storageError.theme set to true).
 */
function loadTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.theme);
    if (value === null) {
      // No stored preference — caller falls back to prefers-color-scheme
      return null;
    }
    if (value === 'light' || value === 'dark') {
      return value;
    }
    // Unexpected stored value
    storageError.theme = true;
    return null;
  } catch (_err) {
    storageError.theme = true;
    return null;
  }
}

/**
 * Persists the selected theme to localStorage.
 * Fails silently on error.
 *
 * @param {'light'|'dark'} theme
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch (_err) {
    // Silent — theme persistence failures are non-critical
  }
}

// =============================================================================
// SECTION 3 — State
// =============================================================================

/**
 * The single in-memory state object. `initState()` populates this before any
 * rendering occurs; all subsequent mutations happen in-place so that every
 * function that holds a reference to `appState` always sees the latest values.
 *
 * @type {AppState}
 */
const appState = {
  transactions: [],
  categories:   [],
  theme:        'light',
  view:         'main',
};

/**
 * Resolves the initial theme by checking localStorage first, then falling
 * back to the system `prefers-color-scheme` media query, then to `"light"`.
 *
 * @returns {'light'|'dark'}
 */
function resolveInitialTheme() {
  const stored = loadTheme();
  if (stored !== null) {
    return stored;
  }
  // Attempt system preference detection
  try {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch (_err) {
    // matchMedia not supported — fall through to default
  }
  return 'light';
}

/**
 * Merges DEFAULT_CATEGORIES with stored custom categories, deduplicating
 * case-insensitively. DEFAULT_CATEGORIES always appear first.
 *
 * @param {string[]} customCategories  Raw list returned by loadCategories()
 * @returns {string[]}                 Merged, deduplicated list
 */
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

/**
 * Initialises `appState` by loading all persisted data from localStorage,
 * merging categories, and resolving the initial theme. Must be called once
 * before any rendering occurs (i.e., inside `init()` before `renderAll()`).
 *
 * Storage error flags set by load* functions are preserved on `storageError`
 * and are read by `init()` after the first render to display toast
 * notifications.
 *
 * @returns {AppState} The same `appState` object, now populated.
 */
function initState() {
  // Load transactions (storageError.transactions set on failure)
  appState.transactions = loadTransactions();

  // Load and merge categories (storageError.categories set on failure)
  const customCategories = loadCategories();
  appState.categories = mergeCategories(customCategories);

  // Resolve theme with fallback chain (storageError.theme set on bad value)
  appState.theme = resolveInitialTheme();

  // Always start on the main view
  appState.view = 'main';

  return appState;
}

// =============================================================================
// SECTION 4 — Validation
// =============================================================================

/**
 * Validates the fields of a transaction submission.
 *
 * Rules:
 *  - `name`     : non-empty string after trim, max 100 characters.
 *  - `amount`   : finite number (or numeric string) in [0.01, 999999999.99].
 *  - `category` : non-empty string after trim.
 *
 * @param {{ name: any, amount: any, category: any }} fields
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateTransaction({ name, amount, category }) {
  const errors = {};

  // --- name validation ---
  const trimmedName = (typeof name === 'string') ? name.trim() : '';
  if (trimmedName.length === 0) {
    errors.name = 'Item name is required.';
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.name = `Item name must not exceed ${MAX_NAME_LENGTH} characters.`;
  }

  // --- amount validation ---
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

  // --- category validation ---
  const trimmedCategory = (typeof category === 'string') ? category.trim() : '';
  if (trimmedCategory.length === 0) {
    errors.category = 'Category is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a proposed custom category name against the existing list.
 *
 * Rules:
 *  - `name` must be a non-empty string (after trim) of at most 50 characters.
 *  - `name` must not be a case-insensitive duplicate of any entry in `existingCategories`.
 * Note: The 50-category count limit is checked in the event handler, not here.
 *
 * @param {any}      name                - The proposed category name.
 * @param {string[]} existingCategories  - The current merged category list.
 * @returns {{ valid: boolean, error?: string }}
 */
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
// SECTION 5 — Business Logic
// =============================================================================

/**
 * Computes the sum of all `amount` fields in the given transaction list.
 *
 * @param {Transaction[]} transactions
 * @returns {number} The total, or `0` for an empty array.
 */
function calculateTotal(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }
  return transactions.reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0);
}

/**
 * Formats a number as a currency string with a leading dollar sign and exactly
 * two decimal places. No thousands separator is added.
 * Example: `formatCurrency(1234.5)` → `"$1234.50"`, `formatCurrency(0)` → `"$0.00"`.
 *
 * @param {number} n
 * @returns {string}
 */
function formatCurrency(n) {
  return '$' + Number(n).toFixed(2);
}

/**
 * Returns a new array of transactions sorted by `timestamp` in descending order
 * (most recent first). The original array is not mutated.
 *
 * @param {Transaction[]} transactions
 * @returns {Transaction[]} A new sorted array.
 */
function sortDescending(transactions) {
  return [...transactions].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Groups transactions by category and returns parallel arrays suitable for
 * Chart.js. Categories with a total ≤ 0 are excluded.
 *
 * @param {Transaction[]} transactions
 * @returns {{ labels: string[], data: number[], percentages: string[] }}
 */
function groupByCategory(transactions) {
  /** @type {Map<string, number>} */
  const totals = new Map();

  for (const txn of transactions) {
    const cat = txn.category;
    totals.set(cat, (totals.get(cat) || 0) + Number(txn.amount));
  }

  // Filter out categories with total <= 0
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

/**
 * Formats a Date object or Unix timestamp as a string like `"June 2025"`.
 * Uses the `en-US` locale for consistent month name output.
 *
 * @param {Date|number} date - A `Date` instance or a Unix timestamp in milliseconds.
 * @returns {string} e.g. `"June 2025"`
 */
function formatMonthLabel(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Groups transactions by calendar month+year and returns an array of summary
 * objects sorted in descending chronological order (most recent month first).
 * Months with no transactions are excluded.
 *
 * @param {Transaction[]} transactions
 * @returns {Array<{ label: string, total: number }>}
 */
function groupByMonth(transactions) {
  /** @type {Map<string, { label: string, total: number, sortKey: number }>} */
  const months = new Map();

  for (const txn of transactions) {
    const d = new Date(txn.timestamp);
    // Key is "YYYY-MM" for reliable sorting
    const year  = d.getFullYear();
    const month = d.getMonth(); // 0-indexed
    const key   = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!months.has(key)) {
      months.set(key, {
        label:   formatMonthLabel(d),
        total:   0,
        // Numeric sort key: year * 100 + month (0-indexed)
        sortKey: year * 100 + month,
      });
    }

    months.get(key).total += Number(txn.amount);
  }

  // Sort descending (most recent first) and strip internal sortKey
  return [...months.values()]
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ label, total }) => ({ label, total }));
}

// =============================================================================
// SECTION 6 — Rendering
// =============================================================================

/**
 * Module-level reference to the Chart.js Pie instance.
 * Declared here so renderPieChart() can update rather than recreate it.
 *
 * @type {Chart|null}
 */
let chart = null;

// ---------------------------------------------------------------------------
// 6.1  renderCategoryOptions()
// ---------------------------------------------------------------------------

/**
 * Repopulates the category `<select>` in `#transaction-form` with one
 * `<option>` per entry in `appState.categories`. The first option is a
 * blank placeholder that forces the user to make a conscious selection.
 *
 * Requirements: 1.6, 1.7, 5.4
 */
function renderCategoryOptions() {
  const select = document.getElementById('txn-category');
  if (!select) return;

  // Preserve the currently selected value so a re-render doesn't reset it
  const previousValue = select.value;

  // Clear existing options
  select.innerHTML = '';

  // Blank placeholder option
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Select a category —';
  placeholder.disabled = true;
  select.appendChild(placeholder);

  // One option per category
  for (const cat of appState.categories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }

  // Restore previously selected value if it still exists; otherwise leave
  // the placeholder selected so the user must pick explicitly.
  if (previousValue && appState.categories.includes(previousValue)) {
    select.value = previousValue;
  } else {
    select.value = '';
  }
}

// ---------------------------------------------------------------------------
// 6.3  renderBalance()
// ---------------------------------------------------------------------------

/**
 * Reads `appState.transactions`, calculates the total, formats it as currency,
 * and writes it to the `.balance-amount` element inside `#balance-display`.
 * Displays `$0.00` when no transactions exist.
 *
 * Requirements: 3.1, 3.4
 */
function renderBalance() {
  const displayEl = document.getElementById('balance-display');
  if (!displayEl) return;

  const amountEl = displayEl.querySelector('.balance-amount');
  if (!amountEl) return;

  const total = calculateTotal(appState.transactions);
  amountEl.textContent = formatCurrency(total);
}

// ---------------------------------------------------------------------------
// 6.4  renderTransactionList()
// ---------------------------------------------------------------------------

/**
 * Renders the full transaction list into `<ul id="transaction-list">`.
 *
 * - Sorts transactions via `sortDescending()` (most recent first).
 * - Each `<li>` shows the item name, category, formatted amount, and a
 *   delete `<button>` with `data-id` and an accessible `aria-label`.
 * - Renders a single empty-state `<li class="empty-state">` when the list
 *   is empty.
 *
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  // Clear current contents
  list.innerHTML = '';

  if (appState.transactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No transactions yet.';
    list.appendChild(emptyItem);
    return;
  }

  const sorted = sortDescending(appState.transactions);

  for (const txn of sorted) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = txn.id;

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'txn-name';
    nameSpan.textContent = txn.name;

    // Category
    const catSpan = document.createElement('span');
    catSpan.className = 'txn-category';
    catSpan.textContent = txn.category;

    // Amount (2 d.p. + currency symbol)
    const amtSpan = document.createElement('span');
    amtSpan.className = 'txn-amount';
    amtSpan.textContent = formatCurrency(txn.amount);

    // Delete button with accessible label
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--delete';
    deleteBtn.dataset.id = txn.id;
    deleteBtn.setAttribute('aria-label', `Delete ${txn.name}`);
    deleteBtn.textContent = '🗑';

    li.appendChild(nameSpan);
    li.appendChild(catSpan);
    li.appendChild(amtSpan);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// 6.5  renderPieChart()
// ---------------------------------------------------------------------------

/**
 * Builds (or updates) the Chart.js Pie chart in `<canvas id="pie-chart">`.
 *
 * - Calls `groupByCategory()` to derive labels, data, and percentages.
 * - Labels are formatted as `"CategoryName (X.X%)"`.
 * - If the chart already exists, its data is replaced and `chart.update()` is
 *   called to avoid canvas context leaks.
 * - When no transactions exist the chart is cleared gracefully (empty datasets).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
function renderPieChart() {
  const canvas = document.getElementById('pie-chart');
  if (!canvas) return;

  // If Chart.js is not available (CDN failure) do nothing — the error banner
  // is handled separately by init().
  if (typeof window === 'undefined' || !window.Chart) return;

  const { labels, data, percentages } = groupByCategory(appState.transactions);

  // Build display labels: "CategoryName (X.X%)"
  const displayLabels = labels.map((label, i) => `${label} (${percentages[i]})`);

  // Colour palette — cycle for up to N categories
  const PALETTE = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
    '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
    '#9c755f', '#bab0ac',
  ];
  const backgroundColors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

  if (chart) {
    // Update existing instance — avoids recreating the canvas context
    chart.data.labels = displayLabels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = backgroundColors;
    chart.update();
  } else {
    // Create a fresh Chart.js instance
    chart = new window.Chart(canvas, {
      type: 'pie',
      data: {
        labels: displayLabels,
        datasets: [
          {
            data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 13 },
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                return ` ${context.label}: ${formatCurrency(context.parsed)}`;
              },
            },
          },
        },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 6.6  renderMonthlySummary()
// ---------------------------------------------------------------------------

/**
 * Renders the monthly summary into `<div id="monthly-summary-content">`.
 *
 * - Calls `groupByMonth()` to obtain groups sorted descending.
 * - Renders a `<table>` with month labels and formatted totals.
 * - Renders a `<p class="empty-state">` when no transactions exist.
 * - Wraps all logic in try/catch; on any unhandled error an error message is
 *   shown in place of the summary content.
 *
 * Requirements: 6.1–6.6
 */
function renderMonthlySummary() {
  const container = document.getElementById('monthly-summary-content');
  if (!container) return;

  try {
    const groups = groupByMonth(appState.transactions);

    if (groups.length === 0) {
      container.innerHTML = '';
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-state';
      emptyMsg.textContent = 'No transactions available.';
      container.appendChild(emptyMsg);
      return;
    }

    // Build a summary table
    const table = document.createElement('table');
    table.className = 'monthly-summary-table';
    table.setAttribute('aria-label', 'Monthly spending summary');

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const thMonth = document.createElement('th');
    thMonth.scope = 'col';
    thMonth.textContent = 'Month';

    const thTotal = document.createElement('th');
    thTotal.scope = 'col';
    thTotal.textContent = 'Total Spent';

    headerRow.appendChild(thMonth);
    headerRow.appendChild(thTotal);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');

    for (const { label, total } of groups) {
      const row = document.createElement('tr');

      const tdMonth = document.createElement('td');
      tdMonth.textContent = label;

      const tdTotal = document.createElement('td');
      tdTotal.className = 'txn-amount';
      tdTotal.textContent = formatCurrency(total);

      row.appendChild(tdMonth);
      row.appendChild(tdTotal);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
  } catch (err) {
    container.innerHTML = '';
    const errorMsg = document.createElement('p');
    errorMsg.className = 'error-message';
    errorMsg.textContent = 'The monthly summary could not be loaded.';
    container.appendChild(errorMsg);
  }
}

// ---------------------------------------------------------------------------
// 6.7  renderAll()
// ---------------------------------------------------------------------------

/**
 * Orchestrates a full re-render of all visible UI components.
 *
 * - Always renders: balance, transaction list, pie chart, category options.
 * - Only renders the monthly summary when `appState.view === 'summary'` to
 *   avoid unnecessary work while the summary view is hidden.
 *
 * Requirements: 3.2, 3.3, 4.2, 4.3
 */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderPieChart();
  renderCategoryOptions();

  if (appState.view === 'summary') {
    renderMonthlySummary();
  }
}

// =============================================================================
// SECTION 7 — Event Handlers
// =============================================================================

// ---------------------------------------------------------------------------
// 7.1  handleAddTransaction()
// ---------------------------------------------------------------------------

/**
 * Handles submission of the transaction input form (`#transaction-form`).
 *
 * Flow:
 *  1. Reads and trims field values from the DOM.
 *  2. Calls `validateTransaction()` with those values.
 *  3. On failure: populates inline error `<span>` elements and returns.
 *  4. On success: clears error spans, creates a new Transaction object,
 *     pushes it to `appState.transactions`, persists, re-renders, and
 *     resets the form.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 8.1
 */
function handleAddTransaction() {
  const nameInput     = document.getElementById('txn-name');
  const amountInput   = document.getElementById('txn-amount');
  const categoryInput = document.getElementById('txn-category');

  const nameErrorEl     = document.getElementById('txn-name-error');
  const amountErrorEl   = document.getElementById('txn-amount-error');
  const categoryErrorEl = document.getElementById('txn-category-error');

  const name     = nameInput     ? nameInput.value     : '';
  const amount   = amountInput   ? amountInput.value   : '';
  const category = categoryInput ? categoryInput.value : '';

  const { valid, errors } = validateTransaction({ name, amount, category });

  // Always update all error spans (clear or populate)
  if (nameErrorEl)     nameErrorEl.textContent     = errors.name     || '';
  if (amountErrorEl)   amountErrorEl.textContent   = errors.amount   || '';
  if (categoryErrorEl) categoryErrorEl.textContent = errors.category || '';

  if (!valid) {
    return; // Do not add transaction
  }

  // Build the new Transaction object
  const trimmedName   = name.trim();
  const parsedAmount  = parseFloat(amount);

  /** @type {Transaction} */
  const transaction = {
    id:        crypto.randomUUID(),
    name:      trimmedName,
    amount:    parsedAmount,
    category:  category.trim(),
    timestamp: Date.now(),
  };

  appState.transactions.push(transaction);
  saveTransactions(appState.transactions);
  renderAll();

  // Reset the form fields to their default empty state (Requirement 1.5)
  const form = document.getElementById('transaction-form');
  if (form) {
    form.reset();
  }
}

// ---------------------------------------------------------------------------
// 7.2  handleDeleteTransaction(id)  +  delete-button event delegation
// ---------------------------------------------------------------------------

/**
 * Removes the transaction with the given `id` from `appState.transactions`,
 * persists the updated list, and triggers a full re-render.
 *
 * Requirements: 2.3, 8.1
 *
 * @param {string} id - The `id` field of the transaction to remove.
 */
function handleDeleteTransaction(id) {
  appState.transactions = appState.transactions.filter(txn => txn.id !== id);
  saveTransactions(appState.transactions);
  renderAll();
}

/**
 * Event delegation listener attached to `#transaction-list`.
 * Catches clicks on delete buttons (or their child elements) and routes to
 * `handleDeleteTransaction()` with the button's `data-id` attribute value.
 *
 * Using `.closest('button[data-id]')` ensures the click is caught even if the
 * user clicks on an inline element inside the button (e.g. the 🗑 emoji).
 *
 * Wired up in `init()`.
 */
function _onTransactionListClick(event) {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;
  handleDeleteTransaction(btn.dataset.id);
}

// ---------------------------------------------------------------------------
// 7.4  handleAddCategory()
// ---------------------------------------------------------------------------

/**
 * Handles submission of the category manager form (`#category-form`).
 *
 * Flow:
 *  1. Reads input value from `#category-input`.
 *  2. Checks whether the custom category count has reached `MAX_CUSTOM_CATEGORIES`.
 *  3. Calls `validateCategory()`.
 *  4. On any failure: shows inline error in `#category-input-error` and returns.
 *  5. On success: attempts to persist (custom categories only); if persist fails
 *     shows inline error and does NOT mutate state. Otherwise pushes to
 *     `appState.categories`, re-renders the selector, and clears the input.
 *
 * Requirements: 5.2, 5.3, 5.4, 5.6, 5.7
 */
function handleAddCategory() {
  const input    = document.getElementById('category-input');
  const errorEl  = document.getElementById('category-input-error');

  const name     = input ? input.value : '';
  const trimmed  = (typeof name === 'string') ? name.trim() : '';

  /**
   * Helper: write an error message to the inline error span and return.
   * @param {string} message
   */
  function showCategoryError(message) {
    if (errorEl) errorEl.textContent = message;
  }

  // --- Count check: custom categories only (strip defaults before counting) ---
  const customCategories = appState.categories.filter(
    c => !DEFAULT_CATEGORIES.includes(c)
  );

  if (customCategories.length >= MAX_CUSTOM_CATEGORIES) {
    showCategoryError(`Category limit reached (max ${MAX_CUSTOM_CATEGORIES}).`);
    return;
  }

  // --- Validation ---
  const { valid, error } = validateCategory(name, appState.categories);

  if (!valid) {
    showCategoryError(error || 'Invalid category name.');
    return;
  }

  // --- Persist first (save only the custom categories) ---
  const updatedCustomCategories = customCategories.concat([trimmed]);
  const saved = saveCategories(updatedCustomCategories);

  if (!saved) {
    showCategoryError('Category could not be saved.');
    return; // Do NOT mutate appState (Requirement 5.7)
  }

  // --- Mutate state and re-render ---
  appState.categories.push(trimmed);
  renderCategoryOptions();

  // Clear input and error span
  if (input)   input.value = '';
  if (errorEl) errorEl.textContent = '';
}

// ---------------------------------------------------------------------------
// 7.5  handleThemeToggle()
// ---------------------------------------------------------------------------

/**
 * Toggles the application theme between `"light"` and `"dark"`.
 *
 * - Reads the current `data-theme` value from `<html>`.
 * - Flips it to the opposite value.
 * - Applies it by setting the `data-theme` attribute on `document.documentElement`.
 * - Updates `appState.theme` and persists with `saveTheme()`.
 * - Updates the `#theme-toggle` button's `aria-label` so it always describes
 *   the action the button will perform on next click.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
function handleThemeToggle() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  // Apply to DOM
  document.documentElement.setAttribute('data-theme', newTheme);

  // Sync state and persist
  appState.theme = newTheme;
  saveTheme(newTheme);

  // Update aria-label to describe the *next* action (what clicking will do)
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute(
      'aria-label',
      newTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }
}

// ---------------------------------------------------------------------------
// 7.6  handleViewSwitch(view)
// ---------------------------------------------------------------------------

/**
 * Switches the active view by updating both `appState.view` and the
 * `data-view` attribute on the root `<div id="app">` element (which CSS uses
 * to show/hide the correct view section).
 *
 * When switching to the `'summary'` view, `renderMonthlySummary()` is called
 * so that the content is always up-to-date when the user navigates to it
 * (Requirement 6.4).
 *
 * Requirements: 6.3, 6.4
 *
 * @param {'main'|'summary'} view
 */
function handleViewSwitch(view) {
  appState.view = view;

  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.dataset.view = view;
  }

  if (view === 'summary') {
    renderMonthlySummary();
  }
}


// =============================================================================
// SECTION 8 — Initialization
// =============================================================================

// ---------------------------------------------------------------------------
// 8.1  showToast(message)
// ---------------------------------------------------------------------------

/**
 * Displays a non-blocking toast notification appended to `<body>`.
 * Auto-removes after 4 seconds.
 *
 * Requirements: 8.5, 8.6
 *
 * @param {string} message - The message text to display.
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;

  const container = document.getElementById('toast-container') || document.body;
  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(function () {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}

// ---------------------------------------------------------------------------
// 8.2  showChartErrorBanner()
// ---------------------------------------------------------------------------

/**
 * Makes the pre-existing `#chart-error-banner` visible, or creates and
 * inserts a fallback banner near `#pie-chart-canvas` if the element is absent.
 *
 * Requirements: 10.4
 */
function showChartErrorBanner() {
  // The HTML already contains a hidden #chart-error-banner element
  const existing = document.getElementById('chart-error-banner');
  if (existing) {
    existing.removeAttribute('hidden');
    return;
  }

  // Fallback: create and insert adjacent to the chart canvas wrapper
  const banner = document.createElement('div');
  banner.id = 'chart-error-banner';
  banner.className = 'error-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent =
    'A required dependency (Chart.js) could not be loaded. The pie chart is unavailable.';

  const chartSection = document.getElementById('pie-chart-canvas');
  if (chartSection) {
    chartSection.insertAdjacentElement('afterend', banner);
  } else {
    document.body.appendChild(banner);
  }
}

// ---------------------------------------------------------------------------
// 8.3  Chart.js CDN failure handler (global, called by onerror in index.html)
// ---------------------------------------------------------------------------

/**
 * Exposed globally so the `onerror` handler on the Chart.js `<script>` tag
 * can trigger the 10-second countdown.
 *
 * The `<script>` tag in `index.html` sets `window._chartJsLoadError = true`
 * via its `onerror` attribute. `init()` reads this flag and starts the timer.
 *
 * Requirements: 10.4
 */
window._onChartLoadError = function () {
  setTimeout(function () {
    if (typeof window.Chart === 'undefined') {
      showChartErrorBanner();
    }
  }, 10000);
};

// ---------------------------------------------------------------------------
// 8.4  init()
// ---------------------------------------------------------------------------

/**
 * Application entry point — called once on `DOMContentLoaded`.
 *
 * Sequence:
 *  1. Load and merge all persisted data into `appState` via `initState()`.
 *  2. Apply the resolved theme to `<html>` and sync the toggle button label —
 *     both happen BEFORE the first render so users never see a flash of the
 *     wrong theme (Requirement 7.4).
 *  3. Call `renderAll()` for the initial paint.
 *  4. Show toast notifications for any storage errors encountered during load.
 *  5. Attach all DOM event listeners.
 *  6. Start the Chart.js CDN failure watchdog if the load already failed.
 *
 * Requirements: 7.4, 7.5, 7.6, 8.2, 8.4, 8.5, 8.6, 9.1, 10.4
 */
function init() {
  // ── Step 1: Load persisted state ─────────────────────────────────────────
  initState();

  // ── Step 2: Apply theme BEFORE first render ───────────────────────────────
  document.documentElement.setAttribute('data-theme', appState.theme);

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute(
      'aria-label',
      appState.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  // ── Step 3: First render ──────────────────────────────────────────────────
  renderAll();

  // ── Step 4: Storage error toasts ─────────────────────────────────────────
  if (storageError.transactions) {
    showToast('Saved transaction data could not be loaded.');
  }
  if (storageError.categories) {
    showToast('Saved category data could not be loaded.');
  }

  // ── Step 5: Wire event listeners ─────────────────────────────────────────

  // Transaction form submit
  const txnForm = document.getElementById('transaction-form');
  if (txnForm) {
    txnForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleAddTransaction();
    });
  }

  // Delete delegation on the transaction list
  const txnList = document.getElementById('transaction-list');
  if (txnList) {
    txnList.addEventListener('click', _onTransactionListClick);
  }

  // Category form submit
  const catForm = document.getElementById('category-form');
  if (catForm) {
    catForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleAddCategory();
    });
  }

  // Theme toggle click
  if (toggleBtn) {
    toggleBtn.addEventListener('click', handleThemeToggle);
  }

  // View switch — nav buttons use data-view-target attribute (see index.html)
  const viewNavBtns = document.querySelectorAll('[data-view-target]');
  viewNavBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetView = btn.dataset.viewTarget;

      // Update aria-current on all nav buttons
      viewNavBtns.forEach(function (b) {
        b.setAttribute('aria-current', b === btn ? 'true' : 'false');
      });

      handleViewSwitch(targetView);
    });
  });

  // ── Step 6: Chart.js CDN watchdog ────────────────────────────────────────
  // The onerror on the <script> tag sets window._chartJsLoadError = true.
  // If that flag is already set by the time init() runs, start the countdown
  // immediately. If it fires after init(), the onerror can call
  // window._onChartLoadError() directly (defined above).
  if (window._chartJsLoadError) {
    window._onChartLoadError();
  }
}

// ---------------------------------------------------------------------------
// 8.5  Register init() on DOMContentLoaded
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', init);

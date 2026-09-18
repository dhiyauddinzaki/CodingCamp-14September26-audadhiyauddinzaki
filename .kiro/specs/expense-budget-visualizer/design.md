# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a client-side, single-page web application built with HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser — no server, no build step, no frameworks. Users log spending transactions, review a live balance, explore a pie chart breakdown by category, and browse a monthly summary view. All data is persisted to the Browser's `localStorage` API so state survives tab refreshes.

The application must function correctly when opened directly as a `file://` URL and optionally when packaged as a Manifest V3 browser extension. Chart.js is loaded from a CDN `https://` URL to power the pie chart visualization.

### Design Goals

- **Zero dependencies at build time**: a single `index.html`, `css/styles.css`, and `js/app.js` are the complete deliverable.
- **Correctness over cleverness**: pure functions for all business logic, making them straightforward to test in isolation.
- **Resilience**: graceful degradation when `localStorage` is unavailable or contains corrupt data.
- **Accessibility**: WCAG 2.1 AA contrast in both themes; semantic HTML; keyboard-navigable controls.

---

## Architecture

The application follows a **unidirectional data-flow** pattern entirely in vanilla JS, inspired loosely by Flux/Redux but without any library:

```
User Interaction
      │
      ▼
 Action Handler  ──► State Mutation ──► localStorage write
                           │
                           ▼
                     render() call
                           │
                     ┌─────┴──────┐
                     ▼            ▼
              DOM updates   Chart.js update
```

There is a single **in-memory state object** (`appState`) that is the authoritative source of truth for the running session. Every user action mutates `appState`, persists the relevant slice to `localStorage`, then triggers a full or partial re-render.

### Module Boundaries within `js/app.js`

Although the entire JavaScript lives in one file (per Requirement 9.5), it is structured into clearly separated logical sections via block-scoped constants and pure functions:

| Section | Responsibility |
|---|---|
| **Constants** | Default categories, storage keys, limits |
| **Storage** | `loadTransactions()`, `saveTransactions()`, `loadCategories()`, `saveCategories()`, `loadTheme()`, `saveTheme()` |
| **State** | `appState` object; `initState()` |
| **Validation** | `validateTransaction(fields)`, `validateCategory(name, existing)` |
| **Business Logic** | `calculateTotal(txns)`, `groupByCategory(txns)`, `groupByMonth(txns)`, `formatCurrency(n)`, `formatMonthLabel(date)`, `sortDescending(txns)` |
| **Rendering** | `renderAll()`, `renderTransactionList()`, `renderBalance()`, `renderPieChart()`, `renderMonthlySummary()`, `renderCategoryOptions()` |
| **Event Handlers** | `handleAddTransaction()`, `handleDeleteTransaction(id)`, `handleAddCategory()`, `handleThemeToggle()`, `handleViewSwitch(view)` |
| **Initialization** | `init()` — runs on `DOMContentLoaded` |

### View Model

The app has two **views** (toggled without page navigation):

- **Main View**: Input form + Balance + Transaction list + Pie chart
- **Monthly Summary View**: Grouped monthly totals

A `data-view` attribute on the `<body>` element (or a wrapper `<div>`) drives CSS visibility of each view section.

---

## Components and Interfaces

### 1. Input Form (`#transaction-form`)

```
┌────────────────────────────────────────────┐
│  Item Name  [_____________________________]│
│  Amount     [__________]                   │
│  Category   [▼ Food / Transport / Fun ...] │
│             [ + Add Transaction ]          │
└────────────────────────────────────────────┘
```

- Collects `name` (text, max 100 chars), `amount` (number, 0.01–999,999,999.99), `category` (select).
- On submit: calls `validateTransaction()` → on success calls `handleAddTransaction()` → resets fields.
- Inline error messages rendered as `<span class="field-error" role="alert">` adjacent to each field.

### 2. Balance Display (`#balance-display`)

```
┌──────────────────────────┐
│  Total Spent: $1,234.56  │
└──────────────────────────┘
```

- Always visible at top of main view.
- Reads `appState.transactions`, calls `calculateTotal()`, formats with `formatCurrency()`.
- Updated synchronously as part of `renderBalance()` called from `renderAll()`.

### 3. Transaction List (`#transaction-list`)

```
┌──────────────────────────────────────────────┐
│ Coffee          Food       $4.50   [🗑]       │
│ Taxi ride       Transport  $12.00  [🗑]       │
│ …                                            │
└──────────────────────────────────────────────┘
```

- Rendered from `appState.transactions` sorted in reverse-chronological order (most recent first by `timestamp`).
- Each row is a `<li>` with a delete button (`data-id` attribute).
- Empty state: `<li class="empty-state">No transactions yet.</li>`.

### 4. Pie Chart (`#pie-chart-canvas`)

- A `<canvas>` element managed by a Chart.js `Doughnut`/`Pie` instance.
- Data is computed by `groupByCategory(transactions)` — categories with total ≤ 0 are excluded.
- Labels show `"CategoryName (X.X%)"`.
- The Chart.js instance is stored in a module-level variable; on each update, `chart.data` is replaced and `chart.update()` is called (avoids creating a new canvas context each time).

### 5. Category Manager (`#category-form`)

- An `<input>` + `<button>` control below the default form (or in a collapsible panel).
- Calls `validateCategory(name, appState.categories)` on submit.
- On success: updates `appState.categories`, persists, re-renders category `<select>` options.
- Inline error `<span class="field-error" role="alert">` adjacent to input.

### 6. Monthly Summary View (`#monthly-summary`)

- Hidden by default; shown when user clicks a "Monthly Summary" nav link.
- Rendered by `renderMonthlySummary()` which calls `groupByMonth(transactions)`, sorts groups descending, and generates a `<dl>` or `<table>` of month label → formatted total.

### 7. Theme Toggle (`#theme-toggle`)

- A `<button>` (min 24×24 px) with `aria-label` "Switch to dark mode" / "Switch to light mode".
- On click: toggles a `data-theme="dark"|"light"` attribute on `<html>` element, which CSS uses for custom-property overrides.
- Persists to `localStorage` immediately.

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id         - UUID v4 generated client-side via crypto.randomUUID()
 * @property {string} name       - Item name, 1–100 characters
 * @property {number} amount     - Positive number, 0.01–999,999,999.99
 * @property {string} category   - Category label string
 * @property {number} timestamp  - Unix timestamp (Date.now()) at time of creation
 */
```

Stored in `localStorage` under key `"evb_transactions"` as a JSON array of `Transaction` objects.

### Category

```js
/**
 * @typedef {string} Category
 * Custom category name, 1–50 characters.
 * Default categories are: ["Food", "Transport", "Fun"]
 * User-defined categories stored alongside defaults at runtime.
 */
```

Custom categories stored under `"evb_categories"` as a JSON array of strings. Defaults are never written to storage; they are merged at load time.

### AppState

```js
/**
 * @typedef {Object} AppState
 * @property {Transaction[]} transactions - All transactions for the session
 * @property {string[]}      categories   - Default + custom categories
 * @property {'light'|'dark'} theme       - Current UI theme
 * @property {'main'|'summary'} view      - Active view
 */
```

### localStorage Key Map

| Key | Value Type | Contents |
|---|---|---|
| `evb_transactions` | JSON string | `Transaction[]` |
| `evb_categories` | JSON string | `string[]` (custom only) |
| `evb_theme` | `"light"` or `"dark"` | User theme preference |

### Validation Rules (Pure Functions)

```js
/**
 * validateTransaction({ name, amount, category })
 * Returns: { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
 */

/**
 * validateCategory(name, existingCategories)
 * Returns: { valid: boolean, error?: string }
 */
```

### Chart Data Shape

```js
/**
 * groupByCategory(transactions) →
 * { labels: string[], data: number[], percentages: string[] }
 * Only categories with total > 0 are included.
 * percentages[i] = (data[i] / sum * 100).toFixed(1) + "%"
 */
```

### Monthly Group Shape

```js
/**
 * groupByMonth(transactions) →
 * Array<{ label: string, total: number }>
 * label format: "June 2025"
 * Sorted descending by year then month.
 */
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transactions are always accepted and stored

*For any* combination of a non-empty item name (1–100 characters), a numeric amount in [0.01, 999,999,999.99], and a non-empty category string, calling `validateTransaction` should return `{ valid: true }`, and after `handleAddTransaction`, the transaction list should contain a new entry matching those fields.

**Validates: Requirements 1.2, 1.9**

---

### Property 2: Invalid transactions are always rejected

*For any* submission where at least one of the following is true — item name is empty or exceeds 100 characters, amount is ≤ 0 or outside [0.01, 999,999,999.99] or non-numeric, or category is empty — `validateTransaction` should return `{ valid: false }` and the transaction store should remain unchanged.

**Validates: Requirements 1.3, 1.4, 1.8, 1.9**

---

### Property 3: Balance total equals the sum of all transaction amounts

*For any* list of transactions with amounts `a₁, a₂, …, aₙ`, `calculateTotal(transactions)` should equal `a₁ + a₂ + … + aₙ` (within floating-point precision), and `formatCurrency(total)` should produce a string matching `"$X.XX"` with exactly two decimal places.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

### Property 4: Transaction deletion removes exactly the targeted entry

*For any* transaction list containing a transaction with a given `id`, after deleting that `id`, the resulting list should have exactly one fewer entry, and no entry with that `id` should remain. All other transactions should be unchanged.

**Validates: Requirements 2.3, 8.1**

---

### Property 5: Transaction list is always sorted in reverse-chronological order

*For any* non-empty list of transactions with distinct timestamps, `sortDescending(transactions)` should return a list where `transactions[i].timestamp >= transactions[i+1].timestamp` for every consecutive pair.

**Validates: Requirements 2.5**

---

### Property 6: Pie chart data proportions are correct and complete

*For any* set of transactions grouped by category, the chart data produced by `groupByCategory(transactions)` should satisfy:
- Every category with a positive total appears exactly once.
- Every category with a total ≤ 0 is excluded.
- Each entry's `percentage` equals `(categoryTotal / overallTotal * 100)` rounded to 1 decimal place.
- The sum of all `data` values equals `calculateTotal(transactions)`.

**Validates: Requirements 4.1, 4.4, 4.5, 4.7**

---

### Property 7: Transaction serialization round-trip preserves data

*For any* list of valid `Transaction` objects, `JSON.parse(JSON.stringify(transactions))` should produce an array where each element is deeply equal to the original (all fields: `id`, `name`, `amount`, `category`, `timestamp` preserved).

**Validates: Requirements 8.1, 8.2**

---

### Property 8: Valid custom categories are accepted; invalid ones are rejected

*For any* category name that is between 1 and 50 characters and is not a case-insensitive duplicate of an existing category, `validateCategory(name, existing)` should return `{ valid: true }`. For any name that is empty, exceeds 50 characters, or matches an existing category name case-insensitively, it should return `{ valid: false }`.

**Validates: Requirements 5.2, 5.3, 5.6**

---

### Property 9: Category list serialization round-trip preserves all entries

*For any* list of custom category strings, serializing it via `JSON.stringify` and deserializing via `JSON.parse` should produce a list that is element-wise equal to the original.

**Validates: Requirements 5.5, 8.3, 8.4**

---

### Property 10: Monthly grouping correctly aggregates by month and year

*For any* set of transactions spanning multiple calendar months, `groupByMonth(transactions)` should produce groups where:
- Each group's `total` equals the sum of all transaction amounts in that month and year.
- No month appears more than once.
- Groups are sorted in descending chronological order (most recent month first).
- Each group's `label` matches the format `"[Full Month Name] [4-digit Year]"` (e.g., `"June 2025"`).

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 11: Theme persistence round-trip preserves value

*For any* theme value (`"light"` or `"dark"`), calling `saveTheme(theme)` followed by `loadTheme()` should return the same value.

**Validates: Requirements 7.3, 7.4**

---

### Property 12: Custom categories appear in Input Form selector after addition

*For any* set of valid custom categories added via `handleAddCategory`, after each addition the category `<select>` element should contain an `<option>` whose value matches each added category name.

**Validates: Requirements 1.7, 5.4**

---

## Error Handling

### LocalStorage Unavailable or Corrupt

All storage reads are wrapped in `try/catch`. If `localStorage` throws (e.g., `SecurityError` in some `file://` contexts, or storage quota exceeded), or if `JSON.parse` throws on the stored value:

- **Transactions**: Initialize `appState.transactions = []`; display a non-blocking toast notification: *"Saved transaction data could not be loaded."*
- **Categories**: Initialize with defaults only (`["Food", "Transport", "Fun"]`); display toast: *"Saved category data could not be loaded."*
- **Theme**: Fall back to `prefers-color-scheme` detection, then to `"light"`.

Storage writes are also wrapped in `try/catch`. On write failure for a category add:
- Do **not** mutate `appState.categories`.
- Display inline error: *"Category could not be saved."*

### Chart.js CDN Load Failure

A `<script onerror>` handler on the Chart.js `<script>` tag starts a 10-second countdown. If Chart.js is not available after 10 seconds, a visible error banner is shown: *"A required dependency (Chart.js) could not be loaded. The pie chart is unavailable."*

### Input Validation

All validation errors are rendered inline, adjacent to the offending field, in a `<span class="field-error" role="alert">`. Errors are cleared on the next successful submission or when the user modifies the field value. The form is never submitted to a server, so no network error states apply.

### Empty / Edge States

| Condition | UI Response |
|---|---|
| No transactions | Transaction list: empty-state message; Balance: `$0.00`; Pie chart: no segments rendered |
| Monthly summary with no transactions | Empty-state message in summary view |
| Custom category limit reached (50) | Inline error in Category Manager |
| `prefers-color-scheme` not supported | Default to light mode |

---

## Testing Strategy

### Dual Testing Approach

The testing strategy uses two complementary layers:

1. **Property-based tests** — validate universal correctness properties (business logic, pure functions) across many randomly generated inputs using a property-based testing library.
2. **Example-based unit tests** — verify specific scenarios, edge cases, and integration points with concrete inputs.

For this feature, PBT **is applicable** because the core business logic (validation, total calculation, grouping, sorting, serialization, formatting) consists of pure functions with clear input/output behavior and large input spaces.

### Property-Based Testing Library

Use **[fast-check](https://github.com/dubzzz/fast-check)** for JavaScript, loaded via CDN in the test environment:

```
https://cdn.jsdelivr.net/npm/fast-check@3/lib/bundle/main.js
```

Each property test runs a minimum of **100 iterations**.

Tag format for each test:

```js
// Feature: expense-budget-visualizer, Property N: <property title>
```

### Property Tests

| # | Property | fast-check Arbitraries |
|---|---|---|
| P1 | Valid transactions are always accepted | `fc.string({minLength:1, maxLength:100})`, `fc.float({min:0.01, max:999999999.99})`, `fc.constantFrom(...categories)` |
| P2 | Invalid transactions are always rejected | Generators for empty name, name > 100 chars, amount ≤ 0, amount > limit, non-numeric amount |
| P3 | Balance total equals sum of amounts | `fc.array(fc.record({amount: fc.float({min:0.01})}))` |
| P4 | Deletion removes exactly the target entry | `fc.array(transactionArb)` + random pick |
| P5 | List sorted reverse-chronologically | `fc.array(transactionArb, {minLength:2})` |
| P6 | Pie chart data proportions correct | `fc.array(transactionArb, {minLength:1})` |
| P7 | Transaction serialization round-trip | `fc.array(transactionArb)` |
| P8 | Category validation correct | `fc.string()` for valid/invalid names |
| P9 | Category list serialization round-trip | `fc.array(fc.string({minLength:1, maxLength:50}))` |
| P10 | Monthly grouping correct | `fc.array(transactionArb)` with varied timestamps |
| P11 | Theme persistence round-trip | `fc.constantFrom("light", "dark")` |
| P12 | Custom categories appear in selector | `fc.array(fc.string({minLength:1, maxLength:50}), {minLength:1})` |

### Example-Based Unit Tests

Cover specific scenarios and edge cases not exercised by the property generators:

- Input form renders with correct default fields (1.1, 1.6)
- Category manager control is present in DOM (5.1)
- Empty transaction list shows empty-state message (2.4)
- Empty monthly summary shows empty-state message (6.5)
- Theme toggle has minimum 24×24px target (7.1)
- System `prefers-color-scheme` applied when no stored preference (7.5)
- `prefers-color-scheme` absent → default light mode (7.6)
- Corrupt `localStorage` → empty transactions + toast notification (8.5)
- Corrupt `localStorage` → default categories + toast notification (8.6)
- 50 custom categories reached → block addition with error (5.6)
- `localStorage` write failure on category add → no mutation, error shown (5.7)
- CDN failure → error banner after timeout (10.4)
- Single-column layout at 375px viewport (9.4)

### Integration / Smoke Tests (Manual)

The following require browser-based or manual verification:

- App loads and all UI renders correctly when opened via `file://` (10.1)
- Chart.js loaded from CDN with no console errors (4.6, 10.2)
- Responsive layout from 320px–1440px without horizontal scroll (9.3)
- Initial render within 2 seconds (9.1)
- Balance, list, and chart update within 100ms of transaction action (9.2)
- Pie chart re-renders within 500ms on add/delete (4.2, 4.3)
- WCAG 4.5:1 contrast ratio in dark and light mode (7.7, 7.8) — use Lighthouse or axe
- Functionality in Chrome, Firefox, Edge, Safari (9.6)
- Manifest V3 CSP compliance if extension packaging is added (10.3)

### File Structure for Tests

```
tests/
  unit/
    validateTransaction.test.js
    validateCategory.test.js
    calculateTotal.test.js
    groupByCategory.test.js
    groupByMonth.test.js
    sortDescending.test.js
    formatCurrency.test.js
    formatMonthLabel.test.js
    serialization.test.js
    theme.test.js
  integration/
    dom.test.js       (JSDOM-based, covers rendering and DOM state)
```

Pure logic functions are extracted and exported from `js/app.js` (or duplicated into a `js/lib/` folder for test purposes) so they can be imported by the test suite without a browser environment.

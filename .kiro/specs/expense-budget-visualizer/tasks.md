# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a mobile-friendly, client-side single-page application using plain HTML, CSS, and Vanilla JavaScript. The implementation follows a unidirectional data-flow pattern with a single `appState` object, pure functions for all business logic, and `localStorage` for persistence. The deliverable is three files: `index.html`, `css/styles.css`, and `js/app.js`.

---

## Tasks

- [x] 1. Create project file structure and static HTML scaffold
  - Create `index.html` with semantic markup: `<html>`, `<head>`, `<body>`, and all top-level section containers (`#transaction-form`, `#balance-display`, `#transaction-list`, `#pie-chart-canvas`, `#category-form`, `#monthly-summary`, `#theme-toggle`)
  - Add Chart.js CDN `<script>` tag with an `onerror` handler stub; add `<script src="js/app.js" defer></script>`
  - Add `<link rel="stylesheet" href="css/styles.css">`
  - Create `css/styles.css` as an empty file; create `js/app.js` as an empty file
  - Set `data-view="main"` on the root wrapper `<div>` and `data-theme="light"` on `<html>`
  - _Requirements: 9.5, 10.1, 10.2_

- [x] 2. Implement constants, data models, and localStorage storage layer
  - [x] 2.1 Define constants and data-model JSDoc typedefs
    - Add `DEFAULT_CATEGORIES`, `STORAGE_KEYS` (`evb_transactions`, `evb_categories`, `evb_theme`), `MAX_NAME_LENGTH` (100), `MAX_CATEGORY_NAME_LENGTH` (50), `MAX_CUSTOM_CATEGORIES` (50), `MIN_AMOUNT` (0.01), `MAX_AMOUNT` (999999999.99) as block-scoped constants at the top of `js/app.js`
    - Add JSDoc `@typedef` for `Transaction`, `Category`, and `AppState`
    - _Requirements: 1.1, 1.6, 1.9, 5.1, 5.6_

  - [x] 2.2 Implement storage functions
    - Write `loadTransactions()`, `saveTransactions(txns)`, `loadCategories()`, `saveCategories(cats)`, `loadTheme()`, `saveTheme(theme)` — each wrapped in `try/catch`
    - On parse failure or `SecurityError`, return the appropriate safe default (empty array / default categories / `null`) and set a module-level `storageError` flag that `init()` will read to show a toast
    - `saveCategories` must throw-catch and return `false` on write failure without mutating state
    - _Requirements: 8.1–8.6, 5.5, 5.7, 7.3, 7.4_

  - [ ]* 2.3 Write property test for transaction serialization round-trip (P7)
    - **Property 7: Transaction serialization round-trip preserves data**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 2.4 Write property test for category list serialization round-trip (P9)
    - **Property 9: Category list serialization round-trip preserves all entries**
    - **Validates: Requirements 5.5, 8.3, 8.4**

  - [ ]* 2.5 Write property test for theme persistence round-trip (P11)
    - **Property 11: Theme persistence round-trip preserves value**
    - **Validates: Requirements 7.3, 7.4**

- [x] 3. Implement state initialization (`appState` and `initState`)
  - Define `appState` with fields `transactions`, `categories`, `theme`, `view`
  - Write `initState()`: calls all `load*` functions, merges default categories with stored custom categories (deduplication case-insensitive), applies `storageError` flags, and returns the populated `appState`
  - _Requirements: 8.2, 8.4, 8.5, 8.6, 1.6, 1.7_

- [x] 4. Implement pure business-logic functions
  - [x] 4.1 Implement `validateTransaction(fields)`
    - Returns `{ valid: boolean, errors: { name?, amount?, category? } }`
    - Validates: name 1–100 chars; amount numeric and in [0.01, 999,999,999.99]; category non-empty
    - _Requirements: 1.3, 1.4, 1.8, 1.9_

  - [ ]* 4.2 Write property test for `validateTransaction` — valid inputs always accepted (P1)
    - **Property 1: Valid transactions are always accepted and stored**
    - **Validates: Requirements 1.2, 1.9**

  - [ ]* 4.3 Write property test for `validateTransaction` — invalid inputs always rejected (P2)
    - **Property 2: Invalid transactions are always rejected**
    - **Validates: Requirements 1.3, 1.4, 1.8, 1.9**

  - [x] 4.4 Implement `validateCategory(name, existingCategories)`
    - Returns `{ valid: boolean, error?: string }`
    - Validates: name 1–50 chars; not a case-insensitive duplicate; count < 50 (check separately in handler)
    - _Requirements: 5.2, 5.3, 5.6_

  - [ ]* 4.5 Write property test for `validateCategory` (P8)
    - **Property 8: Valid custom categories accepted; invalid ones rejected**
    - **Validates: Requirements 5.2, 5.3, 5.6**

  - [x] 4.6 Implement `calculateTotal(transactions)` and `formatCurrency(n)`
    - `calculateTotal` returns the numeric sum of all `amount` fields
    - `formatCurrency` returns a string formatted as `"$X.XX"` with exactly 2 decimal places
    - _Requirements: 3.1, 3.4_

  - [ ]* 4.7 Write property test for `calculateTotal` — balance equals sum of amounts (P3)
    - **Property 3: Balance total equals the sum of all transaction amounts**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 4.8 Implement `sortDescending(transactions)`
    - Returns transactions sorted by `timestamp` descending (most recent first)
    - _Requirements: 2.5_

  - [ ]* 4.9 Write property test for `sortDescending` — list always reverse-chronological (P5)
    - **Property 5: Transaction list is always sorted in reverse-chronological order**
    - **Validates: Requirements 2.5**

  - [x] 4.10 Implement `groupByCategory(transactions)`
    - Returns `{ labels: string[], data: number[], percentages: string[] }`
    - Excludes categories with total ≤ 0; percentages rounded to 1 decimal place
    - _Requirements: 4.1, 4.4, 4.5, 4.7_

  - [ ]* 4.11 Write property test for `groupByCategory` — pie chart proportions correct (P6)
    - **Property 6: Pie chart data proportions are correct and complete**
    - **Validates: Requirements 4.1, 4.4, 4.5, 4.7**

  - [x] 4.12 Implement `formatMonthLabel(date)` and `groupByMonth(transactions)`
    - `formatMonthLabel` returns `"June 2025"` format
    - `groupByMonth` returns `Array<{ label: string, total: number }>` sorted descending
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 4.13 Write property test for `groupByMonth` — monthly grouping correct (P10)
    - **Property 10: Monthly grouping correctly aggregates by month and year**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 5. Checkpoint — Ensure all business logic tests pass
  - Verify that all implemented pure functions and their property tests run correctly
  - Ask the user if any questions arise before proceeding to rendering.

- [x] 6. Implement rendering functions
  - [x] 6.1 Implement `renderCategoryOptions()`
    - Populates the `<select>` in `#transaction-form` with `<option>` elements for all categories in `appState.categories`
    - _Requirements: 1.6, 1.7, 5.4_

  - [ ]* 6.2 Write property test for custom categories appearing in selector (P12)
    - **Property 12: Custom categories appear in Input Form selector after addition**
    - **Validates: Requirements 1.7, 5.4**

  - [x] 6.3 Implement `renderBalance()`
    - Reads `appState.transactions`, calls `calculateTotal()` + `formatCurrency()`, sets `#balance-display` text content
    - Shows `$0.00` when no transactions
    - _Requirements: 3.1, 3.4_

  - [x] 6.4 Implement `renderTransactionList()`
    - Calls `sortDescending()`, renders `<li>` rows each with item name, formatted amount (2 decimal places + currency symbol), category, and a delete `<button data-id="...">` with an accessible label
    - Renders empty-state `<li class="empty-state">` when no transactions exist
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 6.5 Implement `renderPieChart()`
    - Calls `groupByCategory()` to build Chart.js data; creates or updates a Chart.js `Pie` instance stored in a module-level variable (call `chart.update()` if already initialized, otherwise `new Chart(...)`)
    - Renders no segments and no runtime error when no transactions
    - Labels formatted as `"CategoryName (X.X%)"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.6 Implement `renderMonthlySummary()`
    - Calls `groupByMonth()`, renders a `<dl>` or `<table>` of month label → formatted total
    - Renders empty-state message when no transactions; wraps read in try/catch and shows error message if data cannot be loaded
    - _Requirements: 6.1–6.6_

  - [x] 6.7 Implement `renderAll()`
    - Calls `renderBalance()`, `renderTransactionList()`, `renderPieChart()`, and `renderCategoryOptions()`
    - Only re-renders `renderMonthlySummary()` when `appState.view === 'summary'`
    - _Requirements: 3.2, 3.3, 4.2, 4.3_

- [x] 7. Implement event handlers
  - [x] 7.1 Implement `handleAddTransaction()`
    - Reads form fields, calls `validateTransaction()`, shows/clears inline `<span class="field-error" role="alert">` errors adjacent to each field
    - On success: creates a `Transaction` with `crypto.randomUUID()`, `Date.now()` timestamp; pushes to `appState.transactions`; calls `saveTransactions()`; calls `renderAll()`; resets the form
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 8.1_

  - [x] 7.2 Implement `handleDeleteTransaction(id)`
    - Filters `appState.transactions` to remove the entry with the matching `id`; calls `saveTransactions()`; calls `renderAll()`
    - Delegates delete-button click via event delegation on `#transaction-list`
    - _Requirements: 2.3, 8.1_

  - [ ]* 7.3 Write property test for transaction deletion removes exactly the target (P4)
    - **Property 4: Transaction deletion removes exactly the targeted entry**
    - **Validates: Requirements 2.3, 8.1**

  - [x] 7.4 Implement `handleAddCategory()`
    - Reads input, checks `appState.categories.length` against `MAX_CUSTOM_CATEGORIES`, calls `validateCategory()`
    - On success: calls `saveCategories()` — if it returns `false`, shows inline error *"Category could not be saved."* and stops; otherwise pushes to `appState.categories` and calls `renderCategoryOptions()` + clears input
    - Shows inline `<span class="field-error" role="alert">` on validation failure
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7_

  - [x] 7.5 Implement `handleThemeToggle()`
    - Toggles `data-theme` attribute on `<html>` between `"light"` and `"dark"`; updates `appState.theme`; calls `saveTheme()`
    - Updates `aria-label` on `#theme-toggle` button to reflect new target state
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.6 Implement `handleViewSwitch(view)`
    - Sets `appState.view` and updates `data-view` attribute on the root wrapper
    - When switching to `'summary'` calls `renderMonthlySummary()`
    - _Requirements: 6.3, 6.4_

- [x] 8. Implement `init()` and wire all event listeners
  - Write `init()`: calls `initState()`, applies stored/detected theme to `<html>` before any render, displays toast notifications for any `storageError` flags, calls `renderAll()`, and attaches all event listeners (form submit, delete delegation, category submit, theme toggle click, view switch clicks)
  - Register `init()` on `DOMContentLoaded`
  - Implement the Chart.js CDN 10-second error banner: if `onerror` fires, start a 10-second timer; if `window.Chart` is still undefined after 10 s, render the visible error banner
  - _Requirements: 7.4, 7.5, 7.6, 8.2, 8.4, 8.5, 8.6, 9.1, 10.4_

- [x] 9. Implement CSS — responsive layout and theming
  - [x] 9.1 Write base styles and CSS custom properties for light and dark themes
    - Define `--color-bg`, `--color-text`, `--color-surface`, `--color-accent` etc. under `:root` (light) and `[data-theme="dark"]`
    - Ensure contrast ratio ≥ 4.5:1 between text and background colors in both themes (WCAG 2.1 AA)
    - _Requirements: 7.7, 7.8_

  - [x] 9.2 Write responsive layout styles
    - Default (≥ 768px): flexible multi-column grid
    - Mobile (320–767px): single-column stacked layout for `#transaction-form`, `#balance-display`, `#transaction-list`, `#pie-chart-canvas` — each full available width
    - No horizontal scrolling or overlapping at any width from 320px to 1440px
    - Minimum 24×24 px touch target for `#theme-toggle`
    - _Requirements: 7.1, 9.3, 9.4_

  - [x] 9.3 Style all UI components
    - Input form fields, buttons, select, error spans, transaction list rows, balance display, pie chart wrapper, category form, monthly summary table, view navigation controls, toast notification, and error banner
    - _Requirements: 1.1, 2.1, 2.4, 3.1, 5.1, 6.2, 9.3_

- [ ] 10. Checkpoint — Full integration review
  - Ensure all event handlers are wired in `init()`, all render functions are called at the correct times, and the app functions end-to-end: add transaction → balance updates, list updates, pie chart updates; delete transaction → same; add category → selector updates; theme toggle → theme switches and persists; view switch → monthly summary renders; page reload → state restored from `localStorage`
  - Ensure all automated tests pass. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** loaded via CDN (`https://cdn.jsdelivr.net/npm/fast-check@3/lib/bundle/main.js`) in the test environment; tag each test with `// Feature: expense-budget-visualizer, Property N: <title>`
- All property tests require a minimum of 100 iterations
- Test files live in `tests/unit/` and `tests/integration/` as described in the design document
- The Chart.js `Pie` instance must be stored in a module-level variable and updated with `chart.update()` rather than re-created on each render (avoids canvas context leaks)
- `crypto.randomUUID()` is available in all target browsers without polyfills

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "4.1", "4.4", "4.6", "4.8", "4.10", "4.12"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.5", "4.7", "4.9", "4.11", "4.13"] },
    { "id": 4, "tasks": ["6.1", "6.3", "6.4", "6.5", "6.6", "9.1", "9.2"] },
    { "id": 5, "tasks": ["6.2", "6.7", "9.3"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.4", "7.5", "7.6"] },
    { "id": 7, "tasks": ["7.3"] }
  ]
}
```

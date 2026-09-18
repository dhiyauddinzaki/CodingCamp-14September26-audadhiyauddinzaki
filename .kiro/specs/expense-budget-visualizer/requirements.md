# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, client-side web application that helps users track daily spending. Users can log transactions with a name, amount, and category; view a scrollable transaction list; see a live total balance; and explore a pie chart of spending by category. The app runs entirely in the browser using HTML, CSS, and Vanilla JavaScript — with data persisted via the Browser LocalStorage API. No backend or build tooling is required.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single spending record composed of an item name, a monetary amount, and a category.
- **Category**: A label that classifies a transaction (e.g., Food, Transport, Fun, or a user-defined custom category).
- **Input_Form**: The UI component that collects item name, amount, and category from the user.
- **Transaction_List**: The scrollable UI component that displays all stored transactions.
- **Balance_Display**: The UI component at the top of the page that shows the current total spending.
- **Pie_Chart**: The visual chart component that breaks down total spending by category.
- **LocalStorage**: The browser's built-in key-value storage used to persist transaction data client-side.
- **Category_Manager**: The UI component that allows users to add and manage custom categories.
- **Monthly_Summary**: The UI view that aggregates and displays transaction totals grouped by month.
- **Theme_Toggle**: The UI control that switches the App between dark mode and light mode.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill out a form with an item name, amount, and category so that I can log a new spending transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL display a text field for the item name (up to 100 characters), a numeric field for the amount, and a category selector.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add a new Transaction to the transaction data store containing the item name, amount, and selected category.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Input_Form SHALL display an inline validation error message adjacent to each empty field and SHALL NOT add a Transaction.
4. WHEN the user submits the Input_Form with an amount that is not a number greater than 0, THE Input_Form SHALL display an inline validation error message adjacent to the amount field and SHALL NOT add a Transaction.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state within 1 second.
6. THE Input_Form SHALL include at minimum the default categories: Food, Transport, and Fun.
7. WHERE custom categories have been added by the user, THE Input_Form category selector SHALL include those custom categories alongside the default ones.
8. WHEN the user submits the Input_Form with an item name exceeding 100 characters, THE Input_Form SHALL display an inline validation error message adjacent to the item name field and SHALL NOT add a Transaction.
9. THE Input_Form SHALL only accept amount values between 0.01 and 999,999,999.99 inclusive; any value outside this range SHALL trigger the inline validation error described in criterion 4.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my logged transactions in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored Transactions, each showing the item name, amount formatted to exactly 2 decimal places with a currency symbol, and category.
2. WHILE the number of Transactions exceeds the visible viewport height, THE Transaction_List SHALL be vertically scrollable.
3. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the data store and SHALL update the Transaction_List within one rendering frame.
4. WHILE no Transactions exist, THE Transaction_List SHALL display an empty-state message indicating there are no transactions yet.
5. THE Transaction_List SHALL display Transactions in reverse-chronological order (most recent first).

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending at the top of the page so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts formatted with a currency symbol and exactly 2 decimal places (e.g., "$123.45").
2. WHEN a Transaction is added, THE Balance_Display SHALL reflect the new sum without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL reflect the new sum without requiring a page reload.
4. WHILE no Transactions exist, THE Balance_Display SHALL display "$0.00".

---

### Requirement 4: Spending Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending grouped by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL render one segment per category that has at least one Transaction with a positive amount, where each segment's arc is proportional to (category total / overall total × 360 degrees).
2. WHEN a Transaction is added, THE Pie_Chart SHALL re-render to reflect the updated category totals within 500 milliseconds without requiring a page reload.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL re-render to reflect the updated category totals within 500 milliseconds without requiring a page reload.
4. THE Pie_Chart SHALL display a legend or label identifying each category segment by name and its percentage of total spending, rounded to 1 decimal place.
5. WHILE no Transactions exist, THE Pie_Chart SHALL render no segments and display no runtime error.
6. THE App SHALL render the Pie_Chart using Chart.js loaded from a CDN, with no additional build tooling required.
7. THE Pie_Chart SHALL exclude any category whose total Transaction amount is zero or negative from segment calculations.

---

### Requirement 5: Custom Categories

**User Story:** As a user, I want to add my own spending categories so that I can classify transactions beyond the default options.

#### Acceptance Criteria

1. THE Category_Manager SHALL provide an input control for the user to enter a new category name of up to 50 characters.
2. WHEN the user submits a new category name that is between 1 and 50 characters and is not a duplicate of an existing category name (case-insensitive), THE Category_Manager SHALL add the new category to the category list.
3. WHEN the user submits a category name that is empty, exceeds 50 characters, or duplicates an existing category name (case-insensitive), THE Category_Manager SHALL display an inline validation error message adjacent to the input control and SHALL NOT add the category.
4. WHEN a new custom category is added, THE Input_Form category selector SHALL include the new category immediately without requiring a page reload.
5. THE App SHALL persist custom categories to LocalStorage so that they are available after the page is reloaded.
6. IF the number of existing custom categories has reached 50, THEN THE Category_Manager SHALL display an inline error message indicating the category limit has been reached and SHALL NOT add the new category.
7. IF writing custom categories to LocalStorage fails, THEN THE App SHALL display an error message indicating that the category could not be saved and SHALL NOT add the category to the category list.

---

### Requirement 6: Monthly Summary View

**User Story:** As a user, I want a monthly summary of my transactions so that I can review how much I spent in each past month.

#### Acceptance Criteria

1. THE Monthly_Summary SHALL group Transactions by calendar month and year and display the total spending for each group, where the total is the sum of all Transaction amounts within that month and year.
2. THE Monthly_Summary SHALL display each monthly group with its month label formatted as "[Full Month Name] [4-digit Year]" (e.g., "June 2025") and the total amount formatted to exactly 2 decimal places with a currency symbol.
3. WHEN the user navigates to the Monthly_Summary view, THE App SHALL display all months for which at least one Transaction exists, sorted in descending chronological order with the most recent month displayed first.
4. WHEN a Transaction is added or deleted, THE Monthly_Summary SHALL reflect the updated group totals and month list the next time the Monthly_Summary view is loaded.
5. WHILE no Transactions exist, THE Monthly_Summary SHALL display an empty-state message indicating that no transactions are available.
6. IF the Monthly_Summary view fails to load Transaction data, THEN THE App SHALL display an error message indicating that the summary could not be loaded and retain the previously displayed content if available.

---

### Requirement 7: Dark / Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Theme_Toggle SHALL provide a visible control, with a minimum touch/click target size of 24×24 pixels, that switches the App between dark mode and light mode.
2. WHEN the user activates the Theme_Toggle, THE App SHALL apply the selected theme to all visible UI components within one rendering frame.
3. WHEN the user activates the Theme_Toggle, THE App SHALL persist the selected theme preference to LocalStorage, replacing any previously stored value.
4. WHEN the App loads and a theme preference is stored in LocalStorage, THE App SHALL apply the stored theme before rendering any visible UI components.
5. WHEN the App loads and no theme preference is stored in LocalStorage, THE App SHALL apply the theme matching the system-level color scheme preference detected via the `prefers-color-scheme` media query.
6. IF the `prefers-color-scheme` media query is not supported by the browser, THEN THE App SHALL default to light mode.
7. WHILE in dark mode, THE App SHALL maintain a contrast ratio of at least 4.5:1 between text and background colors as per WCAG 2.1 AA guidelines.
8. WHILE in light mode, THE App SHALL maintain a contrast ratio of at least 4.5:1 between text and background colors as per WCAG 2.1 AA guidelines.

---

### Requirement 8: Data Persistence

**User Story:** As a user, I want my transactions and preferences to be saved locally so that my data is still available when I close and reopen the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, THE App SHALL write the complete list of Transactions to LocalStorage under a single, consistent storage key before the next render cycle completes.
2. WHEN the App loads, THE App SHALL read Transactions from LocalStorage and restore the transaction data store before rendering any UI components, completing the restore within 500ms of page load.
3. WHEN a custom category is added or deleted, THE App SHALL write the complete list of custom categories to LocalStorage under a single, consistent storage key before the next render cycle completes.
4. WHEN the App loads, THE App SHALL read custom categories from LocalStorage and restore the category list before rendering the Input_Form, completing the restore within 500ms of page load.
5. IF LocalStorage is unavailable or a read operation returns data that cannot be parsed as a valid list of Transactions, THEN THE App SHALL initialize the transaction data store as an empty list and SHALL display a non-blocking notification within 2 seconds indicating that saved transaction data could not be loaded.
6. IF LocalStorage is unavailable or a read operation returns data that cannot be parsed as a valid list of custom categories, THEN THE App SHALL initialize the category list with the default categories only and SHALL display a non-blocking notification within 2 seconds indicating that saved category data could not be loaded.

---

### Requirement 9: Performance and Responsiveness

**User Story:** As a user, I want the app to feel fast and work well on my phone so that I can log expenses on the go without frustration.

#### Acceptance Criteria

1. THE App SHALL render its initial UI within 2 seconds on a standard modern browser with a warm cache, measured from navigation start to the point where all visible UI components are fully painted and interactive.
2. WHEN a Transaction is added or deleted, THE App SHALL update the Balance_Display, Transaction_List, and Pie_Chart within 100 milliseconds of the user confirming the action.
3. THE App SHALL apply a responsive layout that adapts to viewport widths from 320px to 1440px without horizontal scrolling or overlapping elements, including all form fields, buttons, and chart components.
4. IF the App is loaded on a viewport width between 320px and 767px, THEN THE App SHALL display a single-column layout where the Transaction_Form, Balance_Display, Transaction_List, and Pie_Chart each occupy the full available width in a vertically stacked arrangement.
5. THE App SHALL use a single CSS file located at `css/styles.css` and a single JavaScript file located at `js/app.js`.
6. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari without polyfills or transpilation, where "correctly" means all Acceptance Criteria for all requirements are satisfied in each browser.

---

### Requirement 10: Standalone and Browser Extension Compatibility

**User Story:** As a user, I want to open the app as a plain HTML file or as a browser extension so that I can choose the most convenient way to access it.

#### Acceptance Criteria

1. THE App SHALL be fully functional when opened as a local file via the `file://` protocol without a web server, meaning all UI components render, all user interactions respond within 3 seconds, and no errors occur due to the `file://` protocol.
2. THE App SHALL load all external dependencies (e.g., Chart.js) from absolute `https://` CDN URLs so that no local build step is required, and no console errors related to dependency loading occur on first load.
3. WHERE the App is packaged as a browser extension, THE App SHALL comply with the Manifest V3 Content Security Policy by declaring all external script sources in the `content_security_policy` manifest field and loading scripts only from those declared sources.
4. IF an external CDN dependency fails to load within 10 seconds, THEN THE App SHALL display a user-visible error message indicating that a required dependency could not be loaded and that the App may not function correctly.

# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a three-file, zero-dependency single-page app (`index.html`, `css/styles.css`, `js/app.js`) using plain HTML, CSS, and Vanilla JavaScript. Chart.js is loaded via CDN. All state lives in a single in-memory object; every mutation persists to `localStorage` and triggers a full re-render via `renderAll()`.

## Tasks

- [x] 1. Create the HTML skeleton (`index.html`)
  - Create `index.html` with `<body data-theme="light">`, `<header>` containing `<h1>` and `#theme-toggle` button, and `<main>` containing all sections
  - Add `#form-section` with `#transaction-form` containing `#item-name`, `#amount`, `#category` (Food / Transport / Fun options), submit button, and `#form-errors` (`aria-live="polite"`)
  - Add `#balance-section` with `#balance-display` span
  - Add `#controls-section` with `#sort-control` select (none / amount-asc / amount-desc / category-az) and `#spending-limit` number input
  - Add `#content-grid` containing `#list-section` with `#transaction-list` (`<ul>`) and `#chart-section` with `#spending-chart` (`<canvas>`) and `#chart-empty-state` (`<p hidden>`)
  - Add `<link>` to `css/styles.css` and `<script src="js/app.js" defer>` — also add Chart.js CDN `<script>` before `app.js`
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.5, 7.1, 8.1, 9.1, 10.3_

- [x] 2. Implement state, storage, and validation (`js/app.js` — foundation)
  - [x] 2.1 Define the `state` object and `CATEGORY_COLORS` constant
    - Declare `state = { transactions: [], spendingLimit: null, sortOrder: 'none', theme: 'light' }`
    - Declare `CATEGORY_COLORS` mapping Food / Transport / Fun to hex values for light and dark themes
    - Declare module-level `let chartInstance = null`
    - _Requirements: 1.1, 5.1, 9.5_

  - [x] 2.2 Implement `loadFromStorage()` and `saveToStorage()`
    - `saveToStorage()` writes `state.transactions` to `expense_transactions` and `state.theme` to `expense_theme` using `JSON.stringify`; wraps in `try/catch` and logs on failure
    - `loadFromStorage()` reads both keys, parses JSON, returns `{ transactions, theme }`; wraps in `try/catch` and returns empty defaults on failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.3 Write property test for persistence round-trip
    - **Property 9: Persistence round-trip**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 2.4 Implement `validateForm(name, amount)`
    - Return `{ valid: false, errors: [...] }` if `name.trim()` is empty, if `amount` is empty, or if `parseFloat(amount)` is not a positive finite number
    - Return `{ valid: true, errors: [] }` when all fields pass
    - _Requirements: 1.4, 1.5_

  - [ ]* 2.5 Write property test for whitespace/empty name rejection
    - **Property 3: Whitespace-only and empty names are rejected**
    - **Validates: Requirements 1.4**

  - [ ]* 2.6 Write property test for non-positive/non-numeric amount rejection
    - **Property 4: Non-positive and non-numeric amounts are rejected**
    - **Validates: Requirements 1.5**

- [x] 3. Implement state mutation functions (`js/app.js` — mutations)
  - [x] 3.1 Implement `addTransaction(name, amount, category)`
    - Create a transaction object with `id` (`crypto.randomUUID()` or `Date.now().toString()`), `name`, `amount` (parsed float), `category`, and `timestamp`
    - Push to `state.transactions`, call `saveToStorage()`, call `renderAll()`
    - _Requirements: 1.2, 6.1_

  - [ ]* 3.2 Write property test for transaction addition growing the list
    - **Property 1: Transaction addition grows the list**
    - **Validates: Requirements 1.2**

  - [x] 3.3 Implement `deleteTransaction(id)`
    - Filter `state.transactions` to remove the entry with the matching `id`, call `saveToStorage()`, call `renderAll()`
    - _Requirements: 3.2, 6.2_

  - [ ]* 3.4 Write property test for delete removing exactly one transaction
    - **Property 6: Delete removes exactly one transaction**
    - **Validates: Requirements 3.2**

  - [x] 3.5 Implement `setTheme(theme)`, `setSpendingLimit(value)`, and `setSort(order)`
    - `setTheme(theme)`: update `state.theme`, set `document.body.dataset.theme`, call `saveToStorage()`, call `renderAll()`
    - `setSpendingLimit(value)`: update `state.spendingLimit` (parse float or null), call `renderTransactionList()`
    - `setSort(order)`: update `state.sortOrder`, call `renderTransactionList()`
    - _Requirements: 7.2, 8.3, 9.2, 9.3, 9.4_

  - [ ]* 3.6 Write property test for theme toggle round-trip
    - **Property 13: Theme toggle is a round-trip**
    - **Validates: Requirements 9.2, 9.3**

  - [ ]* 3.7 Write property test for theme persistence round-trip
    - **Property 14: Theme persistence round-trip**
    - **Validates: Requirements 9.4**

- [x] 4. Checkpoint — core logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `getSortedTransactions()` and rendering functions (`js/app.js` — rendering)
  - [x] 5.1 Implement `getSortedTransactions()`
    - Return a shallow copy of `state.transactions` sorted by `state.sortOrder`; never mutate `state.transactions`
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ]* 5.2 Write property test for sorting producing correctly ordered results
    - **Property 10: Sorting produces correctly ordered results**
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 5.3 Write property test for sorting not mutating storage order
    - **Property 11: Sorting does not mutate storage order**
    - **Validates: Requirements 7.4**

  - [x] 5.4 Implement `renderBalance()`
    - Sum all `state.transactions` amounts and write the result formatted as `$X.XX` to `#balance-display`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.5 Write property test for balance equalling sum of all amounts
    - **Property 7: Balance equals sum of all transaction amounts**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 5.6 Implement `renderTransactionList()`
    - Call `getSortedTransactions()` to get the display list
    - For each transaction, create an `<li>` showing name, amount, and a category badge; apply a highlight class when `state.spendingLimit` is set and `transaction.amount > state.spendingLimit`; attach a delete button that calls `deleteTransaction(id)`
    - Clear and repopulate `#transaction-list` with the generated items
    - _Requirements: 2.1, 2.3, 3.1, 7.2, 7.3, 8.2, 8.3, 8.4_

  - [ ]* 5.7 Write property test for transaction list rendering all data with badges and delete buttons
    - **Property 5: Transaction list renders all data with badges and delete buttons**
    - **Validates: Requirements 2.1, 2.3, 3.1**

  - [ ]* 5.8 Write property test for spending limit highlight consistency
    - **Property 12: Spending limit highlight consistency**
    - **Validates: Requirements 8.2, 8.3**

- [x] 6. Implement Chart.js integration (`js/app.js` — chart)
  - [x] 6.1 Implement `renderChart()`
    - Compute per-category totals from `state.transactions`
    - If no transactions exist, hide `#spending-chart` and show `#chart-empty-state`; otherwise show the canvas and hide the empty state
    - Destroy `chartInstance` if it exists, then create a new `Chart` instance on `#spending-chart` with type `'pie'`, using `CATEGORY_COLORS` for the active theme, and store it in `chartInstance`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.6_

  - [ ]* 6.2 Write property test for chart data matching per-category totals
    - **Property 8: Chart data matches per-category totals**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 6.3 Implement `renderAll()`
    - Call `renderTransactionList()`, `renderBalance()`, and `renderChart()` in sequence
    - _Requirements: 1.2, 3.2, 3.3, 3.4_

- [x] 7. Implement event wiring (`js/app.js` — events)
  - [x] 7.1 Implement `initEventListeners()`
    - `#transaction-form` submit: call `validateForm`; if invalid, display errors in `#form-errors` and return; if valid, call `addTransaction` and reset the form
    - `#theme-toggle` click: call `setTheme` with the toggled value
    - `#sort-control` change: call `setSort` with the selected value
    - `#spending-limit` input: call `setSpendingLimit` with the current value
    - Clear `#form-errors` on `input` events for `#item-name` and `#amount`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 8.1, 8.3, 9.1, 9.2_

  - [ ]* 7.2 Write property test for form reset after successful submission
    - **Property 2: Form resets after successful submission**
    - **Validates: Requirements 1.3**

  - [x] 7.3 Bootstrap the app on `DOMContentLoaded`
    - Call `loadFromStorage()`, populate `state.transactions` and `state.theme` from the result
    - Apply `document.body.dataset.theme` from loaded theme
    - Call `renderAll()` then `initEventListeners()`
    - _Requirements: 6.3, 6.4, 9.4, 9.5_

- [x] 8. Checkpoint — JavaScript complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement styles (`css/styles.css`)
  - [x] 9.1 Define CSS custom properties and base styles
    - Declare `:root` variables: `--bg`, `--text`, `--card`, `--highlight`, `--badge-food`, `--badge-transport`, `--badge-fun`
    - Declare `[data-theme="dark"]` overrides for all custom properties
    - Apply `--bg` to `body` background, `--text` to body colour, `--card` to form and list card backgrounds
    - _Requirements: 9.2, 9.3, 9.5, 10.1_

  - [x] 9.2 Style the form, balance display, and controls
    - Style `#transaction-form` inputs and submit button for usability and accessibility (focus rings, label alignment)
    - Style `#balance-display` prominently
    - Style `#sort-control` and `#spending-limit` inputs
    - Style `#form-errors` in a distinct error colour
    - _Requirements: 1.1, 4.1, 7.1, 8.1_

  - [x] 9.3 Style the transaction list, badges, highlight, and delete buttons
    - Style `#transaction-list` as a scrollable container (overflow-y: auto with a max-height)
    - Style category badges as pill-shaped elements using `--badge-*` colour variables
    - Style the spending-limit highlight class with a distinct background using `--highlight`
    - Style delete buttons accessibly (visible focus, sufficient contrast)
    - _Requirements: 2.2, 2.3, 3.1, 8.2_

  - [x] 9.4 Implement responsive two-column layout and mobile stacking
    - Style `#content-grid` as a two-column CSS Grid for screens ≥ 768px
    - Add a media query for screens < 768px that switches `#content-grid` to a single-column stack
    - Ensure no horizontal scrolling at 320px viewport width
    - _Requirements: 10.1, 10.2_

- [x] 10. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Spending limit and sort order are intentionally not persisted to `localStorage` (reset on page load per design)
- The chart instance is always destroyed before re-creation to avoid Chart.js canvas reuse errors
- `getSortedTransactions()` always returns a copy — `state.transactions` always reflects insertion order for storage
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases

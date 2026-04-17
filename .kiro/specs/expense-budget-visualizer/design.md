# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a mobile-friendly single-page web application (SPA) that runs entirely in the browser. It uses plain HTML, CSS, and Vanilla JavaScript — no frameworks, no build step, no backend. Chart.js is loaded via CDN for pie chart rendering. All data is persisted in the browser's `localStorage`.

The app allows users to:
- Add and delete spending transactions (item name, amount, category)
- View a live-updating total balance
- Visualise spending distribution as a pie chart
- Sort transactions by amount or category
- Highlight transactions that exceed a configurable spending limit
- Toggle between dark and light mode (preference persisted)

### Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| Markup | HTML5 | Single `index.html`, semantic elements for accessibility |
| Styling | CSS3 (single file `css/styles.css`) | CSS custom properties for theming, media queries for responsiveness |
| Logic | Vanilla JS (single file `js/app.js`) | No build step required; ES6+ features (modules via `<script type="module">` not needed given single-file constraint) |
| Charts | Chart.js via CDN | Mature library, easy pie chart API, supports theme updates |
| Persistence | `localStorage` | Browser-native, no server required |

---

## Architecture

The app follows a simple **state → render** pattern. All application state lives in a single in-memory object. Every user action mutates state, persists to `localStorage`, and triggers a full re-render of the affected UI regions.

```
User Action
    │
    ▼
State Mutation  ──►  localStorage.setItem(...)
    │
    ▼
render()
  ├── renderTransactionList()
  ├── renderBalance()
  └── renderChart()
```

### File Structure

```
index.html          ← Single HTML page; loads CSS and JS
css/
  styles.css        ← All styles, CSS custom properties for theming
js/
  app.js            ← All application logic
```

### Module Responsibilities (within `app.js`)

The single JS file is organised into logical sections:

1. **State** — in-memory application state object
2. **Storage** — `loadFromStorage()` / `saveToStorage()` wrappers
3. **Validation** — `validateForm()` pure function
4. **State Mutations** — `addTransaction()`, `deleteTransaction()`, `setSpendingLimit()`, `setSort()`, `setTheme()`
5. **Rendering** — `renderAll()`, `renderTransactionList()`, `renderBalance()`, `renderChart()`
6. **Chart Management** — Chart.js instance lifecycle (`initChart()`, `updateChart()`)
7. **Event Wiring** — `initEventListeners()` called on `DOMContentLoaded`

---

## Components and Interfaces

### HTML Structure

```
<body data-theme="light|dark">
  <header>
    <h1>Expense & Budget Visualizer</h1>
    <button id="theme-toggle">🌙 / ☀️</button>
  </header>

  <main>
    <!-- Add Transaction Form -->
    <section id="form-section">
      <form id="transaction-form">
        <input id="item-name" type="text" />
        <input id="amount" type="number" min="0.01" step="0.01" />
        <select id="category">
          <option>Food</option>
          <option>Transport</option>
          <option>Fun</option>
        </select>
        <button type="submit">Add Transaction</button>
      </form>
      <!-- Inline validation messages rendered here -->
      <div id="form-errors" aria-live="polite"></div>
    </section>

    <!-- Balance Display -->
    <section id="balance-section">
      <p>Total Spent: <span id="balance-display">$0.00</span></p>
    </section>

    <!-- Controls: Sort + Spending Limit -->
    <section id="controls-section">
      <label for="sort-control">Sort by:</label>
      <select id="sort-control">
        <option value="none">Default</option>
        <option value="amount-asc">Amount (Low → High)</option>
        <option value="amount-desc">Amount (High → Low)</option>
        <option value="category-az">Category (A–Z)</option>
      </select>

      <label for="spending-limit">Spending Limit ($):</label>
      <input id="spending-limit" type="number" min="0" step="0.01" placeholder="No limit" />
    </section>

    <!-- Two-column layout on wide screens, stacked on mobile -->
    <div id="content-grid">
      <!-- Transaction List -->
      <section id="list-section">
        <h2>Transactions</h2>
        <ul id="transaction-list">
          <!-- Populated by renderTransactionList() -->
        </ul>
      </section>

      <!-- Chart -->
      <section id="chart-section">
        <h2>Spending by Category</h2>
        <canvas id="spending-chart"></canvas>
        <p id="chart-empty-state" hidden>No transactions yet.</p>
      </section>
    </div>
  </main>
</body>
```

### JavaScript Public Interface (key functions)

```javascript
// State shape
const state = {
  transactions: [],      // Transaction[]
  spendingLimit: null,   // number | null
  sortOrder: 'none',     // 'none' | 'amount-asc' | 'amount-desc' | 'category-az'
  theme: 'light',        // 'light' | 'dark'
};

// Core functions
function addTransaction(name, amount, category) {}   // mutates state, saves, renders
function deleteTransaction(id) {}                    // mutates state, saves, renders
function validateForm(name, amount) {}               // returns { valid: bool, errors: string[] }
function getSortedTransactions() {}                  // returns sorted copy, does NOT mutate state
function renderTransactionList() {}                  // reads state, updates DOM
function renderBalance() {}                          // reads state, updates DOM
function renderChart() {}                            // reads state, updates Chart.js instance
function setTheme(theme) {}                          // updates state, saves, applies data-theme attr
function loadFromStorage() {}                        // returns { transactions, theme }
function saveToStorage() {}                          // writes state to localStorage
```

---

## Data Models

### Transaction

```javascript
/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier (crypto.randomUUID() or Date.now().toString())
 * @property {string} name      - Item name (non-empty string)
 * @property {number} amount    - Positive number, stored as float
 * @property {string} category  - One of: 'Food' | 'Transport' | 'Fun'
 * @property {number} timestamp - Unix ms timestamp of when the transaction was added
 */
```

### Application State

```javascript
/**
 * @typedef {Object} AppState
 * @property {Transaction[]} transactions  - All recorded transactions (insertion order)
 * @property {number|null}  spendingLimit  - Active spending limit threshold, or null if unset
 * @property {string}       sortOrder      - Active sort: 'none'|'amount-asc'|'amount-desc'|'category-az'
 * @property {string}       theme          - Active theme: 'light' | 'dark'
 */
```

### localStorage Schema

Two keys are used:

| Key | Value | Notes |
|---|---|---|
| `expense_transactions` | `JSON.stringify(Transaction[])` | Full transaction array |
| `expense_theme` | `'light'` or `'dark'` | Theme preference |

The spending limit and sort order are **not** persisted — they reset to defaults on page load (no requirement to persist them).

### Category Colour Mapping

Used by Chart.js and category badges:

```javascript
const CATEGORY_COLORS = {
  Food:      { light: '#FF6384', dark: '#FF6384' },
  Transport: { light: '#36A2EB', dark: '#36A2EB' },
  Fun:       { light: '#FFCE56', dark: '#FFCE56' },
};
```

### Sorting Logic

`getSortedTransactions()` returns a shallow copy of `state.transactions` sorted by the active `sortOrder`. The original array is never mutated, ensuring `localStorage` always stores insertion order.

```javascript
function getSortedTransactions() {
  const copy = [...state.transactions];
  if (state.sortOrder === 'amount-asc')   return copy.sort((a, b) => a.amount - b.amount);
  if (state.sortOrder === 'amount-desc')  return copy.sort((a, b) => b.amount - a.amount);
  if (state.sortOrder === 'category-az')  return copy.sort((a, b) => a.category.localeCompare(b.category));
  return copy; // 'none' — insertion order
}
```

### Theme Application

Theme is applied by setting `data-theme` on `<body>`. CSS custom properties switch based on this attribute:

```css
:root                { --bg: #ffffff; --text: #111111; --card: #f5f5f5; }
[data-theme="dark"]  { --bg: #1a1a2e; --text: #e0e0e0; --card: #16213e; }
```

Chart.js colours (grid lines, legend text) are updated by calling `updateChart()` after a theme change, which reads the current theme from state and passes appropriate colour values to the Chart.js config.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction addition grows the list

*For any* valid transaction (non-empty name, positive amount, valid category), adding it to the transaction list should result in the list being exactly one element longer and containing an entry with the same name, amount, and category.

**Validates: Requirements 1.2**

### Property 2: Form resets after successful submission

*For any* valid transaction submission, after the transaction is added the form's item name field, amount field, and category field should all be reset to their default empty/initial state.

**Validates: Requirements 1.3**

### Property 3: Whitespace-only and empty names are rejected

*For any* string composed entirely of whitespace characters (or the empty string), submitting it as the item name should be rejected by `validateForm` and the transaction list should remain unchanged.

**Validates: Requirements 1.4**

### Property 4: Non-positive and non-numeric amounts are rejected

*For any* numeric value that is zero or negative, and for any non-numeric string, submitting it as the amount should be rejected by `validateForm` and the transaction list should remain unchanged.

**Validates: Requirements 1.5**

### Property 5: Transaction list renders all data with badges and delete buttons

*For any* transaction list, the rendered HTML should contain one row per transaction, each row displaying the transaction's item name, amount, and category; each row should include a visually distinct category badge with the correct category text; and each row should include a delete button.

**Validates: Requirements 2.1, 2.3, 3.1**

### Property 6: Delete removes exactly one transaction

*For any* transaction list containing at least one transaction, deleting a transaction by its id should result in a list that is exactly one element shorter and does not contain any entry with the deleted id.

**Validates: Requirements 3.2**

### Property 7: Balance equals sum of all transaction amounts

*For any* list of transactions (including the empty list), `computeBalance` should return the arithmetic sum of all transaction amounts formatted as a currency string with exactly two decimal places (e.g., "$0.00" for an empty list).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 8: Chart data matches per-category totals

*For any* transaction list, `computeCategoryTotals` should return values such that each category's value equals the sum of amounts for transactions in that category, and the sum of all category values equals the total balance.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 9: Persistence round-trip

*For any* transaction list, saving it to `localStorage` via `saveToStorage` and then reading it back via `loadFromStorage` should return a transaction list that is deeply equal to the original (same ids, names, amounts, categories, and timestamps in the same order).

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 10: Sorting produces correctly ordered results

*For any* transaction list and any sort order ('amount-asc', 'amount-desc', 'category-az'), `getSortedTransactions` should return a list where every adjacent pair of elements satisfies the sort criterion.

**Validates: Requirements 7.2, 7.3**

### Property 11: Sorting does not mutate storage order

*For any* transaction list and any sort order, calling `getSortedTransactions` and then reading the transaction list from `localStorage` should return the transactions in their original insertion order, not the sorted order.

**Validates: Requirements 7.4**

### Property 12: Spending limit highlight consistency

*For any* transaction list and any positive spending limit value, every transaction whose amount strictly exceeds the limit should receive the highlight class, and every transaction whose amount is at or below the limit should not receive the highlight class.

**Validates: Requirements 8.2, 8.3**

### Property 13: Theme toggle is a round-trip

*For any* starting theme ('light' or 'dark'), toggling the theme twice should return the application to the original theme value.

**Validates: Requirements 9.2, 9.3**

### Property 14: Theme persistence round-trip

*For any* theme value ('light' or 'dark'), saving it to `localStorage` and then reading it back via `loadFromStorage` should return the same theme value.

**Validates: Requirements 9.4**

---

## Error Handling

### Form Validation Errors

- Displayed inline below the form in `#form-errors` using an `aria-live="polite"` region so screen readers announce them.
- Each empty field produces a specific message (e.g., "Item Name is required.", "Amount is required.").
- An invalid amount produces: "Amount must be a positive number."
- Errors are cleared on the next successful submission or when the user begins typing in a field.

### localStorage Errors

- `loadFromStorage()` wraps `localStorage.getItem` in a `try/catch`. If parsing fails (corrupted JSON) or `localStorage` is unavailable (private browsing quota exceeded), the app initialises with an empty state and logs a warning to the console.
- `saveToStorage()` wraps `localStorage.setItem` in a `try/catch`. If saving fails (quota exceeded), the app continues to function in-memory and logs a warning — it does not crash or alert the user.

### Chart.js Errors

- If the `<canvas>` element is not found, `initChart()` logs an error and returns without throwing.
- The chart instance is stored in a module-level variable. `updateChart()` checks for a valid instance before calling `.update()`.

### Empty State

- When `state.transactions` is empty, `renderChart()` hides the `<canvas>` and shows `#chart-empty-state`.
- When transactions exist, `#chart-empty-state` is hidden and the canvas is shown.



// =============================================================================
// 1. STATE
// =============================================================================

/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier
 * @property {string} name      - Item name (non-empty string)
 * @property {number} amount    - Positive float
 * @property {string} category  - 'Food' | 'Transport' | 'Fun'
 * @property {number} timestamp - Unix ms timestamp
 */

/**
 * @typedef {Object} AppState
 * @property {Transaction[]} transactions
 * @property {number|null}   spendingLimit
 * @property {string}        sortOrder  - 'none'|'amount-asc'|'amount-desc'|'category-az'
 * @property {string}        theme      - 'light' | 'dark'
 */

/** @type {AppState} */
const state = {
  transactions: [],
  spendingLimit: null,
  sortOrder: 'none',
  theme: 'light',
};

/**
 * Category colour mapping for Chart.js and badges.
 * Colours are the same for both themes; extend dark values here if needed.
 */
const CATEGORY_COLORS = {
  Food:      { light: '#FF6384', dark: '#FF6384' },
  Transport: { light: '#36A2EB', dark: '#36A2EB' },
  Fun:       { light: '#FFCE56', dark: '#FFCE56' },
};

/** @type {import('chart.js').Chart|null} */
let chartInstance = null;

// =============================================================================
// 2. STORAGE
// =============================================================================

const STORAGE_KEY_TRANSACTIONS = 'expense_transactions';
const STORAGE_KEY_THEME        = 'expense_theme';

/**
 * Persist the current transactions array and theme preference to localStorage.
 * Failures are caught and logged — the app continues to work in-memory.
 */
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(state.transactions));
    localStorage.setItem(STORAGE_KEY_THEME, state.theme);
  } catch (err) {
    console.warn('saveToStorage: failed to write to localStorage.', err);
  }
}

/**
 * Read transactions and theme from localStorage.
 * Returns safe defaults if storage is unavailable or data is corrupted.
 *
 * @returns {{ transactions: Transaction[], theme: string }}
 */
function loadFromStorage() {
  try {
    const rawTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const rawTheme        = localStorage.getItem(STORAGE_KEY_THEME);

    const transactions = rawTransactions ? JSON.parse(rawTransactions) : [];
    const theme        = rawTheme === 'dark' ? 'dark' : 'light';

    return { transactions, theme };
  } catch (err) {
    console.warn('loadFromStorage: failed to read from localStorage.', err);
    return { transactions: [], theme: 'light' };
  }
}

// =============================================================================
// 3. STATE MUTATIONS
// =============================================================================

/**
 * Add a new transaction to state, persist to storage, and re-render.
 *
 * @param {string} name     - Item name (already validated as non-empty)
 * @param {string} amount   - Raw amount string (already validated as positive number)
 * @param {string} category - One of 'Food' | 'Transport' | 'Fun'
 */
function addTransaction(name, amount, category) {
  const transaction = {
    id:        (typeof crypto !== 'undefined' && crypto.randomUUID)
                 ? crypto.randomUUID()
                 : Date.now().toString(),
    name:      name.trim(),
    amount:    parseFloat(amount),
    category,
    timestamp: Date.now(),
  };

  state.transactions.push(transaction);
  saveToStorage();
  renderAll();
}

/**
 * Remove the transaction with the given id from state, persist, and re-render.
 *
 * @param {string} id - The id of the transaction to remove
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveToStorage();
  renderAll();
}

/**
 * Switch the active theme, persist the preference, and re-render.
 *
 * @param {'light'|'dark'} theme
 */
function setTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;

  // Update the toggle button icon to reflect the current theme
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  saveToStorage();
  renderAll();
}

/**
 * Update the spending limit threshold and refresh the transaction list.
 * Passing an empty string or a non-positive value clears the limit.
 *
 * @param {string} value - Raw value from the spending-limit input
 */
function setSpendingLimit(value) {
  const parsed = parseFloat(value);
  state.spendingLimit = (isFinite(parsed) && parsed > 0) ? parsed : null;
  renderTransactionList();
}

/**
 * Update the active sort order and refresh the transaction list.
 *
 * @param {'none'|'amount-asc'|'amount-desc'|'category-az'} order
 */
function setSort(order) {
  state.sortOrder = order;
  renderTransactionList();
}

// =============================================================================
// 4. VALIDATION
// =============================================================================

/**
 * Validate the Add Transaction form inputs.
 *
 * @param {string} name   - Raw value from the item-name field
 * @param {string} amount - Raw value from the amount field
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateForm(name, amount) {
  const errors = [];

  if (name.trim() === '') {
    errors.push('Item Name is required.');
  }

  if (amount === '' || amount === null || amount === undefined) {
    errors.push('Amount is required.');
  } else {
    const parsed = parseFloat(amount);
    if (!isFinite(parsed) || parsed <= 0) {
      errors.push('Amount must be a positive number.');
    }
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true,  errors: [] };
}

// =============================================================================
// 5. RENDERING
// =============================================================================

/**
 * Return a shallow copy of state.transactions sorted by the active sortOrder.
 * The original state.transactions array is never mutated, so localStorage
 * always preserves insertion order.
 *
 * @returns {Transaction[]}
 */
function getSortedTransactions() {
  const copy = [...state.transactions];
  if (state.sortOrder === 'amount-asc')  return copy.sort((a, b) => a.amount - b.amount);
  if (state.sortOrder === 'amount-desc') return copy.sort((a, b) => b.amount - a.amount);
  if (state.sortOrder === 'category-az') return copy.sort((a, b) => a.category.localeCompare(b.category));
  return copy; // 'none' — insertion order
}

/**
 * Compute the total of all transaction amounts and write it to #balance-display
 * formatted as a currency string with exactly two decimal places (e.g. "$12.50").
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
function renderBalance() {
  const total = state.transactions.reduce((sum, t) => sum + t.amount, 0);
  const display = document.getElementById('balance-display');
  if (display) {
    display.textContent = '$' + total.toFixed(2);
  }
}

/**
 * Build and inject the transaction list into #transaction-list.
 *
 * For each transaction (in the active sort order) an <li> is created that shows:
 *   - The item name
 *   - The amount formatted as "$X.XX"
 *   - A category badge coloured via a CSS class
 *   - A delete button that calls deleteTransaction(id)
 *
 * When state.spendingLimit is set and a transaction's amount exceeds it, the
 * <li> receives the "over-limit" class so CSS can apply a highlight.
 *
 * Requirements: 2.1, 2.3, 3.1, 7.2, 7.3, 8.2, 8.3, 8.4
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  const sorted = getSortedTransactions();

  // Clear existing items
  list.innerHTML = '';

  if (sorted.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'transaction-empty';
    empty.textContent = 'No transactions yet. Add one above!';
    list.appendChild(empty);
    return;
  }

  sorted.forEach(transaction => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = transaction.id;

    // Apply spending-limit highlight when the amount exceeds the active limit
    if (state.spendingLimit !== null && transaction.amount > state.spendingLimit) {
      li.classList.add('over-limit');
    }

    // Item name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = transaction.name;

    // Amount
    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = '$' + transaction.amount.toFixed(2);

    // Category badge
    const badge = document.createElement('span');
    badge.className = 'category-badge category-badge--' + transaction.category.toLowerCase();
    badge.textContent = transaction.category;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', 'Delete transaction: ' + transaction.name);
    deleteBtn.addEventListener('click', () => deleteTransaction(transaction.id));

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(badge);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

// =============================================================================
// 6. CHART
// =============================================================================

/**
 * Compute the total spending amount per category from state.transactions.
 *
 * @returns {{ labels: string[], data: number[], colors: string[] }}
 */
function computeCategoryTotals() {
  const categories = Object.keys(CATEGORY_COLORS); // ['Food', 'Transport', 'Fun']
  const theme = state.theme;

  const totals = {};
  categories.forEach(cat => { totals[cat] = 0; });

  state.transactions.forEach(t => {
    if (totals[t.category] !== undefined) {
      totals[t.category] += t.amount;
    }
  });

  // Only include categories that have at least one transaction
  const activeCategories = categories.filter(cat => totals[cat] > 0);

  return {
    labels: activeCategories,
    data:   activeCategories.map(cat => totals[cat]),
    colors: activeCategories.map(cat => CATEGORY_COLORS[cat][theme]),
  };
}

/**
 * Render (or update) the Chart.js pie chart in #spending-chart.
 *
 * - When no transactions exist: hides the canvas and shows #chart-empty-state.
 * - When transactions exist: shows the canvas, hides the empty state, destroys
 *   any existing Chart instance, and creates a fresh one.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.6
 */
function renderChart() {
  const canvas     = document.getElementById('spending-chart');
  const emptyState = document.getElementById('chart-empty-state');

  if (!canvas || !emptyState) {
    console.error('renderChart: required DOM elements not found.');
    return;
  }

  if (state.transactions.length === 0) {
    // Empty state — hide chart, show message
    canvas.hidden     = true;
    emptyState.hidden = false;

    // Destroy any lingering chart instance
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  // Transactions exist — show chart, hide empty state
  canvas.hidden     = false;
  emptyState.hidden = true;

  const { labels, data, colors } = computeCategoryTotals();

  // Destroy previous instance to avoid Chart.js canvas-reuse errors
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: state.theme === 'dark' ? '#e0e0e0' : '#111111',
            padding: 16,
            font: { size: 13 },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((s, v) => s + v, 0);
              const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${context.label}: $${value.toFixed(2)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// =============================================================================
// 7. RENDER ALL
// =============================================================================

/**
 * Re-render every dynamic UI region in response to a state change.
 * Call this after any mutation that affects multiple regions.
 *
 * Requirements: 1.2, 3.2, 3.3, 3.4
 */
function renderAll() {
  renderTransactionList();
  renderBalance();
  renderChart();
}

// =============================================================================
// 8. EVENT WIRING
// =============================================================================

/**
 * Attach all DOM event listeners.
 * Called once after the initial render on DOMContentLoaded.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 8.1, 8.3, 9.1, 9.2
 */
function initEventListeners() {
  // ── Add Transaction Form ──────────────────────────────────────────────────
  const form       = document.getElementById('transaction-form');
  const nameInput  = document.getElementById('item-name');
  const amountInput = document.getElementById('amount');
  const categoryInput = document.getElementById('category');
  const formErrors = document.getElementById('form-errors');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name     = nameInput  ? nameInput.value  : '';
      const amount   = amountInput ? amountInput.value : '';
      const category = categoryInput ? categoryInput.value : 'Food';

      const { valid, errors } = validateForm(name, amount);

      if (!valid) {
        if (formErrors) {
          formErrors.textContent = errors.join(' ');
        }
        return;
      }

      // Clear any previous errors
      if (formErrors) formErrors.textContent = '';

      addTransaction(name, amount, category);

      // Reset form fields to default state (Requirement 1.3)
      form.reset();
    });
  }

  // Clear form errors as the user types in name or amount fields (Requirement 1.4, 1.5)
  if (nameInput && formErrors) {
    nameInput.addEventListener('input', () => {
      formErrors.textContent = '';
    });
  }

  if (amountInput && formErrors) {
    amountInput.addEventListener('input', () => {
      formErrors.textContent = '';
    });
  }

  // ── Theme Toggle ──────────────────────────────────────────────────────────
  const themeToggle = document.getElementById('theme-toggle');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
    });
  }

  // ── Sort Control ──────────────────────────────────────────────────────────
  const sortControl = document.getElementById('sort-control');

  if (sortControl) {
    sortControl.addEventListener('change', () => {
      setSort(sortControl.value);
    });
  }

  // ── Spending Limit ────────────────────────────────────────────────────────
  const spendingLimitInput = document.getElementById('spending-limit');

  if (spendingLimitInput) {
    spendingLimitInput.addEventListener('input', () => {
      setSpendingLimit(spendingLimitInput.value);
    });
  }
}

// =============================================================================
// 9. BOOTSTRAP
// =============================================================================

/**
 * Initialise the app on DOMContentLoaded:
 *   1. Load persisted data from localStorage
 *   2. Hydrate state and apply the saved theme to <body>
 *   3. Render the full UI
 *   4. Wire up all event listeners
 *
 * Requirements: 6.3, 6.4, 9.4, 9.5
 */
document.addEventListener('DOMContentLoaded', () => {
  const { transactions, theme } = loadFromStorage();

  state.transactions = transactions;
  state.theme        = theme;

  // Apply the persisted (or default) theme before first render
  document.body.dataset.theme = state.theme;

  // Sync the toggle button icon with the loaded theme
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  renderAll();
  initEventListeners();
});

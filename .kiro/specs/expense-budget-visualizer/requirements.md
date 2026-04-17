# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, single-page web application that helps users track daily spending. It runs entirely in the browser using HTML, CSS, and Vanilla JavaScript with no backend server. All data is persisted using the browser's Local Storage API. The app provides an input form for adding transactions, a scrollable transaction list with delete support, a live total balance display, a pie chart showing spending by category, transaction sorting, a spending limit highlight feature, and a dark/light mode toggle.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single spending record consisting of an item name, a monetary amount, and a category.
- **Category**: One of three fixed spending labels — Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI panel that displays all saved transactions.
- **Balance_Display**: The UI element at the top of the page that shows the current total of all transaction amounts.
- **Chart**: The pie chart rendered using Chart.js that visualises spending distribution by category.
- **Form**: The "Add Transaction" input form containing the Item Name, Amount, and Category fields.
- **Storage**: The browser's Local Storage API used to persist transaction data between sessions.
- **Spending_Limit**: A user-defined monetary threshold above which individual transaction amounts are visually highlighted.
- **Theme_Toggle**: The UI control that switches the App between dark mode and light mode.
- **Sort_Control**: The UI control that reorders the Transaction_List by a chosen criterion.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a student tracking my spending, I want to fill in a form and add a transaction, so that I can record what I spent money on.

#### Acceptance Criteria

1. THE Form SHALL contain an Item Name text field, an Amount number field, and a Category dropdown with the options Food, Transport, and Fun.
2. WHEN the user submits the Form with all fields filled, THE App SHALL add a new Transaction to the Transaction_List.
3. WHEN the user submits the Form with all fields filled, THE Form SHALL reset all fields to their default empty state after the Transaction is added.
4. IF the user submits the Form with one or more empty fields, THEN THE Form SHALL display an inline validation message identifying each empty field and SHALL NOT add a Transaction.
5. IF the user enters a non-positive number or non-numeric value in the Amount field, THEN THE Form SHALL display a validation message stating the amount must be a positive number and SHALL NOT add a Transaction.

---

### Requirement 2: View the Transaction List

**User Story:** As a student tracking my spending, I want to see all my recorded transactions in a list, so that I can review what I have spent.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every saved Transaction showing its item name, amount, and category.
2. WHILE the number of Transactions exceeds the visible area, THE Transaction_List SHALL be scrollable.
3. THE Transaction_List SHALL display each Transaction's category as a visually distinct badge.

---

### Requirement 3: Delete a Transaction

**User Story:** As a student tracking my spending, I want to delete a transaction, so that I can remove entries I added by mistake.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a Delete button for each Transaction.
2. WHEN the user clicks the Delete button for a Transaction, THE App SHALL remove that Transaction from the Transaction_List.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the removal.
4. WHEN a Transaction is deleted, THE Chart SHALL update to reflect the removal.

---

### Requirement 4: Display Total Balance

**User Story:** As a student tracking my spending, I want to see my total spending at a glance, so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts formatted as a currency value with two decimal places.
2. WHEN a Transaction is added, THE Balance_Display SHALL update immediately to include the new amount.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update immediately to exclude the removed amount.
4. WHILE no Transactions exist, THE Balance_Display SHALL show a value of $0.00.

---

### Requirement 5: Visualise Spending by Category

**User Story:** As a student tracking my spending, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart using Chart.js that shows the proportion of total spending for each Category.
2. WHEN a Transaction is added, THE Chart SHALL update immediately to reflect the new spending distribution.
3. WHEN a Transaction is deleted, THE Chart SHALL update immediately to reflect the updated spending distribution.
4. THE Chart SHALL display a colour-coded legend identifying each Category.
5. WHILE no Transactions exist, THE Chart SHALL display an empty state message in place of the chart.

---

### Requirement 6: Persist Data Across Sessions

**User Story:** As a student tracking my spending, I want my transactions to be saved when I close the browser, so that I do not lose my data between sessions.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE Storage SHALL save the updated Transaction list to Local Storage.
2. WHEN a Transaction is deleted, THE Storage SHALL save the updated Transaction list to Local Storage.
3. WHEN the App loads, THE App SHALL read all Transactions from Local Storage and populate the Transaction_List, Balance_Display, and Chart before the user interacts.
4. IF Local Storage is empty or unavailable, THEN THE App SHALL initialise with an empty Transaction_List and a Balance_Display value of $0.00.

---

### Requirement 7: Sort Transactions

**User Story:** As a student reviewing my spending, I want to sort my transactions by amount or category, so that I can find and compare entries more easily.

#### Acceptance Criteria

1. THE Sort_Control SHALL provide options to sort the Transaction_List by amount (ascending and descending) and by category (A–Z).
2. WHEN the user selects a sort option, THE Transaction_List SHALL reorder immediately according to the selected criterion.
3. WHEN a new Transaction is added while a sort option is active, THE Transaction_List SHALL apply the active sort order to the updated list.
4. THE Sort_Control SHALL NOT modify the order in which Transactions are stored in Local Storage.

---

### Requirement 8: Highlight Transactions Over Spending Limit

**User Story:** As a student managing my budget, I want transactions above a spending limit to be highlighted, so that I can quickly spot expensive items.

#### Acceptance Criteria

1. THE App SHALL provide a Spending_Limit input field where the user can enter a positive monetary threshold.
2. WHEN a Transaction's amount exceeds the active Spending_Limit, THE Transaction_List SHALL apply a distinct visual highlight to that Transaction's row.
3. WHEN the user changes the Spending_Limit value, THE Transaction_List SHALL immediately re-evaluate and update the highlight state of all Transactions.
4. WHILE no Spending_Limit has been set, THE Transaction_List SHALL display all Transactions without any highlight applied.

---

### Requirement 9: Dark/Light Mode Toggle

**User Story:** As a student using the app in different lighting conditions, I want to switch between dark and light mode, so that the app is comfortable to read at any time of day.

#### Acceptance Criteria

1. THE Theme_Toggle SHALL be visible and accessible on all screen sizes.
2. WHEN the user activates the Theme_Toggle, THE App SHALL switch from light mode to dark mode.
3. WHEN the user activates the Theme_Toggle again, THE App SHALL switch from dark mode to light mode.
4. WHEN the App loads, THE App SHALL apply the theme last selected by the user if one was previously saved.
5. IF no theme preference has been saved, THEN THE App SHALL default to light mode.
6. WHEN the theme changes, THE Chart SHALL update its colour scheme to remain readable in the active theme.

---

### Requirement 10: Responsive and Accessible Layout

**User Story:** As a student using the app on my phone or laptop, I want the layout to adapt to my screen size, so that the app is easy to use on any device.

#### Acceptance Criteria

1. THE App SHALL display correctly on screen widths from 320px to 1920px without horizontal scrolling.
2. WHEN the screen width is below 768px, THE App SHALL stack the Transaction_List and Chart vertically.
3. THE App SHALL use a single CSS file located at `css/styles.css` and a single JavaScript file located at `js/app.js`.
4. THE App SHALL load and become interactive in under 3 seconds on a standard broadband connection.

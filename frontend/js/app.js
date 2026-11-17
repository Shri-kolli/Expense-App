// Global state
let categories = [];
let currentMonth = new Date().toISOString().slice(0, 7);
let summaryCarryover = {};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    if (!await initializeAuthentication()) return;

    // Set current month display
    document.getElementById('currentMonth').textContent = formatMonthDisplay(currentMonth);

    // Set default date to today
    document.getElementById('date').valueAsDate = new Date();

    // Setup tab navigation
    setupTabs();

    // Setup form handlers
    setupForms();

    // Load initial data
    await loadCategories();
    await loadDashboard();

    // Check if first time setup needed
    if (categories.length === 0) {
        if (confirm('No categories found. Would you like to initialize default categories?')) {
            await initializeDefaultData();
            await loadCategories();
            await loadDashboard();
        }
    }
});

// Tab Navigation
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            // Load data for specific tabs
            if (tabName === 'dashboard') {
                loadDashboard();
            } else if (tabName === 'transactions') {
                loadTransactions();
            } else if (tabName === 'categories') {
                loadCategoriesPage();
            }
        });
    });
}

// Form Setup
function setupForms() {
    // Transaction form
    document.getElementById('transactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddTransaction();
    });

    // Category form
    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveCategory();
    });

    // Edit transaction form
    document.getElementById('editTransactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUpdateTransaction();
    });

    // Type radio change - update categories
    document.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            populateCategoryDropdown(e.target.value);
            updateTransactionSubcategories();
        });
    });

    document.getElementById('category').addEventListener('change', updateTransactionSubcategories);
    document.getElementById('categoryType').addEventListener('change', updateCategoryFormFields);
    document.getElementById('parentCategory').addEventListener('change', updateCategoryFormFields);
    document.getElementById('previousMonth').addEventListener('click', () => changeDashboardMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeDashboardMonth(1));

    // Initial category population
    populateCategoryDropdown('expense');
    updateTransactionSubcategories();
    updateCategoryFormFields();
}

// ================ DASHBOARD ================

async function loadDashboard() {
    document.getElementById('calendarMonthLabel').textContent = formatMonthDisplay(currentMonth);
    const summaryData = await getMonthlySummary(currentMonth);

    if (!summaryData || !summaryData.summary) {
        console.error('Failed to load summary');
        return;
    }

    const summary = summaryData.summary;
    summaryCarryover = summary.categoryCarryoverFromPrevious || {};

    // Update summary cards
    document.getElementById('totalIncome').textContent = formatCurrency(summary.totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(summary.totalExpense);
    document.getElementById('currentBalance').textContent = formatCurrency(summary.currentBalance);
    document.getElementById('carryover').textContent = formatCurrency(summary.carryoverFromPrevious);

    // Update category spending bars
    displayCategorySpending(summary.categorySpending);

    // Load the month's daily spending and transaction history.
    const transactionsData = await getTransactions(currentMonth);
    if (transactionsData && transactionsData.transactions) {
        renderDailySpendingCalendar(transactionsData.transactions, currentMonth);
        displayRecentTransactions(transactionsData.transactions);
    } else {
        renderDailySpendingCalendar([], currentMonth);
        displayRecentTransactions([]);
    }
}

function changeDashboardMonth(offset) {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('currentMonth').textContent = formatMonthDisplay(currentMonth);
    loadDashboard();
}

function renderDailySpendingCalendar(transactions, month) {
    const [year, monthNumber] = month.split('-').map(Number);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
    const dailyTotals = {};

    transactions.forEach(transaction => {
        if (transaction.type !== 'expense' || !transaction.date) return;
        const day = Number(transaction.date.slice(8, 10));
        dailyTotals[day] = (dailyTotals[day] || 0) + Number(transaction.amount || 0);
    });

    const cells = [];
    for (let blank = 0; blank < mondayFirstOffset; blank += 1) {
        cells.push('<div class="calendar-day calendar-day-empty" role="presentation"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const total = dailyTotals[day] || 0;
        const dateLabel = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        cells.push(`
            <div class="calendar-day ${total > 0 ? 'has-spending' : ''}" role="gridcell"
                 aria-label="${dateLabel}${total > 0 ? `, spent ${formatCurrency(total)}` : ''}">
                <span class="calendar-day-number">${day}</span>
                ${total > 0
                    ? `<span class="calendar-day-total" title="${formatCurrency(total)}">${formatCalendarAmount(total)}</span>`
                    : ''}
            </div>
        `);
    }

    document.getElementById('dailySpendingCalendar').innerHTML = cells.join('');
}

function displayCategorySpending(categorySpending) {
    const container = document.getElementById('categoryBars');
    container.innerHTML = '';
    categorySpending = categorySpending || {};

    const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parentCategoryId);
    if (expenseCategories.length === 0) {
        container.innerHTML = '<p class="empty-state">No expenses recorded yet</p>';
        return;
    }

    expenseCategories.forEach(cat => {
        const children = categories.filter(child => child.parentCategoryId === cat.categoryId);
        const categorySpent = Number(categorySpending[cat.categoryId] || 0);
        const categoryCarryover = Number(summaryCarryover[cat.categoryId] || 0);
        const childSpent = children.reduce(
            (total, child) => total + Number(categorySpending[child.categoryId] || 0),
            0
        );
        const childBudget = children.reduce(
            (total, child) => total + Number(child.monthlyLimit || 0),
            0
        );
        const childCarryover = children.reduce(
            (total, child) => total + Number(summaryCarryover[child.categoryId] || 0),
            0
        );
        const spent = categorySpent + childSpent;
        const carryover = categoryCarryover + childCarryover;
        const baseLimit = Number(cat.monthlyLimit || 0) + childBudget;
        const limit = Math.max(0, baseLimit + carryover);
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
        const isOverLimit = spent > limit && baseLimit > 0;

        const barDiv = document.createElement('div');
        barDiv.className = 'category-bar';
        barDiv.innerHTML = `
            <div class="category-bar-header">
                <button class="category-bar-name category-quick-add"
                        onclick="quickAddExpense('${cat.categoryId}')"
                        type="button">${cat.icon} ${cat.name} <span>+ Add</span></button>
                <span class="category-bar-amount">
                    ₹${formatNumber(spent)}${limit > 0 ? ` / ₹${formatNumber(limit)}` : ''}
                </span>
            </div>
            ${carryover !== 0 ? `<div class="category-limit">Carry-forward: ₹${formatNumber(carryover)}</div>` : ''}
            ${limit > 0 ? `
                <div class="progress-bar-container">
                    <div class="progress-bar ${isOverLimit ? 'over-limit' : ''}"
                         style="width: ${Math.min(percentage, 100)}%; background-color: ${cat.color}">
                        ${percentage > 0 ? Math.round(percentage) + '%' : ''}
                    </div>
                </div>
            ` : ''}
            ${children.map(child => {
                const childSpent = Number(categorySpending[child.categoryId] || 0);
                const childCarryover = Number(summaryCarryover[child.categoryId] || 0);
                const childLimit = Math.max(0, Number(child.monthlyLimit || 0) + childCarryover);
                const childPercentage = childLimit > 0 ? (childSpent / childLimit) * 100 : 0;
                const childOverLimit = childSpent > childLimit;
                return `
                    <div class="subcategory-dashboard-row">
                        <button class="category-quick-add subcategory-quick-add"
                                onclick="quickAddExpense('${cat.categoryId}', '${child.categoryId}')"
                                type="button">${child.icon} ${child.name} <span>+ Add</span></button>
                        <span class="category-bar-amount">
                            ₹${formatNumber(childSpent)} / ₹${formatNumber(childLimit)}
                        </span>
                        ${childCarryover !== 0
                            ? `<div class="category-limit">Carry-forward: ₹${formatNumber(childCarryover)}</div>`
                            : ''}
                        <div class="progress-bar-container">
                            <div class="progress-bar ${childOverLimit ? 'over-limit' : ''}"
                                 style="width: ${Math.min(childPercentage, 100)}%; background-color: ${child.color}">
                                ${childPercentage > 0 ? Math.round(childPercentage) + '%' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
        container.appendChild(barDiv);
    });
}

function displayRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactionsList');

    if (transactions.length === 0) {
        container.innerHTML = '<p class="empty-state">No transactions yet</p>';
        return;
    }

    container.innerHTML = transactions.map(txn => createTransactionCard(txn)).join('');
}

// ================ ADD TRANSACTION ================

async function handleAddTransaction() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const parentCategoryId = document.getElementById('category').value;
    const subcategoryId = document.getElementById('subcategory').value;
    const category = categories.find(item => item.categoryId === (subcategoryId || parentCategoryId));
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    if (!parentCategoryId || !category || !amount || !date) {
        alert('Please fill in all required fields');
        return;
    }

    const transactionData = {
        type,
        categoryId: category.categoryId,
        categoryName: subcategoryId
            ? `${categories.find(item => item.categoryId === parentCategoryId).name} / ${category.name}`
            : category.name,
        amount,
        date,
        description
    };

    const result = await addTransaction(transactionData);

    if (result) {
        alert('Transaction added successfully!');
        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        updateTransactionSubcategories();

        // Reload dashboard
        loadDashboard();
    }
}

// ================ TRANSACTIONS LIST ================

async function loadTransactions() {
    const monthFilter = document.getElementById('monthFilter').value;
    const transactionsData = await getTransactions(monthFilter || null);

    const container = document.getElementById('transactionsList');

    if (!transactionsData || !transactionsData.transactions || transactionsData.transactions.length === 0) {
        container.innerHTML = '<div class="empty-state">No transactions found</div>';
        return;
    }

    container.innerHTML = transactionsData.transactions.map(txn => createTransactionCard(txn, true)).join('');
}

function createTransactionCard(txn, showActions = false) {
    const isIncome = txn.type === 'income';
    const sign = isIncome ? '+' : '-';

    return `
        <div class="transaction-item ${txn.type}">
            <div class="transaction-info">
                <div class="transaction-header">
                    <span class="transaction-amount ${txn.type}">${sign}₹${formatNumber(txn.amount)}</span>
                    <span class="transaction-category">${txn.categoryName}</span>
                </div>
                ${txn.description ? `<div class="transaction-description">${txn.description}</div>` : ''}
                <div class="transaction-date">${formatDate(txn.date)}</div>
            </div>
            ${showActions ? `
                <div class="transaction-actions">
                    <button onclick="editTransaction('${txn.transactionId}', '${txn.SK}')" class="btn btn-small">Edit</button>
                    <button onclick="confirmDeleteTransaction('${txn.transactionId}')" class="btn btn-small btn-danger">Delete</button>
                </div>
            ` : ''}
        </div>
    `;
}

async function editTransaction(transactionId, sk) {
    // Get transaction data
    const transactionsData = await getTransactions();
    const txn = transactionsData.transactions.find(t => t.transactionId === transactionId);

    if (!txn) {
        alert('Transaction not found');
        return;
    }

    // Populate edit form
    document.getElementById('editTransactionId').value = transactionId;
    document.getElementById('editTransactionSK').value = sk;
    document.getElementById('editAmount').value = txn.amount;
    document.getElementById('editDate').value = txn.date;
    document.getElementById('editDescription').value = txn.description || '';

    // Populate categories for edit
    const categorySelect = document.getElementById('editCategory');
    const relevantCategories = categories.filter(c => c.type === txn.type);
    categorySelect.innerHTML = relevantCategories.map(cat =>
        `<option value="${cat.categoryId}" ${cat.categoryId === txn.categoryId ? 'selected' : ''}>
            ${cat.parentCategoryId
                ? `&nbsp;&nbsp;${cat.icon} ${categories.find(parent => parent.categoryId === cat.parentCategoryId)?.name || ''} / ${cat.name}`
                : `${cat.icon} ${cat.name}`}
        </option>`
    ).join('');

    // Show modal
    document.getElementById('editTransactionModal').classList.add('active');
}

async function handleUpdateTransaction() {
    const transactionId = document.getElementById('editTransactionId').value;
    const sk = document.getElementById('editTransactionSK').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const categoryId = document.getElementById('editCategory').value;
    const category = categories.find(item => item.categoryId === categoryId);
    const parent = category?.parentCategoryId
        ? categories.find(item => item.categoryId === category.parentCategoryId)
        : null;
    const categoryName = parent ? `${parent.name} / ${category.name}` : category.name;
    const date = document.getElementById('editDate').value;
    const description = document.getElementById('editDescription').value;

    const updateData = {
        transactionId,
        SK: sk,
        amount,
        categoryId,
        categoryName,
        date,
        description
    };

    const result = await updateTransaction(updateData);

    if (result) {
        alert('Transaction updated successfully!');
        closeEditTransactionModal();
        loadTransactions();
        loadDashboard();
    }
}

async function confirmDeleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    const result = await deleteTransaction(transactionId);

    if (result) {
        alert('Transaction deleted successfully!');
        loadTransactions();
        loadDashboard();
    }
}

function closeEditTransactionModal() {
    document.getElementById('editTransactionModal').classList.remove('active');
}

// ================ CATEGORIES ================

async function loadCategories() {
    const data = await getCategories();
    if (data && data.categories) {
        categories = data.categories;
        populateCategoryDropdown('expense');
    }
}

function populateCategoryDropdown(type) {
    const select = document.getElementById('category');
    const relevantCategories = categories.filter(c => c.type === type && !c.parentCategoryId);

    select.innerHTML = '<option value="">Select Category</option>' +
        relevantCategories.map(cat =>
            `<option value="${cat.categoryId}">${cat.icon} ${cat.name}</option>`
        ).join('');
}

function updateTransactionSubcategories(selectedId = '') {
    const categoryId = document.getElementById('category').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const group = document.getElementById('subcategoryGroup');
    const select = document.getElementById('subcategory');
    const children = categories.filter(
        category => category.type === type && category.parentCategoryId === categoryId
    );

    select.innerHTML = '<option value="">Use category directly</option>' +
        children.map(child =>
            `<option value="${child.categoryId}">${child.icon} ${child.name}</option>`
        ).join('');
    select.value = children.some(child => child.categoryId === selectedId) ? selectedId : '';
    group.hidden = children.length === 0;
}

function quickAddExpense(categoryId, subcategoryId = '') {
    document.querySelector('input[name="type"][value="expense"]').checked = true;
    populateCategoryDropdown('expense');
    document.getElementById('category').value = categoryId;
    updateTransactionSubcategories(subcategoryId);

    document.querySelector('.tab-btn[data-tab="add-transaction"]').click();
    document.getElementById('amount').focus();
}

async function loadCategoriesPage() {
    await loadCategories();

    const expenseContainer = document.getElementById('expenseCategories');
    const incomeContainer = document.getElementById('incomeCategories');

    const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parentCategoryId);
    const incomeCategories = categories.filter(c => c.type === 'income');

    expenseContainer.innerHTML = expenseCategories.length > 0
        ? expenseCategories.map(cat => `
            ${createCategoryCard(cat)}
            ${categories
                .filter(child => child.parentCategoryId === cat.categoryId)
                .map(child => createCategoryCard(child, cat))
                .join('')}
        `).join('')
        : '<p class="empty-state">No expense categories</p>';

    incomeContainer.innerHTML = incomeCategories.length > 0
        ? incomeCategories.map(cat => createCategoryCard(cat)).join('')
        : '<p class="empty-state">No income categories</p>';
}

function createCategoryCard(cat, parent = null) {
    const limitLabel = parent
        ? `${cat.budgetPeriod === 'yearly' ? 'Yearly' : 'Monthly'} budget: ₹${formatNumber(cat.budgetAmount)}`
            + (cat.budgetPeriod === 'yearly'
                ? ` (₹${formatNumber(cat.monthlyLimit)} per month)`
                : '')
        : cat.type === 'expense' && cat.monthlyLimit > 0
            ? `Monthly limit: ₹${formatNumber(cat.monthlyLimit)}`
            : '';

    return `
        <div class="category-list-item ${parent ? 'subcategory-list-item' : ''}" style="border-left-color: ${cat.color}">
            <div class="category-list-info">
                <span class="category-icon">${cat.icon}</span>
                <div class="category-details">
                    <div class="category-name">${parent ? `${parent.name} / ` : ''}${cat.name}</div>
                    ${limitLabel ? `<div class="category-limit">${limitLabel}</div>` : ''}
                </div>
            </div>
            <div class="category-actions">
                <button onclick="editCategory('${cat.categoryId}')" class="btn btn-small">Edit</button>
                <button onclick="confirmDeleteCategory('${cat.categoryId}')" class="btn btn-small btn-danger">Delete</button>
            </div>
        </div>
    `;
}

function showAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('editCategoryId').value = '';
    document.getElementById('categoryIcon').value = '💰';
    document.getElementById('categoryColor').value = '#4CAF50';
    document.getElementById('budgetPeriod').value = 'monthly';
    populateParentCategoryDropdown();
    updateCategoryFormFields();
    document.getElementById('categoryModal').classList.add('active');
}

function editCategory(categoryId) {
    const cat = categories.find(c => c.categoryId === categoryId);
    if (!cat) return;

    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('editCategoryId').value = categoryId;
    document.getElementById('categoryName').value = cat.name;
    document.getElementById('categoryType').value = cat.type;
    document.getElementById('monthlyLimit').value = cat.monthlyLimit;
    document.getElementById('categoryIcon').value = cat.icon;
    document.getElementById('categoryColor').value = cat.color;
    populateParentCategoryDropdown();
    document.getElementById('parentCategory').value = cat.parentCategoryId || '';
    document.getElementById('budgetPeriod').value = cat.budgetPeriod || 'monthly';
    document.getElementById('budgetAmount').value = cat.budgetAmount || '';
    updateCategoryFormFields();

    document.getElementById('categoryModal').classList.add('active');
}

function populateParentCategoryDropdown() {
    const select = document.getElementById('parentCategory');
    const categoryId = document.getElementById('editCategoryId').value;
    const parents = categories.filter(category =>
        category.type === 'expense' &&
        !category.parentCategoryId &&
        category.categoryId !== categoryId
    );
    select.innerHTML = '<option value="">No parent (top-level category)</option>' +
        parents.map(parent =>
            `<option value="${parent.categoryId}">${parent.icon} ${parent.name}</option>`
        ).join('');
}

function updateCategoryFormFields() {
    const isExpense = document.getElementById('categoryType').value === 'expense';
    const isSubcategory = isExpense && Boolean(document.getElementById('parentCategory').value);
    document.getElementById('parentCategoryGroup').hidden = !isExpense;
    document.getElementById('categoryMonthlyLimitGroup').hidden = !isExpense || isSubcategory;
    document.getElementById('subcategoryBudgetGroup').hidden = !isSubcategory;
    document.getElementById('budgetAmount').required = isSubcategory;
}

async function handleSaveCategory() {
    const categoryId = document.getElementById('editCategoryId').value;
    const name = document.getElementById('categoryName').value;
    const type = document.getElementById('categoryType').value;
    const parentCategoryId = type === 'expense'
        ? document.getElementById('parentCategory').value
        : '';
    const monthlyLimit = parseFloat(document.getElementById('monthlyLimit').value) || 0;
    const icon = document.getElementById('categoryIcon').value;
    const color = document.getElementById('categoryColor').value;

    const categoryData = {
        name,
        type,
        monthlyLimit,
        icon,
        color,
        parentCategoryId: parentCategoryId || null
    };
    if (parentCategoryId) {
        categoryData.budgetPeriod = document.getElementById('budgetPeriod').value;
        categoryData.budgetAmount = parseFloat(document.getElementById('budgetAmount').value);
    }

    let result;
    if (categoryId) {
        // Update existing
        categoryData.categoryId = categoryId;
        result = await updateCategory(categoryData);
    } else {
        // Add new
        result = await addCategory(categoryData);
    }

    if (result && !result.error) {
        alert('Category saved successfully!');
        closeCategoryModal();
        await loadCategories();
        await loadCategoriesPage();
        await loadDashboard();
    }
}

async function confirmDeleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) {
        return;
    }

    const result = await deleteCategory(categoryId);

    if (result && !result.error) {
        alert('Category deleted successfully!');
        await loadCategories();
        await loadCategoriesPage();
        await loadDashboard();
    }
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

// ================ UTILITY FUNCTIONS ================

function formatCurrency(amount) {
    return '₹' + formatNumber(amount);
}

function formatCalendarAmount(amount) {
    if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(amount >= 1000000 ? 0 : 1)}L`;
    }
    if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
    }
    return formatCurrency(amount);
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatMonthDisplay(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long'
    });
}

// Close modals on outside click
window.onclick = function(event) {
    const categoryModal = document.getElementById('categoryModal');
    const editModal = document.getElementById('editTransactionModal');

    if (event.target === categoryModal) {
        closeCategoryModal();
    }
    if (event.target === editModal) {
        closeEditTransactionModal();
    }
};

// Global state
let categories = [];
let currentMonth = new Date().toISOString().slice(0, 7);
let summaryCarryover = {};
let selectedTodoDate = getLocalDateString(new Date());
let todoCalendarMonth = selectedTodoDate.slice(0, 7);
let todosForCalendar = [];
let selectedDateTodos = [];
let repeatTodosForToday = [];
let repeatTodoDate = getLocalDateString(new Date());
let repeatTodoCalendarMonth = repeatTodoDate.slice(0, 7);
let pendingHalfDoneTodo = null;
let businessTransactions = {};
let businessTransactionContext = null;
let editingTransactionBusinessId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    if (!await initializeAuthentication()) return;

    // Set current month display
    document.getElementById('currentMonth').textContent = formatHeaderMonth(currentMonth);

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
            if (tabName !== 'add-transaction' && businessTransactionContext) {
                clearBusinessTransactionContext();
            }

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
            } else if (tabName === 'todos') {
                document.getElementById('repeatTodosPage').hidden = true;
                document.getElementById('todoOverviewPage').hidden = false;
                loadTodoPage();
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
            if (businessTransactionContext) {
                businessTransactionContext.type = e.target.value;
                const business = categories.find(
                    category => category.categoryId === businessTransactionContext.businessId
                );
                document.getElementById('businessTransactionLabel').textContent =
                    `${business?.name || 'Business'} · Add ${e.target.value}`;
            }
            populateCategoryDropdown(e.target.value, businessTransactionContext?.businessId || null);
            updateTransactionSubcategories();
        });
    });

    document.getElementById('transactionLedger').addEventListener('change', handleTransactionLedgerChange);
    document.getElementById('category').addEventListener('change', updateTransactionSubcategories);
    document.getElementById('categoryType').addEventListener('change', updateCategoryFormFields);
    document.getElementById('parentCategory').addEventListener('change', updateCategoryFormFields);
    document.getElementById('categoryBusiness').addEventListener('change', updateCategoryFormFields);
    document.getElementById('businessCategories').addEventListener('click', handleBusinessCategoryClick);
    document.getElementById('businessDashboard').addEventListener('click', handleBusinessCategoryClick);
    document.getElementById('leaveBusinessTransaction').addEventListener('click', clearBusinessTransactionContext);
    document.getElementById('previousMonth').addEventListener('click', () => changeDashboardMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeDashboardMonth(1));
    document.getElementById('todoDate').value = selectedTodoDate;
    document.getElementById('repeatTodoDate').value = repeatTodoDate;
    document.getElementById('todoOwner').addEventListener('change', updateTodoAddLimit);
    document.getElementById('todoDate').addEventListener('change', async (event) => {
        if (!event.target.value) return;
        selectedTodoDate = event.target.value;
        todoCalendarMonth = selectedTodoDate.slice(0, 7);
        await loadTodoPage();
    });
    document.getElementById('todoPreviousMonth').addEventListener('click', () => changeTodoCalendarMonth(-1));
    document.getElementById('todoNextMonth').addEventListener('click', () => changeTodoCalendarMonth(1));
    document.getElementById('todoForm').addEventListener('submit', handleAddTodo);
    document.getElementById('todoTasksList').addEventListener('click', handleTodoAction);
    document.getElementById('todoTasksList').addEventListener('submit', handleTodoSubtaskSubmit);
    document.getElementById('repeatTodosBack').addEventListener('click', closeRepeatTodosPage);
    document.getElementById('repeatTodosPage').addEventListener('click', handleRepeatTodoPageClick);
    document.getElementById('repeatTodoDate').addEventListener('change', async (event) => {
        if (!event.target.value) return;
        repeatTodoDate = event.target.value;
        repeatTodoCalendarMonth = repeatTodoDate.slice(0, 7);
        await loadRepeatTodosPage();
    });
    document.getElementById('repeatTodoPreviousMonth').addEventListener('click', () => changeRepeatTodoCalendarMonth(-1));
    document.getElementById('repeatTodoNextMonth').addEventListener('click', () => changeRepeatTodoCalendarMonth(1));
    document.getElementById('repeatTodoCalendar').addEventListener('click', handleRepeatTodoCalendarClick);
    document.getElementById('repeatTodoForm').addEventListener('submit', handleRepeatTodoSubmit);
    document.getElementById('closeRepeatTodoModal').addEventListener('click', closeRepeatTodoModal);
    document.getElementById('cancelRepeatTodo').addEventListener('click', closeRepeatTodoModal);
    document.getElementById('todoCalendar').addEventListener('click', handleTodoCalendarClick);
    document.getElementById('halfDoneForm').addEventListener('submit', handleSaveHalfDone);
    document.getElementById('closeHalfDoneModal').addEventListener('click', closeHalfDoneModal);
    document.getElementById('cancelHalfDone').addEventListener('click', closeHalfDoneModal);

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
    await loadBusinessTransactions();
    renderBusinessDashboard();

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

// ================ HOUSEHOLD TODOS ================

async function loadTodoPage() {
    const dateInput = document.getElementById('todoDate');
    dateInput.value = selectedTodoDate;
    document.getElementById('todoDayTitle').textContent = formatTodoDate(selectedTodoDate);
    document.getElementById('todoCalendarMonthLabel').textContent =
        formatMonthDisplay(todoCalendarMonth);

    const [monthData, rewardData, repeatData] = await Promise.all([
        getTodosForMonth(todoCalendarMonth),
        getTodoReward(getLocalDateString(new Date()).slice(0, 7)),
        getRepeatTodos(selectedTodoDate)
    ]);

    if (!monthData || !Array.isArray(monthData.todos)) return;
    todosForCalendar = monthData.todos;
    selectedDateTodos = todosForCalendar.filter(todo => isTodoScheduledOnDate(todo, selectedTodoDate));
    repeatTodosForToday = repeatData?.repeatTodos || [];
    renderTodoTasks();
    renderTodoCalendar();
    updateTodoAddLimit();
    if (rewardData) renderTodoReward(rewardData);
}

function renderTodoReward(reward) {
    document.getElementById('todoRewardMonth').textContent =
        `${formatShortMonth(reward.month)} rewards`;
    document.getElementById('todoRewardBreakdown').innerHTML = `
        <span class="todo-reward-person todo-reward-wifey"><span>Wifey</span><strong>${formatCurrency(reward.rewards.wifey)}</strong></span>
        <span class="todo-reward-person todo-reward-hubby"><span>Hubby</span><strong>${formatCurrency(reward.rewards.hubby)}</strong></span>
    `;
}

function renderTodoTasks() {
    const container = document.getElementById('todoTasksList');
    const owners = [
        { id: 'wifey', label: 'Wifey', heart: '♡' },
        { id: 'hubby', label: 'Hubby', heart: '♥' }
    ];
    document.getElementById('todoMessage').hidden = true;

    container.innerHTML = owners.map(owner => {
        const ownerTodos = selectedDateTodos.filter(todo => todo.owner === owner.id);
        const completed = ownerTodos.filter(todo => isTodoDoneOnDate(todo, selectedTodoDate)).length;
        const cards = ownerTodos.length
            ? ownerTodos.map(createTodoCard).join('')
            : `<p class="todo-empty">Nothing planned yet. Keep it light or add one small win.</p>`;
        return `
            <section class="todo-owner-group todo-owner-${owner.id}" aria-labelledby="todo-${owner.id}-title">
                <div class="todo-owner-heading">
                    <h3 id="todo-${owner.id}-title">${owner.label} <span aria-hidden="true">${owner.heart}</span></h3>
                    <button type="button" class="todo-repeat-link" data-open-repeat="${owner.id}">Repeat-Todo</button>
                    <span>${completed}/${ownerTodos.length} done · ${ownerTodos.length}/6 tasks</span>
                </div>
                <div class="todo-owner-list">${cards}</div>
            </section>
        `;
    }).join('');
}

function createTodoCard(todo) {
    const duration = getTodoDuration(todo);
    const multiDay = duration > 1;
    const dayDone = Boolean(todo.dailyStatuses?.[selectedTodoDate]);
    const fullyCompleted = multiDay && todo.status === 'completed';
    const status = multiDay
        ? (dayDone || fullyCompleted ? 'completed' : 'open')
        : (['open', 'half_done', 'completed'].includes(todo.status) ? todo.status : 'open');
    const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];
    const statusLabel = multiDay
        ? (fullyCompleted ? 'Task complete' : dayDone ? 'Done for today' : `Day ${getTodoDayNumber(todo, selectedTodoDate)} of ${duration}`)
        : status === 'completed' ? 'Done' : status === 'half_done' ? 'Half done' : 'To do';
    const statusActions = multiDay
        ? (fullyCompleted
            ? (selectedTodoDate === todo.completedOn
                ? '<button type="button" class="todo-action-button" data-action="reopen-task">Undo completion</button>'
                : '')
            : `<button type="button" class="todo-action-button todo-done-button" data-action="toggle-day-done">
                   ${dayDone ? 'Undo done' : '✓ Done'}
               </button>
               <button type="button" class="todo-action-button todo-done-button" data-action="complete-task">✓ Completely finished</button>
               ${selectedTodoDate === getTodoEndDate(todo)
                    ? (duration < 30
                        ? '<button type="button" class="todo-action-button" data-action="extend-day">＋ Extend one day</button>'
                        : '<span class="todo-muted">Beyond 30 days not allowed</span>')
                    : ''}`)
        : `${status === 'completed'
            ? '<button type="button" class="todo-action-button" data-action="reopen">Undo done</button>'
            : `<button type="button" class="todo-action-button todo-done-button" data-action="complete">✓ Done</button>
               ${status === 'open'
                    ? '<button type="button" class="todo-action-button todo-half-button" data-action="half-done">Half done</button>'
                    : ''}`}
           ${status === 'open' && selectedTodoDate === getTodoEndDate(todo)
                ? (duration < 30
                    ? '<button type="button" class="todo-action-button" data-action="extend-day">＋ Extend one day</button>'
                    : '<span class="todo-muted">Beyond 30 days not allowed</span>')
                : ''}`;
    return `
        <article class="todo-card todo-status-${status}" data-todo-id="${escapeHtml(todo.todoId)}">
            <div class="todo-card-main">
                <button type="button" class="todo-task-summary" data-action="expand"
                        aria-expanded="false">
                    <span class="todo-status-dot" aria-hidden="true"></span>
                    <span class="todo-task-title">${escapeHtml(todo.title)}</span>
                    <span class="todo-status-label">${statusLabel}</span>
                </button>
                <div class="todo-details" hidden>
                    ${multiDay ? `<p class="todo-muted">Scheduled ${formatTodoDate(todo.date)} – ${formatTodoDate(getTodoEndDate(todo))}</p>` : ''}
                    <div class="todo-card-actions">
                        ${statusActions}
                        <button type="button" class="todo-action-button todo-delete-button" data-action="delete">Remove</button>
                    </div>
                    <p class="todo-checkpoint-heading">Checkpoints <span>${subtasks.length}/5</span></p>
                    ${subtasks.length
                        ? `<ul class="todo-subtask-list">${subtasks.map(subtask => `
                            <li class="${subtask.completed ? 'subtask-completed' : ''}">
                                <button type="button" data-action="toggle-subtask"
                                        data-subtask-id="${escapeHtml(subtask.id)}"
                                        aria-pressed="${Boolean(subtask.completed)}"
                                        aria-label="${subtask.completed ? 'Uncheck' : 'Complete'} ${escapeHtml(subtask.text)}">
                                    <span class="todo-checkmark">${subtask.completed ? '✓' : ''}</span>
                                    <span>${escapeHtml(subtask.text)}</span>
                                </button>
                                <button type="button" class="todo-subtask-remove" data-action="remove-subtask"
                                        data-subtask-id="${escapeHtml(subtask.id)}" aria-label="Remove checkpoint">×</button>
                            </li>
                        `).join('')}</ul>`
                        : '<p class="todo-muted">No checkpoints yet. Add them only if they help.</p>'}
                    ${subtasks.length < 5 ? `
                        <form class="todo-subtask-form">
                            <label class="sr-only" for="subtask-${escapeHtml(todo.todoId)}">Add a checkpoint</label>
                            <input id="subtask-${escapeHtml(todo.todoId)}" name="subtask"
                                   maxlength="160" placeholder="Add a checkpoint" required>
                            <button type="submit" class="btn btn-small">Add</button>
                        </form>
                    ` : ''}
                </div>
            </div>
        </article>
    `;
}

function renderTodoCalendar() {
    const [year, monthNumber] = todoCalendarMonth.split('-').map(Number);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const todosByDate = new Map();
    todosForCalendar.forEach(todo => {
        todoDatesForCalendar(todo, todoCalendarMonth).forEach(date => {
            todosByDate.set(date, (todosByDate.get(date) || []).concat(todo));
        });
    });

    const cells = [];
    for (let blank = 0; blank < offset; blank += 1) {
        cells.push('<div class="todo-calendar-day todo-calendar-empty" role="presentation"></div>');
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTodos = todosByDate.get(date) || [];
        const complete = dayTodos.filter(todo => isTodoDoneOnDate(todo, date)).length;
        const classes = [
            'todo-calendar-day',
            date === selectedTodoDate ? 'selected' : '',
            dayTodos.length && complete === dayTodos.length ? 'all-done' : '',
            dayTodos.length && complete < dayTodos.length ? 'has-open-tasks' : ''
        ].filter(Boolean).join(' ');
        cells.push(`
            <button type="button" class="${classes}" data-calendar-date="${date}"
                    aria-label="${date}, ${dayTodos.length} tasks, ${complete} completed"
                    aria-pressed="${date === selectedTodoDate}">
                <span>${day}</span>
                ${dayTodos.length ? `<small>${complete}/${dayTodos.length}</small>` : ''}
            </button>
        `);
    }
    document.getElementById('todoCalendar').innerHTML = cells.join('');
}

function todoDatesForCalendar(todo, month) {
    const startDate = todo.date;
    const endDate = getTodoEndDate(todo);
    const monthStart = `${month}-01`;
    const [year, monthNumber] = month.split('-').map(Number);
    const monthEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`;
    if (startDate > monthEnd || endDate < monthStart) return [];
    const firstDate = startDate < monthStart ? monthStart : startDate;
    const lastDate = endDate > monthEnd ? monthEnd : endDate;
    const dates = [];
    for (let date = firstDate; date <= lastDate; date = addDaysToDate(date, 1)) {
        dates.push(date);
    }
    return dates;
}

function getTodoDuration(todo) {
    const duration = Number(todo.durationDays || 1);
    return Number.isInteger(duration) && duration >= 1 && duration <= 30 ? duration : 1;
}

function getTodoEndDate(todo) {
    return addDaysToDate(todo.date, getTodoDuration(todo) - 1);
}

function getTodoDayNumber(todo, date) {
    const [startYear, startMonth, startDay] = todo.date.split('-').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    return (Date.UTC(year, month - 1, day) -
        Date.UTC(startYear, startMonth - 1, startDay)) / 86400000 + 1;
}

function isTodoScheduledOnDate(todo, date) {
    return todo.date <= date && getTodoEndDate(todo) >= date;
}

function isTodoDoneOnDate(todo, date) {
    if (getTodoDuration(todo) === 1) return todo.status === 'completed';
    return todo.status === 'completed' || Boolean(todo.dailyStatuses?.[date]);
}

function renderRepeatTodoCalendar(days) {
    const [year, monthNumber] = repeatTodoCalendarMonth.split('-').map(Number);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const cells = [];
    for (let blank = 0; blank < offset; blank += 1) {
        cells.push('<div class="todo-calendar-day todo-calendar-empty" role="presentation"></div>');
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = days[date] || { total: 0, completed: 0 };
        const classes = [
            'todo-calendar-day',
            date === repeatTodoDate ? 'selected' : '',
            dayData.total && dayData.total === dayData.completed ? 'all-done' : '',
            dayData.total && dayData.completed < dayData.total ? 'has-open-tasks' : ''
        ].filter(Boolean).join(' ');
        cells.push(`
            <button type="button" class="${classes}" data-repeat-calendar-date="${date}"
                    aria-label="${date}, ${dayData.total} repeat tasks, ${dayData.completed} completed"
                    aria-pressed="${date === repeatTodoDate}">
                <span>${day}</span>
                ${dayData.total ? `<small>${dayData.completed}/${dayData.total}</small>` : ''}
            </button>
        `);
    }
    document.getElementById('repeatTodoCalendar').innerHTML = cells.join('');
}

function handleRepeatTodoCalendarClick(event) {
    const dayButton = event.target.closest('[data-repeat-calendar-date]');
    if (!dayButton) return;
    repeatTodoDate = dayButton.dataset.repeatCalendarDate;
    document.getElementById('repeatTodoDate').value = repeatTodoDate;
    loadRepeatTodosPage();
}

function changeRepeatTodoCalendarMonth(offset) {
    const [year, month] = repeatTodoCalendarMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    repeatTodoCalendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    repeatTodoDate = `${repeatTodoCalendarMonth}-01`;
    document.getElementById('repeatTodoDate').value = repeatTodoDate;
    loadRepeatTodosPage();
}

async function handleAddTodo(event) {
    event.preventDefault();
    const titleInput = document.getElementById('todoTitle');
    const result = await addTodo({
        title: titleInput.value,
        owner: document.getElementById('todoOwner').value,
        date: selectedTodoDate,
        durationDays: Number(document.getElementById('todoDurationDays').value)
    });
    if (!result) return;
    titleInput.value = '';
    document.getElementById('todoDurationDays').value = '1';
    await loadTodoPage();
    showTodoMessage('Added to your todo calendar. You’ve got this!');
    titleInput.focus();
}

async function openRepeatTodosPage() {
    repeatTodoDate = getLocalDateString(new Date());
    repeatTodoCalendarMonth = repeatTodoDate.slice(0, 7);
    document.getElementById('repeatTodoDate').value = repeatTodoDate;
    document.getElementById('todoOverviewPage').hidden = true;
    document.getElementById('repeatTodosPage').hidden = false;
    await loadRepeatTodosPage();
}

function closeRepeatTodosPage() {
    document.getElementById('repeatTodosPage').hidden = true;
    document.getElementById('todoOverviewPage').hidden = false;
    loadTodoPage();
}

async function loadRepeatTodosPage() {
    document.getElementById('repeatTodosDate').textContent =
        `Repeat schedule and completion for ${formatTodoDate(repeatTodoDate)}`;
    document.getElementById('repeatTodoDate').value = repeatTodoDate;
    document.getElementById('repeatTodoCalendarMonthLabel').textContent =
        formatMonthDisplay(repeatTodoCalendarMonth);
    const [data, calendarData] = await Promise.all([
        getRepeatTodos(repeatTodoDate),
        getRepeatTodosForMonth(repeatTodoCalendarMonth)
    ]);
    if (!data || !Array.isArray(data.repeatTodos)) return;
    repeatTodosForToday = data.repeatTodos;
    renderRepeatTodos();
    if (calendarData?.days) renderRepeatTodoCalendar(calendarData.days);
    const reward = await getTodoReward(getLocalDateString(new Date()).slice(0, 7));
    if (reward) renderTodoReward(reward);
}

function renderRepeatTodos() {
    const ownerLists = {
        wifey: document.getElementById('repeatWifeyTasks'),
        hubby: document.getElementById('repeatHubbyTasks')
    };
    for (const [owner, container] of Object.entries(ownerLists)) {
        const ownerTasks = repeatTodosForToday.filter(task => task.owner === owner);
        ownerTasks.sort((first, second) =>
            Number(second.scheduledToday) - Number(first.scheduledToday)
        );
        const todayTasks = ownerTasks.filter(task => task.scheduledToday);
        const otherTasks = ownerTasks.filter(task => !task.scheduledToday);
        container.innerHTML = ownerTasks.length
            ? `
                <section class="repeat-task-group" aria-label="Tasks due on selected date">
                    <h4>Due ${escapeHtml(formatTodoDate(repeatTodoDate))}</h4>
                    ${todayTasks.length
                        ? todayTasks.map(createRepeatTodoCard).join('')
                        : '<p class="todo-muted">No tasks due on this date.</p>'}
                </section>
                ${otherTasks.length ? `
                    <section class="repeat-task-group repeat-task-group-other" aria-label="Other repeat tasks">
                        <h4>Other schedule days</h4>
                        ${otherTasks.map(createRepeatTodoCard).join('')}
                    </section>
                ` : ''}
            `
            : '<p class="todo-empty">No repeat tasks yet. Add one whenever you like.</p>';
        const countLabel = document.getElementById(
            owner === 'wifey' ? 'repeatWifeyTitle' : 'repeatHubbyTitle'
        );
        const person = owner === 'wifey' ? 'Wifey ♡' : 'Hubby ♥';
        countLabel.textContent =
            `${person} — repeat tasks for ${formatTodoDate(repeatTodoDate)} (${todayTasks.filter(task => task.status === 'completed').length}/${todayTasks.length} done)`;
    }
}

function createRepeatTodoCard(task) {
    const daysLabel = formatRepeatDays(task.days);
    const statusLabel = task.scheduledToday
        ? (task.status === 'completed' ? 'Done' : 'To do')
        : daysLabel;
    return `
        <article class="repeat-task-card ${task.status === 'completed' ? 'repeat-task-completed' : ''}"
                 data-repeat-task-id="${escapeHtml(task.repeatTaskId)}">
            <button type="button" class="todo-task-summary repeat-task-summary"
                    data-repeat-action="expand" aria-expanded="false">
                <span class="todo-status-dot" aria-hidden="true"></span>
                <span class="todo-task-title">${escapeHtml(task.title)}</span>
                <span class="todo-status-label">${escapeHtml(statusLabel)}</span>
            </button>
            <div class="repeat-task-details" hidden>
                <p class="todo-muted">Repeats: ${escapeHtml(daysLabel)}</p>
                <div class="todo-card-actions">
                    ${task.scheduledToday ? `
                        <button type="button" class="todo-action-button ${task.status === 'completed' ? '' : 'todo-done-button'}"
                                data-repeat-action="toggle-status">
                            ${task.status === 'completed' ? 'Undo done' : '✓ Done'}
                        </button>
                    ` : ''}
                    <button type="button" class="todo-action-button" data-repeat-action="edit">Edit</button>
                    <button type="button" class="todo-action-button todo-delete-button" data-repeat-action="delete">Remove</button>
                </div>
            </div>
        </article>
    `;
}

function formatRepeatDays(days) {
    const labels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
    return days.map(day => labels[day]).join(', ');
}

function openRepeatTodoModal(owner, task = null) {
    const form = document.getElementById('repeatTodoForm');
    form.reset();
    document.getElementById('repeatTaskId').value = task?.repeatTaskId || '';
    document.getElementById('repeatTaskOwner').value = owner;
    document.getElementById('repeatTaskTitle').value = task?.title || '';
    document.getElementById('repeatTodoModalTitle').textContent =
        task ? 'Edit repeat task' : `Add ${owner === 'wifey' ? 'Wifey’s' : 'Hubby’s'} repeat task`;
    const selectedDays = task?.days || [repeatDayForDate(repeatTodoDate)];
    form.querySelectorAll('input[name="repeatDay"]').forEach(input => {
        input.checked = selectedDays.includes(input.value);
    });
    document.getElementById('repeatTodoModal').classList.add('active');
    document.getElementById('repeatTaskTitle').focus();
}

async function handleRepeatTodoSubmit(event) {
    event.preventDefault();
    const days = Array.from(
        document.querySelectorAll('#repeatTodoForm input[name="repeatDay"]:checked'),
        input => input.value
    );
    if (!days.length) {
        alert('Select at least one day for this repeat task.');
        return;
    }
    const repeatTaskId = document.getElementById('repeatTaskId').value;
    const taskData = {
        title: document.getElementById('repeatTaskTitle').value,
        owner: document.getElementById('repeatTaskOwner').value,
        days,
        date: repeatTodoDate
    };
    const result = repeatTaskId
        ? await updateRepeatTodo({ ...taskData, repeatTaskId })
        : await addRepeatTodo(taskData);
    if (!result) return;
    closeRepeatTodoModal();
    await loadRepeatTodosPage();
}

function closeRepeatTodoModal() {
    document.getElementById('repeatTodoModal').classList.remove('active');
}

async function handleRepeatTodoPageClick(event) {
    const toggleOwner = event.target.closest('[data-repeat-toggle]');
    if (toggleOwner) {
        const content = document.getElementById(
            toggleOwner.dataset.repeatToggle === 'wifey' ? 'repeatWifeyContent' : 'repeatHubbyContent'
        );
        content.hidden = !content.hidden;
        toggleOwner.setAttribute('aria-expanded', String(!content.hidden));
        return;
    }

    const addButton = event.target.closest('[data-repeat-owner]');
    if (addButton) {
        openRepeatTodoModal(addButton.dataset.repeatOwner);
        return;
    }

    const actionButton = event.target.closest('[data-repeat-action]');
    if (!actionButton) return;
    const card = actionButton.closest('[data-repeat-task-id]');
    const task = repeatTodosForToday.find(item => item.repeatTaskId === card?.dataset.repeatTaskId);
    if (!task) return;

    const action = actionButton.dataset.repeatAction;
    if (action === 'expand') {
        const details = card.querySelector('.repeat-task-details');
        details.hidden = !details.hidden;
        card.classList.toggle('todo-card-expanded', !details.hidden);
        actionButton.setAttribute('aria-expanded', String(!details.hidden));
        return;
    }
    if (action === 'edit') {
        openRepeatTodoModal(task.owner, task);
        return;
    }
    if (action === 'delete') {
        if (!confirm(`Remove "${task.title}" from today and future days?`)) return;
        const result = await deleteRepeatTodo({
            repeatTaskId: task.repeatTaskId,
            date: repeatTodoDate
        });
        if (result) await loadRepeatTodosPage();
        return;
    }
    if (action === 'toggle-status') {
        const result = await updateRepeatTodoStatus({
            repeatTaskId: task.repeatTaskId,
            date: repeatTodoDate,
            completed: task.status !== 'completed'
        });
        if (result) await loadRepeatTodosPage();
    }
}

async function handleTodoAction(event) {
    const repeatLink = event.target.closest('[data-open-repeat]');
    if (repeatLink) {
        await openRepeatTodosPage();
        return;
    }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const card = button.closest('[data-todo-id]');
    if (!card) return;
    const todo = selectedDateTodos.find(item => item.todoId === card.dataset.todoId);
    if (!todo) return;

    const action = button.dataset.action;
    if (action === 'expand') {
        const details = card.querySelector('.todo-details');
        details.hidden = !details.hidden;
        card.classList.toggle('todo-card-expanded', !details.hidden);
        button.setAttribute('aria-expanded', String(!details.hidden));
        return;
    }
    if (action === 'half-done') {
        openHalfDoneModal(todo);
        return;
    }
    if (action === 'delete') {
        if (!confirm(`Remove "${todo.title}" from this day?`)) return;
        const result = await deleteTodo({
            todoId: todo.todoId,
            date: todo.date,
            owner: todo.owner
        });
        if (result) await loadTodoPage();
        return;
    }
    if (action === 'toggle-day-done') {
        const result = await updateTodo({
            todoId: todo.todoId,
            date: todo.date,
            dayDate: selectedTodoDate,
            dayDone: !todo.dailyStatuses?.[selectedTodoDate]
        });
        if (result) await loadTodoPage();
        return;
    }
    if (action === 'complete-task' || action === 'reopen-task') {
        const result = await updateTodo({
            todoId: todo.todoId,
            date: todo.date,
            completionDate: selectedTodoDate,
            status: action === 'complete-task' ? 'completed' : 'open'
        });
        if (result) await loadTodoPage();
        return;
    }
    if (action === 'extend-day') {
        const result = await updateTodo({
            todoId: todo.todoId,
            date: todo.date,
            extendByDays: 1
        });
        if (result) {
            selectedTodoDate = addDaysToDate(todo.date, getTodoDuration(todo));
            todoCalendarMonth = selectedTodoDate.slice(0, 7);
            await loadTodoPage();
        }
        return;
    }
    if (action === 'toggle-subtask' || action === 'remove-subtask') {
        const subtasks = (todo.subtasks || []).map(subtask => ({ ...subtask }));
        const index = subtasks.findIndex(item => item.id === button.dataset.subtaskId);
        if (index < 0) return;
        if (action === 'toggle-subtask') {
            subtasks[index].completed = !subtasks[index].completed;
        } else {
            subtasks.splice(index, 1);
        }
        const result = await updateTodo({ todoId: todo.todoId, date: todo.date, subtasks });
        if (result) await loadTodoPage();
        return;
    }

    const status = action === 'complete' ? 'completed' : action === 'reopen' ? 'open' : null;
    if (status) {
        const result = await updateTodo({ todoId: todo.todoId, date: todo.date, status });
        if (result) await loadTodoPage();
    }
}

function repeatDayForDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][
        new Date(year, month - 1, day).getDay()
    ];
}

async function handleTodoSubtaskSubmit(event) {
    if (!event.target.matches('.todo-subtask-form')) return;
    event.preventDefault();
    const card = event.target.closest('[data-todo-id]');
    const todo = selectedDateTodos.find(item => item.todoId === card?.dataset.todoId);
    const input = event.target.elements.subtask;
    const text = input.value.trim();
    if (!todo || !text) return;
    const subtasks = [...(todo.subtasks || []), {
        id: crypto.randomUUID(),
        text,
        completed: false
    }];
    const result = await updateTodo({ todoId: todo.todoId, date: todo.date, subtasks });
    if (result) await loadTodoPage();
}

function openHalfDoneModal(todo) {
    pendingHalfDoneTodo = todo;
    document.getElementById('continuationTitle').value = todo.title;
    document.getElementById('continuationDate').value = addDaysToDate(todo.date, 1);
    document.getElementById('halfDoneModal').classList.add('active');
    document.getElementById('continuationTitle').focus();
}

async function handleSaveHalfDone(event) {
    event.preventDefault();
    if (!pendingHalfDoneTodo) return;
    const continuationDate = document.getElementById('continuationDate').value;
    const result = await markTodoHalfDone({
        todoId: pendingHalfDoneTodo.todoId,
        date: pendingHalfDoneTodo.date,
        continuationDate,
        continuationTitle: document.getElementById('continuationTitle').value
    });
    if (result) {
        selectedTodoDate = continuationDate;
        todoCalendarMonth = continuationDate.slice(0, 7);
        closeHalfDoneModal();
        await loadTodoPage();
        showTodoMessage('Progress saved. The remaining task is on the date you chose.');
    }
}

function closeHalfDoneModal() {
    document.getElementById('halfDoneModal').classList.remove('active');
    pendingHalfDoneTodo = null;
}

function handleTodoCalendarClick(event) {
    const dayButton = event.target.closest('[data-calendar-date]');
    if (!dayButton) return;
    selectedTodoDate = dayButton.dataset.calendarDate;
    document.getElementById('todoDate').value = selectedTodoDate;
    loadTodoPage();
}

function changeTodoCalendarMonth(offset) {
    const [year, month] = todoCalendarMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    todoCalendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    selectedTodoDate = `${todoCalendarMonth}-01`;
    document.getElementById('todoDate').value = selectedTodoDate;
    loadTodoPage();
}

function showTodoMessage(message) {
    const element = document.getElementById('todoMessage');
    element.textContent = message;
    element.hidden = false;
}

function updateTodoAddLimit() {
    const owner = document.getElementById('todoOwner').value;
    const count = selectedDateTodos.filter(todo => todo.owner === owner).length;
    const button = document.querySelector('#todoForm button[type="submit"]');
    const isFull = count >= 6;
    button.disabled = isFull;
    button.textContent = isFull ? 'Daily limit reached' : 'Add task';
}

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDaysToDate(dateString, days) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day + days);
    return getLocalDateString(date);
}

function formatTodoDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatShortMonth(monthString) {
    const [year, month] = monthString.split('-').map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
    return `${label}-${String(year).slice(-2)}`;
}

function formatHeaderMonth(monthString) {
    return formatShortMonth(monthString);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function changeDashboardMonth(offset) {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    currentMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('currentMonth').textContent = formatHeaderMonth(currentMonth);
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

    const expenseCategories = categories.filter(c =>
        c.type === 'expense' && !c.parentCategoryId && !c.businessId
    );
    if (expenseCategories.length === 0) {
        container.innerHTML = '<p class="empty-state">No expenses recorded yet</p>';
        return;
    }

    expenseCategories.forEach(cat => {
        const children = categories.filter(
            child => child.parentCategoryId === cat.categoryId && !child.businessId
        );
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
    if (businessTransactionContext) {
        transactionData.businessId = businessTransactionContext.businessId;
    }

    const result = await addTransaction(transactionData);

    if (result) {
        alert('Transaction added successfully!');
        const transactionContext = businessTransactionContext;
        const returnToBusiness = Boolean(transactionContext?.returnAfterSave);
        const returnTab = businessTransactionContext?.returnTab || 'categories';
        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        if (returnToBusiness) {
            clearBusinessTransactionContext();
            document.querySelector(`.tab-btn[data-tab="${returnTab}"]`).click();
            return;
        }
        if (transactionContext?.businessId) {
            document.querySelector(`input[name="type"][value="${transactionContext.type}"]`).checked = true;
            document.getElementById('transactionLedger').value =
                `business:${transactionContext.businessId}`;
        } else {
            document.getElementById('transactionLedger').value = 'personal';
        }
        populateCategoryDropdown(
            document.querySelector('input[name="type"]:checked').value,
            transactionContext?.businessId || null
        );
        updateTransactionSubcategories();

        // Reload dashboard
        await loadDashboard();
    }
}

// ================ TRANSACTIONS LIST ================

async function loadTransactions() {
    const monthFilter = document.getElementById('monthFilter').value;
    const transactionsData = await getTransactions(monthFilter || null, null, true);

    const container = document.getElementById('transactionsList');

    if (!transactionsData || !transactionsData.transactions || transactionsData.transactions.length === 0) {
        container.innerHTML = '<div class="empty-state">No transactions found</div>';
        return;
    }

    container.innerHTML = transactionsData.transactions.map(txn => createTransactionCard(txn, true)).join('');
}

function createTransactionCard(txn, showActions = false, businessId = null) {
    const isIncome = txn.type === 'income';
    const sign = isIncome ? '+' : '-';
    const effectiveBusinessId = txn.businessId || businessId;
    const businessName = categories.find(category => category.categoryId === effectiveBusinessId)?.name;

    return `
        <div class="transaction-item ${txn.type}">
            <div class="transaction-info">
                <div class="transaction-header">
                    <span class="transaction-amount ${txn.type}">${sign}₹${formatNumber(txn.amount)}</span>
                    <span class="transaction-category">${txn.categoryName}</span>
                    ${businessName ? `<span class="transaction-business-badge">${escapeHtml(businessName)}</span>` : ''}
                </div>
                ${txn.description ? `<div class="transaction-description">${txn.description}</div>` : ''}
                <div class="transaction-date">${formatDate(txn.date)}</div>
            </div>
            ${showActions ? `
                <div class="transaction-actions">
                    <button onclick="editTransaction('${txn.transactionId}', '${txn.SK}', '${effectiveBusinessId || ''}')" class="btn btn-small">Edit</button>
                    <button onclick="confirmDeleteTransaction('${txn.transactionId}', '${effectiveBusinessId || ''}')" class="btn btn-small btn-danger">Delete</button>
                </div>
            ` : ''}
        </div>
    `;
}

async function editTransaction(transactionId, sk, businessId = '') {
    // Get transaction data
    editingTransactionBusinessId = businessId || null;
    const transactionsData = await getTransactions(null, editingTransactionBusinessId);
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
    const relevantCategories = categories.filter(c =>
        c.type === txn.type &&
        (editingTransactionBusinessId
            ? c.businessId === editingTransactionBusinessId
            : !c.businessId)
    );
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
        ...(editingTransactionBusinessId ? { businessId: editingTransactionBusinessId } : {}),
        date,
        description
    };

    const result = await updateTransaction(updateData);

    if (result) {
        alert('Transaction updated successfully!');
        const businessId = editingTransactionBusinessId;
        closeEditTransactionModal();
        if (businessId) {
            await loadCategoriesPage();
            await loadDashboard();
            if (document.querySelector('.tab-btn[data-tab="transactions"]').classList.contains('active')) {
                await loadTransactions();
            }
        } else {
            await loadTransactions();
            await loadDashboard();
        }
    }
}

async function confirmDeleteTransaction(transactionId, businessId = '') {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    const result = await deleteTransaction(transactionId);

    if (result) {
        alert('Transaction deleted successfully!');
        if (businessId) {
            await loadCategoriesPage();
            await loadDashboard();
            if (document.querySelector('.tab-btn[data-tab="transactions"]').classList.contains('active')) {
                await loadTransactions();
            }
        } else {
            await loadTransactions();
            await loadDashboard();
        }
    }
}

function closeEditTransactionModal() {
    document.getElementById('editTransactionModal').classList.remove('active');
    editingTransactionBusinessId = null;
}

// ================ CATEGORIES ================

async function loadCategories() {
    const data = await getCategories();
    if (data && data.categories) {
        categories = data.categories;
        populateTransactionLedgerDropdown();
        populateCategoryDropdown('expense', businessTransactionContext?.businessId || null);
    }
}

function populateTransactionLedgerDropdown() {
    const select = document.getElementById('transactionLedger');
    const selectedBusinessId = businessTransactionContext?.businessId || (
        select.value.startsWith('business:') ? select.value.slice('business:'.length) : null
    );
    const businesses = getBusinessCategories();
    select.innerHTML = `
        <option value="personal">Personal</option>
        ${businesses.map(business =>
            `<option value="business:${escapeHtml(business.categoryId)}">${escapeHtml(business.name)}</option>`
        ).join('')}
    `;
    select.value = businesses.some(business => business.categoryId === selectedBusinessId)
        ? `business:${selectedBusinessId}`
        : 'personal';
}

function handleTransactionLedgerChange() {
    const value = document.getElementById('transactionLedger').value;
    const businessId = value.startsWith('business:')
        ? value.slice('business:'.length)
        : null;
    businessTransactionContext = businessId
        ? {
            businessId,
            type: document.querySelector('input[name="type"]:checked').value,
            returnAfterSave: false
        }
        : null;
    const business = categories.find(category => category.categoryId === businessId);
    document.getElementById('businessTransactionLabel').textContent =
        business ? `${business.name} · Business ledger` : '';
    document.getElementById('businessTransactionContext').hidden = !business;
    populateCategoryDropdown(
        document.querySelector('input[name="type"]:checked').value,
        businessId
    );
    updateTransactionSubcategories();
}

function populateCategoryDropdown(type, businessId = null) {
    const select = document.getElementById('category');
    const relevantCategories = categories.filter(c =>
        c.type === type &&
        !c.parentCategoryId &&
        (businessId ? c.businessId === businessId : !c.businessId)
    );

    select.innerHTML = '<option value="">Select Category</option>' +
        relevantCategories.map(cat =>
            `<option value="${escapeHtml(cat.categoryId)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</option>`
        ).join('');
}

function updateTransactionSubcategories(selectedId = '') {
    const categoryId = document.getElementById('category').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const group = document.getElementById('subcategoryGroup');
    const select = document.getElementById('subcategory');
    const children = categories.filter(
        category =>
            category.type === type &&
            category.parentCategoryId === categoryId &&
            (businessTransactionContext
                ? category.businessId === businessTransactionContext.businessId
                : !category.businessId)
    );

    select.innerHTML = '<option value="">Use category directly</option>' +
        children.map(child =>
            `<option value="${escapeHtml(child.categoryId)}">${escapeHtml(child.icon)} ${escapeHtml(child.name)}</option>`
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
    const businessContainer = document.getElementById('businessCategories');

    const expenseCategories = categories.filter(c =>
        c.type === 'expense' && !c.parentCategoryId && !c.businessId
    );
    const incomeCategories = categories.filter(c =>
        c.type === 'income' && !c.parentCategoryId && !c.businessId
    );
    const businesses = getBusinessCategories();
    await loadBusinessTransactions();

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
    businessContainer.innerHTML = businesses.length
        ? businesses.map(createBusinessCard).join('')
        : '<p class="empty-state">No businesses yet. Add one using + Add Category.</p>';
    document.querySelector('.businesses-month-label').textContent =
        'All-time totals and transactions · business entries stay separate from personal totals';
}

function getBusinessCategories() {
    return categories.filter(category => category.type === 'business');
}

async function loadBusinessTransactions() {
    const businesses = getBusinessCategories();
    const transactionsByBusiness = await Promise.all(businesses.map(async business => {
        const data = await getTransactions(null, business.categoryId);
        return [business.categoryId, data?.transactions || []];
    }));
    businessTransactions = Object.fromEntries(transactionsByBusiness);
}

function renderBusinessDashboard() {
    document.getElementById('businessDashboardMonth').textContent =
        'All-time totals · separate from personal monthly figures';
    const businesses = getBusinessCategories();
    document.getElementById('businessDashboard').innerHTML = businesses.length
        ? businesses.map(business => createBusinessCard(business, 'dashboard')).join('')
        : '<p class="empty-state">No businesses yet. Add one from Categories.</p>';
}

function createBusinessCard(business, view = 'category') {
    const businessId = business.categoryId;
    const transactions = businessTransactions[businessId] || [];
    const incomeTotal = transactions
        .filter(txn => txn.type === 'income')
        .reduce((total, txn) => total + Number(txn.amount), 0);
    const expenseTotal = transactions
        .filter(txn => txn.type === 'expense')
        .reduce((total, txn) => total + Number(txn.amount), 0);
    const businessCategories = categories.filter(category => category.businessId === businessId);
    const incomeCategories = businessCategories.filter(category => category.type === 'income');
    const expenseCategories = businessCategories.filter(category => category.type === 'expense');
    const safeId = escapeHtml(businessId);
    const detailsId = `business-details-${view}-${safeId}`;

    return `
        <article class="business-card" data-business-id="${safeId}">
            <button type="button" class="business-summary" data-business-action="toggle"
                    aria-expanded="false" aria-controls="${detailsId}">
                <span class="business-summary-name">
                    <span class="category-icon">${escapeHtml(business.icon || '🏢')}</span>
                    <strong>${escapeHtml(business.name)}</strong>
                </span>
                <span class="business-summary-totals">
                    <span class="business-income-total" title="All-time income">↑ ${formatCurrency(incomeTotal)}</span>
                    <span class="business-expense-total" title="All-time expenses">↓ ${formatCurrency(expenseTotal)}</span>
                </span>
                <span aria-hidden="true" class="business-chevron">⌄</span>
            </button>
            <div class="business-details" id="${detailsId}" hidden>
                <div class="business-detail-actions">
                    <button type="button" class="btn btn-small"
                            onclick="editCategory('${safeId}')">Edit business</button>
                </div>
                <div class="business-category-grid">
                    <section class="business-category-group business-income-group">
                        <div class="business-category-heading">
                            <h4>Income categories</h4>
                            <div class="business-category-heading-actions">
                                <button type="button" class="btn btn-small"
                                        data-business-action="add-transaction" data-type="income">＋ Add income</button>
                                <button type="button" class="btn btn-small"
                                        data-business-action="add-category" data-type="income">＋ Category</button>
                            </div>
                        </div>
                        ${createBusinessCategoryList(incomeCategories, transactions)}
                    </section>
                    <section class="business-category-group business-expense-group">
                        <div class="business-category-heading">
                            <h4>Expense categories</h4>
                            <div class="business-category-heading-actions">
                                <button type="button" class="btn btn-small"
                                        data-business-action="add-transaction" data-type="expense">＋ Add expense</button>
                                <button type="button" class="btn btn-small"
                                        data-business-action="add-category" data-type="expense">＋ Category</button>
                            </div>
                        </div>
                        ${createBusinessCategoryList(expenseCategories, transactions)}
                    </section>
                </div>
                <section class="business-ledger">
                    <h4>All transactions</h4>
                    ${transactions.length
                        ? transactions.map(txn => createTransactionCard(txn, true, businessId)).join('')
                        : '<p class="empty-state">No business transactions yet.</p>'}
                </section>
            </div>
        </article>
    `;
}

function createBusinessCategoryList(businessCategories, transactions) {
    return businessCategories.length
        ? `<ul>${businessCategories.map(category => {
            const total = transactions
                .filter(txn => txn.categoryId === category.categoryId)
                .reduce((sum, txn) => sum + Number(txn.amount), 0);
            return `
                <li>
                    <span>${escapeHtml(category.icon)} ${escapeHtml(category.name)}</span>
                    <span>${formatCurrency(total)}</span>
                    <span class="business-category-actions">
                        <button type="button" class="btn btn-small"
                                onclick="editCategory('${escapeHtml(category.categoryId)}')">Edit</button>
                        <button type="button" class="btn btn-small btn-danger"
                                onclick="confirmDeleteCategory('${escapeHtml(category.categoryId)}')">Delete</button>
                    </span>
                </li>
            `;
        }).join('')}</ul>`
        : '<p class="todo-muted">No categories yet.</p>';
}

async function handleBusinessCategoryClick(event) {
    const actionButton = event.target.closest('[data-business-action]');
    if (!actionButton) return;
    const businessCard = actionButton.closest('[data-business-id]');
    const businessId = businessCard?.dataset.businessId;
    const business = categories.find(category => category.categoryId === businessId);
    if (!business) return;

    if (actionButton.dataset.businessAction === 'toggle') {
        const details = businessCard.querySelector('.business-details');
        details.hidden = !details.hidden;
        actionButton.setAttribute('aria-expanded', String(!details.hidden));
        businessCard.classList.toggle('business-card-expanded', !details.hidden);
        return;
    }

    if (actionButton.dataset.businessAction === 'add-transaction') {
        startBusinessTransaction(business, actionButton.dataset.type);
        return;
    }

    if (actionButton.dataset.businessAction === 'add-category') {
        showAddCategoryModal(actionButton.dataset.type, businessId);
    }
}

function startBusinessTransaction(business, type) {
    businessTransactionContext = {
        businessId: business.categoryId,
        type,
        returnAfterSave: true,
        returnTab: document.querySelector('.tab-btn[data-tab="dashboard"]').classList.contains('active')
            ? 'dashboard'
            : 'categories'
    };
    document.getElementById('transactionLedger').value = `business:${business.categoryId}`;
    document.querySelector(`input[name="type"][value="${type}"]`).checked = true;
    populateCategoryDropdown(type, business.categoryId);
    updateTransactionSubcategories();
    document.getElementById('businessTransactionLabel').textContent =
        `${business.name} · Add ${type}`;
    document.getElementById('businessTransactionContext').hidden = false;
    document.getElementById('date').valueAsDate = new Date();
    document.querySelector('.tab-btn[data-tab="add-transaction"]').click();
    if (document.getElementById('category').options.length <= 1) {
        alert(`Add a ${type} category for ${business.name} before recording a transaction.`);
    }
}

function clearBusinessTransactionContext() {
    businessTransactionContext = null;
    document.getElementById('transactionLedger').value = 'personal';
    document.getElementById('businessTransactionContext').hidden = true;
    document.getElementById('businessTransactionLabel').textContent = '';
    document.querySelector('input[name="type"][value="expense"]').checked = true;
    populateCategoryDropdown('expense');
    updateTransactionSubcategories();
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

function showAddCategoryModal(type = 'expense', businessId = '') {
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('editCategoryId').value = '';
    document.getElementById('categoryType').value = type;
    document.getElementById('categoryIcon').value = '💰';
    document.getElementById('categoryColor').value = '#4CAF50';
    document.getElementById('budgetPeriod').value = 'monthly';
    populateBusinessCategoryDropdown();
    document.getElementById('categoryBusiness').value = businessId;
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
    populateBusinessCategoryDropdown();
    document.getElementById('categoryBusiness').value = cat.businessId || '';
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
        !category.businessId &&
        !category.parentCategoryId &&
        category.categoryId !== categoryId
    );
    select.innerHTML = '<option value="">No parent (top-level category)</option>' +
        parents.map(parent =>
            `<option value="${parent.categoryId}">${parent.icon} ${parent.name}</option>`
        ).join('');
}

function updateCategoryFormFields() {
    const categoryType = document.getElementById('categoryType').value;
    const businessId = document.getElementById('categoryBusiness').value;
    const isExpense = categoryType === 'expense';
    const isBusinessCategory = categoryType === 'business';
    const isSubcategory = isExpense && !businessId &&
        Boolean(document.getElementById('parentCategory').value);
    document.getElementById('categoryBusinessGroup').hidden = isBusinessCategory;
    document.getElementById('categoryBusiness').disabled = isBusinessCategory;
    document.getElementById('categoryBusiness').required = false;
    document.getElementById('parentCategoryGroup').hidden = !isExpense;
    document.getElementById('parentCategoryGroup').hidden = !isExpense || Boolean(businessId);
    document.getElementById('categoryMonthlyLimitGroup').hidden =
        !isExpense || isSubcategory || Boolean(businessId);
    document.getElementById('subcategoryBudgetGroup').hidden = !isSubcategory;
    document.getElementById('budgetAmount').required = isSubcategory;
}

function populateBusinessCategoryDropdown() {
    const select = document.getElementById('categoryBusiness');
    const selected = select.value;
    const businesses = categories.filter(category => category.type === 'business');
    select.innerHTML = '<option value="">Personal category</option>' +
        businesses.map(business =>
            `<option value="${escapeHtml(business.categoryId)}">${escapeHtml(business.icon)} ${escapeHtml(business.name)}</option>`
        ).join('');
    if (businesses.some(business => business.categoryId === selected)) {
        select.value = selected;
    }
}

async function handleSaveCategory() {
    const categoryId = document.getElementById('editCategoryId').value;
    const name = document.getElementById('categoryName').value;
    const type = document.getElementById('categoryType').value;
    const businessId = type === 'business' ? '' : document.getElementById('categoryBusiness').value;
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
        parentCategoryId: parentCategoryId || null,
        businessId: businessId || null
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
    const halfDoneModal = document.getElementById('halfDoneModal');
    const repeatTodoModal = document.getElementById('repeatTodoModal');

    if (event.target === categoryModal) {
        closeCategoryModal();
    }
    if (event.target === editModal) {
        closeEditTransactionModal();
    }
    if (event.target === halfDoneModal) {
        closeHalfDoneModal();
    }
    if (event.target === repeatTodoModal) {
        closeRepeatTodoModal();
    }
};

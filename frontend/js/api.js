// API Helper Functions

async function apiRequest(endpoint, method = 'GET', body = null) {
    if (!isApiConfigured()) {
        console.error('API not configured yet');
        alert('Please configure your API endpoint in config.js');
        return null;
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthorizationToken()}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(getApiUrl(endpoint), options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Request failed (${response.status})`);
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert('Error communicating with server: ' + error.message);
        return null;
    }
}

// Categories API
async function getCategories() {
    return await apiRequest(API_CONFIG.endpoints.categories);
}

async function addCategory(categoryData) {
    return await apiRequest(API_CONFIG.endpoints.categories, 'POST', categoryData);
}

async function updateCategory(categoryData) {
    return await apiRequest(API_CONFIG.endpoints.categories, 'PUT', categoryData);
}

async function deleteCategory(categoryId) {
    return await apiRequest(API_CONFIG.endpoints.categories, 'DELETE', { categoryId });
}

// Transactions API
async function getTransactions(month = null) {
    let endpoint = API_CONFIG.endpoints.transactions;
    if (month) {
        endpoint += `?month=${month}`;
    }
    return await apiRequest(endpoint);
}

async function addTransaction(transactionData) {
    return await apiRequest(API_CONFIG.endpoints.transactions, 'POST', transactionData);
}

async function updateTransaction(transactionData) {
    return await apiRequest(API_CONFIG.endpoints.transactions, 'PUT', transactionData);
}

async function deleteTransaction(transactionId) {
    return await apiRequest(API_CONFIG.endpoints.transactions, 'DELETE', { transactionId });
}

// Summary API
async function getMonthlySummary(month = null) {
    let endpoint = API_CONFIG.endpoints.summary;
    if (month) {
        endpoint += `?month=${month}`;
    }
    return await apiRequest(endpoint);
}

// Initialize default data
async function initializeDefaultData() {
    return await apiRequest(API_CONFIG.endpoints.initialize, 'POST');
}

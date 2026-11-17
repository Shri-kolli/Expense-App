// API Configuration
const API_CONFIG = {
    baseUrl: window.location.origin,
    endpoints: {
        categories: '/api/categories',
        transactions: '/api/transactions',
        summary: '/api/summary',
        initialize: '/api/initialize'
    }
};

function isApiConfigured() {
    return Boolean(API_CONFIG.baseUrl);
}

function getApiUrl(endpoint) {
    return API_CONFIG.baseUrl + endpoint;
}

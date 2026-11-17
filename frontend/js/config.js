// API Configuration
const API_CONFIG = {
    baseUrl: 'https://xi07bgreg7.execute-api.ap-south-1.amazonaws.com',
    endpoints: {
        categories: '/categories',
        transactions: '/transactions',
        summary: '/summary',
        initialize: '/initialize'
    }
};

function isApiConfigured() {
    return API_CONFIG.baseUrl !== 'YOUR_API_GATEWAY_URL_HERE';
}

function getApiUrl(endpoint) {
    return API_CONFIG.baseUrl + endpoint;
}

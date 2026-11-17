const ACCESS_TOKEN_KEY = 'expenseTrackerAccessToken';
const REFRESH_TOKEN_KEY = 'expenseTrackerRefreshToken';
const TOKEN_EXPIRY_KEY = 'expenseTrackerTokenExpiry';

function authRedirectUri() {
    return `${window.location.origin}/`;
}

function authEndpoint(path) {
    return `${AUTH_CONFIG.hostedUiDomain}/oauth2/${path}`;
}

function base64UrlEncode(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createPkcePair() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const verifier = base64UrlEncode(randomBytes);
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(verifier)
    );
    return { verifier, challenge: base64UrlEncode(new Uint8Array(digest)) };
}

function randomState() {
    return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

function clearAuthSession() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

function showSignIn(errorMessage = '') {
    document.getElementById('appContainer').hidden = true;
    document.getElementById('authScreen').hidden = false;
    const error = document.getElementById('authError');
    error.textContent = errorMessage;
    error.hidden = !errorMessage;
}

async function exchangeAuthorizationCode(code, state) {
    const expectedState = sessionStorage.getItem('expenseTrackerOAuthState');
    const verifier = sessionStorage.getItem('expenseTrackerPkceVerifier');
    sessionStorage.removeItem('expenseTrackerOAuthState');
    sessionStorage.removeItem('expenseTrackerPkceVerifier');

    if (!expectedState || state !== expectedState || !verifier) {
        throw new Error('Sign-in verification failed. Please try again.');
    }

    const response = await fetch(authEndpoint('token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: AUTH_CONFIG.clientId,
            code,
            redirect_uri: authRedirectUri(),
            code_verifier: verifier
        })
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token) {
        throw new Error(tokens.error_description || 'Could not complete sign-in.');
    }

    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    sessionStorage.setItem(
        TOKEN_EXPIRY_KEY,
        String(Date.now() + Number(tokens.expires_in || 3600) * 1000)
    );
}

async function refreshAccessToken() {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    const response = await fetch(authEndpoint('token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: AUTH_CONFIG.clientId,
            refresh_token: refreshToken
        })
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token) {
        clearAuthSession();
        return null;
    }

    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    sessionStorage.setItem(
        TOKEN_EXPIRY_KEY,
        String(Date.now() + Number(tokens.expires_in || 3600) * 1000)
    );
    return tokens.access_token;
}

async function initializeAuthentication() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    try {
        if (params.has('error')) {
            throw new Error(params.get('error_description') || 'Sign-in was not completed.');
        }
        if (code) {
            await exchangeAuthorizationCode(code, params.get('state'));
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
        if (!token || expiry < Date.now() + 60000) {
            token = await refreshAccessToken();
        }
        if (!token) {
            showSignIn();
            return false;
        }

        document.getElementById('authScreen').hidden = true;
        document.getElementById('appContainer').hidden = false;
        return true;
    } catch (error) {
        clearAuthSession();
        showSignIn(error.message);
        return false;
    }
}

async function getAuthorizationToken() {
    const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
    let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || expiry < Date.now() + 60000) {
        token = await refreshAccessToken();
    }
    if (!token) {
        showSignIn('Your session expired. Sign in again to continue.');
        throw new Error('Sign-in required');
    }
    return token;
}

async function signIn() {
    const { verifier, challenge } = await createPkcePair();
    const state = randomState();
    sessionStorage.setItem('expenseTrackerPkceVerifier', verifier);
    sessionStorage.setItem('expenseTrackerOAuthState', state);

    const url = new URL(authEndpoint('authorize'));
    url.search = new URLSearchParams({
        client_id: AUTH_CONFIG.clientId,
        response_type: 'code',
        scope: 'openid email',
        redirect_uri: authRedirectUri(),
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state
    });
    window.location.assign(url);
}

function signOut() {
    clearAuthSession();
    const url = new URL(authEndpoint('logout'));
    url.search = new URLSearchParams({
        client_id: AUTH_CONFIG.clientId,
        logout_uri: authRedirectUri()
    });
    window.location.assign(url);
}

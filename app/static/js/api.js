// ============================================
// API.JS — Auth Fetch Wrapper & API Helpers
// ============================================

import * as state from './state.js';

export function authHeaders(extra = {}) {
    const h = { ...extra };
    if (state.authToken) h['Authorization'] = `Bearer ${state.authToken}`;
    return h;
}

export async function authFetch(url, options = {}) {
    if (!options.headers) options.headers = {};
    if (state.authToken) options.headers['Authorization'] = `Bearer ${state.authToken}`;

    const res = await fetch(url, options);

    if (res.status === 401) {
        // Token expired — call doLogout via window (avoids circular import)
        if (window.doLogout) window.doLogout();
        throw new Error('Session expired');
    }

    return res;
}

// ============================================
// AUTH.JS — Authentication (Login, Register, Logout)
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';

export function switchAuthTab(tab) {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');
    document.getElementById('authError').classList.add('hidden');

    if (tab === 'login') {
        tabLogin.className = 'flex-1 py-3 text-sm font-bold text-orange-500 border-b-2 border-orange-500 transition-colors';
        tabRegister.className = 'flex-1 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent hover:text-gray-600 transition-colors';
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
    } else {
        tabRegister.className = 'flex-1 py-3 text-sm font-bold text-orange-500 border-b-2 border-orange-500 transition-colors';
        tabLogin.className = 'flex-1 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent hover:text-gray-600 transition-colors';
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
    }
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

export async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) return showAuthError('Complete all fields');

    const btn = document.getElementById('btnLogin');
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
        const res = await fetch(`${state.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            onAuthSuccess(data);
        } else {
            const err = await res.json();
            showAuthError(err.detail || 'Email or password incorrect');
        }
    } catch (e) {
        showAuthError('Connection error with server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Login';
    }
}

export async function doRegister() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerPassword2').value;

    if (!name || !email || !password) return showAuthError('Complete all fields');
    if (password !== password2) return showAuthError('Passwords do not match');
    if (password.length < 4) return showAuthError('Password: minimum 4 characters');

    const btn = document.getElementById('btnRegister');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
        const res = await fetch(`${state.API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (res.ok) {
            const data = await res.json();
            onAuthSuccess(data);
        } else {
            const err = await res.json();
            showAuthError(err.detail || 'Error creating account');
        }
    } catch (e) {
        showAuthError('Connection error with server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

function onAuthSuccess(data) {
    state.setAuthToken(data.access_token);
    state.setCurrentUser(data.user);

    // Save token
    try {
        const remember = document.getElementById('loginRemember')?.checked;
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('zest_token', state.authToken);
        (remember ? sessionStorage : localStorage).removeItem('zest_token');
    } catch(e) {}

    updateUserUI();

    document.getElementById('authScreen').classList.add('hidden');
    const appMain = document.getElementById('appMain');
    appMain.classList.remove('hidden');
    appMain.classList.add('contents');

    // Load data (via window to avoid circular import)
    if (window.loadRecipes) window.loadRecipes();

    // Show onboarding if first time
    if (window.shouldShowOnboarding && window.shouldShowOnboarding()) {
        setTimeout(() => {
            if (window.showOnboarding) window.showOnboarding();
        }, 500);
    }
}

export function updateUserUI() {
    if (!state.currentUser) return;
    const initial = (state.currentUser.name || state.currentUser.email || '?')[0].toUpperCase();
    document.getElementById('userName').textContent = state.currentUser.name || 'Chef';
    document.getElementById('userRole').textContent = state.currentUser.email;

    const avatarEl = document.getElementById('userAvatar');
    if (state.currentUser.avatar_url) {
        avatarEl.innerHTML = `<img src="${state.API_URL}${state.currentUser.avatar_url}" class="w-full h-full object-cover">`;
    } else {
        avatarEl.innerHTML = `<span id="userInitial">${initial}</span>`;
    }
}

export function doLogout() {
    state.setAuthToken(null);
    state.setCurrentUser(null);
    try {
        sessionStorage.removeItem('zest_token');
        localStorage.removeItem('zest_token');
    } catch(e) {}

    document.getElementById('authScreen').classList.remove('hidden');
    const appMain = document.getElementById('appMain');
    appMain.classList.add('hidden');
    appMain.classList.remove('contents');

    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('authError').classList.add('hidden');
}

export async function tryAutoLogin() {
    let savedToken = null;
    try {
        savedToken = localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token');
    } catch(e) {}

    if (!savedToken) return false;

    try {
        const res = await fetch(`${state.API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        if (res.ok) {
            state.setAuthToken(savedToken);
            state.setCurrentUser(await res.json());
            updateUserUI();
            document.getElementById('authScreen').classList.add('hidden');
            const appMain = document.getElementById('appMain');
            appMain.classList.remove('hidden');
            appMain.classList.add('contents');
            if (window.loadRecipes) window.loadRecipes();
            return true;
        }
    } catch(e) {}

    return false;
}

// --- Window Exposure ---
window.switchAuthTab = switchAuthTab;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doLogout = doLogout;
window.tryAutoLogin = tryAutoLogin;

// ============================================
// PROFILE.JS — User Profile & Settings Modal
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';
import { updateUserUI } from './auth.js';

// --- Settings Modal ---
export function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('settingsModalContent').classList.remove('scale-95');
    }, 10);
    // Load backup config when opening
    if (window.loadBackupConfig) window.loadBackupConfig();
}

export function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('opacity-0');
    document.getElementById('settingsModalContent').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Help Modal ---
export function openHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('helpModalContent').classList.remove('scale-95');
    }, 10);
}

export function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.classList.add('opacity-0');
    document.getElementById('helpModalContent').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// --- Profile Modal ---
export function openProfileModal() {
    if (!state.currentUser) return;

    document.getElementById('profileName').value = state.currentUser.name || '';
    document.getElementById('profileEmail').value = state.currentUser.email || '';
    document.getElementById('profileDisplayName').textContent = state.currentUser.name || 'Chef';
    document.getElementById('profileDisplayEmail').textContent = state.currentUser.email || '';

    const initial = (state.currentUser.name || state.currentUser.email || '?')[0].toUpperCase();

    if (state.currentUser.avatar_url) {
        document.getElementById('profileAvatar').innerHTML =
            `<img src="${state.API_URL}${state.currentUser.avatar_url}" class="w-full h-full object-cover">`;
    } else {
        document.getElementById('profileAvatar').innerHTML =
            `<span id="profileInitial">${initial}</span>`;
    }

    document.getElementById('profileCurrentPwd').value = '';
    document.getElementById('profileNewPwd').value = '';
    document.getElementById('profileNewPwd2').value = '';
    document.getElementById('profileFeedback').classList.add('hidden');

    const modal = document.getElementById('profileModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('profileModalContent').classList.remove('scale-95');
    }, 10);
}

export function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('opacity-0');
    document.getElementById('profileModalContent').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function showProfileFeedback(msg, isError = false) {
    const el = document.getElementById('profileFeedback');
    el.textContent = msg;
    el.className = `p-3 rounded-xl text-sm text-center ${isError
        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'}`;
    el.classList.remove('hidden');
    if (!isError) setTimeout(() => el.classList.add('hidden'), 3000);
}

export async function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();

    if (!name) return showProfileFeedback('Name is required', true);
    if (!email || !email.includes('@')) return showProfileFeedback('Invalid email', true);

    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await authFetch(`${state.API_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, avatar_url: state.currentUser.avatar_url || '' })
        });

        if (res.ok) {
            state.setCurrentUser(await res.json());
            updateUserUI();
            document.getElementById('profileDisplayName').textContent = state.currentUser.name;
            document.getElementById('profileDisplayEmail').textContent = state.currentUser.email;
            showProfileFeedback('✅ Profile updated');
        } else {
            const err = await res.json();
            showProfileFeedback(err.detail || 'Error saving', true);
        }
    } catch (e) {
        showProfileFeedback('Connection error', true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

export async function changePassword() {
    const current = document.getElementById('profileCurrentPwd').value;
    const newPwd = document.getElementById('profileNewPwd').value;
    const newPwd2 = document.getElementById('profileNewPwd2').value;

    if (!current || !newPwd) return showProfileFeedback('Complete all password fields', true);
    if (newPwd !== newPwd2) return showProfileFeedback('New passwords do not match', true);
    if (newPwd.length < 4) return showProfileFeedback('Minimum 4 characters', true);

    const btn = document.getElementById('btnChangePassword');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Changing...';

    try {
        const res = await authFetch(`${state.API_URL}/auth/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: current, new_password: newPwd })
        });

        if (res.ok) {
            document.getElementById('profileCurrentPwd').value = '';
            document.getElementById('profileNewPwd').value = '';
            document.getElementById('profileNewPwd2').value = '';
            showProfileFeedback('✅ Password updated');
        } else {
            const err = await res.json();
            showProfileFeedback(err.detail || 'Error changing password', true);
        }
    } catch (e) {
        showProfileFeedback('Connection error', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-lock"></i> Change Password';
    }
}

export async function uploadProfileAvatar(input) {
    if (!input.files || !input.files[0]) return;

    const formData = new FormData();
    formData.append('file', input.files[0]);

    try {
        const res = await authFetch(`${state.API_URL}/upload/`, { method: 'POST', body: formData });
        if (res.ok) {
            const data = await res.json();

            const res2 = await authFetch(`${state.API_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: state.currentUser.name,
                    email: state.currentUser.email,
                    avatar_url: data.url
                })
            });

            if (res2.ok) {
                state.setCurrentUser(await res2.json());
                updateUserUI();
                document.getElementById('profileAvatar').innerHTML =
                    `<img src="${state.API_URL}${data.url}" class="w-full h-full object-cover">`;
                input.value = '';
                showProfileFeedback('✅ Photo updated');
            }
        }
    } catch (e) {
        showProfileFeedback('Error uploading image', true);
    }
}

// --- Window Exposure ---
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;
window.changePassword = changePassword;
window.uploadProfileAvatar = uploadProfileAvatar;

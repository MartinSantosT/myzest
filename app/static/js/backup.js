// ============================================================
// backup.js — Automatic Backup (UI in Settings)
// ============================================================

import * as state from './state.js';
import { authFetch } from './api.js';

// --- Load Configuration ---
export async function loadBackupConfig() {
    try {
        const res = await authFetch(`${state.API_URL}/backup/config`);
        if (!res.ok) return;
        const config = await res.json();

        document.getElementById('backupEnabled').checked = config.enabled;
        document.getElementById('backupFrequency').value = config.frequency_hours;
        document.getElementById('backupMaxKeep').value = config.max_backups;
        document.getElementById('backupIncludeImages').checked = config.include_images;

        // Show last backup status
        const statusEl = document.getElementById('backupLastStatus');
        if (config.last_backup_at) {
            const date = new Date(config.last_backup_at);
            const dateStr = date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const icon = config.last_backup_status === 'success' ? '✅' : '⚠️';
            statusEl.innerHTML = `${icon} Last backup: <strong>${dateStr}</strong> (${config.last_backup_size})`;
            statusEl.classList.remove('hidden');
        } else {
            statusEl.innerHTML = '⚪ No backups yet';
            statusEl.classList.remove('hidden');
        }

        // Update options visibility
        toggleBackupOptions(config.enabled);

        // Listener for toggle - responds in real time
        const toggle = document.getElementById('backupEnabled');
        toggle.removeEventListener('change', onBackupToggle);
        toggle.addEventListener('change', onBackupToggle);

        // Load backup list
        loadBackupList();
    } catch (e) {
        console.error('Error loading backup config:', e);
    }
}

function onBackupToggle(e) {
    toggleBackupOptions(e.target.checked);
}

function toggleBackupOptions(enabled) {
    const options = document.getElementById('backupOptions');
    if (enabled) {
        options.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        options.classList.add('opacity-50', 'pointer-events-none');
    }
}

// --- Save Configuration ---
export async function saveBackupConfig() {
    try {
        const enabled = document.getElementById('backupEnabled').checked;
        const frequency = document.getElementById('backupFrequency').value;
        const maxBackups = document.getElementById('backupMaxKeep').value;
        const includeImages = document.getElementById('backupIncludeImages').checked;

        const params = new URLSearchParams({
            enabled, frequency_hours: frequency, max_backups: maxBackups, include_images: includeImages
        });

        const res = await authFetch(`${state.API_URL}/backup/config?${params}`, { method: 'PUT' });
        if (!res.ok) throw new Error('Error saving configuration');

        const btn = document.getElementById('backupSaveBtn');
        const original = btn.textContent;
        btn.textContent = '✓ Saved';
        btn.classList.add('bg-green-500');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('bg-green-500');
        }, 2000);

        toggleBackupOptions(enabled);
    } catch (e) {
        alert('❌ Save error: ' + e.message);
    }
}

// --- Manual Backup ---
export async function backupNow() {
    const btn = document.getElementById('backupNowBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Creating backup...';
    btn.disabled = true;

    try {
        const res = await authFetch(`${state.API_URL}/backup/now`, { method: 'POST' });
        if (!res.ok) throw new Error('Error creating backup');
        const result = await res.json();

        btn.innerHTML = `✅ Backup created (${result.size})`;
        setTimeout(() => {
            btn.innerHTML = original;
            btn.disabled = false;
        }, 3000);

        // Reload status and list
        loadBackupConfig();
    } catch (e) {
        btn.innerHTML = '❌ Error';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.disabled = false;
        }, 3000);
    }
}

// --- List Backups ---
async function loadBackupList() {
    try {
        const res = await authFetch(`${state.API_URL}/backup/list`);
        if (!res.ok) return;
        const backups = await res.json();

        const container = document.getElementById('backupList');
        if (backups.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400 italic">No backups saved</p>';
            return;
        }

        container.innerHTML = backups.map(b => {
            const date = new Date(b.created_at);
            const dateStr = date.toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `
                <div class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div class="flex items-center gap-2">
                        <i class="ph-bold ph-file-zip text-orange-500"></i>
                        <span class="text-sm text-gray-700 dark:text-gray-300">${dateStr}</span>
                        <span class="text-xs text-gray-400">${b.size}</span>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="restoreBackup('${b.filename}')" title="Restore"
                            class="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors">
                            <i class="ph-bold ph-arrow-counter-clockwise text-sm"></i>
                        </button>
                        <button onclick="deleteBackup('${b.filename}')" title="Delete"
                            class="p-1.5 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error loading backup list:', e);
    }
}

// --- Restore Backup ---
export async function restoreBackup(filename) {
    if (!confirm(`Restore from ${filename}?\n\nA backup of the current state will be created before restoring. You will need to restart the application afterward.`)) return;

    try {
        const res = await authFetch(`${state.API_URL}/backup/restore/${filename}`, { method: 'POST' });
        if (!res.ok) throw new Error('Error restoring');
        const result = await res.json();
        alert('✅ ' + result.message);
        loadBackupList();
    } catch (e) {
        alert('❌ Restore error: ' + e.message);
    }
}

// --- Delete Backup ---
export async function deleteBackup(filename) {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
        const res = await authFetch(`${state.API_URL}/backup/${filename}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error deleting');
        loadBackupList();
    } catch (e) {
        alert('❌ Delete error: ' + e.message);
    }
}

// --- Register in window for onclick ---
window.saveBackupConfig = saveBackupConfig;
window.backupNow = backupNow;
window.restoreBackup = restoreBackup;
window.deleteBackup = deleteBackup;
window.loadBackupConfig = loadBackupConfig;

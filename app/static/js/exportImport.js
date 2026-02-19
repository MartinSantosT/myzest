// ============================================
// EXPORTIMPORT.JS — Database Export & Import
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';

export async function exportDatabase() {
    try {
        const btn = (window.event || {}).target?.closest('button') || document.activeElement;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Exporting...';
        btn.disabled = true;

        const response = await authFetch(`${state.API_URL}/export/database`);
        if (!response.ok) throw new Error('Export error');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zest_backup_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        btn.innerHTML = originalHTML;
        btn.disabled = false;
        alert('✅ Database and images exported successfully');
    } catch (e) {
        console.error(e);
        alert('❌ Export error: ' + e.message);
        try { btn.disabled = false; } catch(_) {}
    }
}

export async function exportJSON() {
    try {
        const btn = (window.event || {}).target?.closest('button') || document.activeElement;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Exporting...';
        btn.disabled = true;

        const response = await authFetch(`${state.API_URL}/export/recipes`);
        if (!response.ok) throw new Error('Export error');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recipes_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        btn.innerHTML = originalHTML;
        btn.disabled = false;
        alert('✅ Recipes exported in JSON format');
    } catch (e) {
        console.error(e);
        alert('❌ Export error: ' + e.message);
        try { btn.disabled = false; } catch(_) {}
    }
}

export async function importDatabase(input) {
    if (!input.files || !input.files[0]) return;

    const confirmed = confirm('⚠️ WARNING: This will replace the ENTIRE current database and images. Are you sure?');
    if (!confirmed) {
        input.value = '';
        return;
    }

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const progress = document.getElementById('importProgress');
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');

    try {
        progress.classList.remove('hidden');
        progressText.textContent = 'Uploading file...';
        progressBar.style.width = '30%';

        const response = await authFetch(`${state.API_URL}/import/database`, {
            method: 'POST',
            body: formData
        });

        progressBar.style.width = '70%';
        progressText.textContent = 'Processing...';

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Import error');
        }

        const result = await response.json();
        progressBar.style.width = '100%';
        progressText.textContent = 'Done!';

        setTimeout(() => {
            progress.classList.add('hidden');
            progressBar.style.width = '0%';
            alert(`✅ ${result.message}\n\nRecipes: ${result.recipes}\nImages: ${result.images}`);
            if (window.closeSettingsModal) window.closeSettingsModal();
            if (window.loadRecipes) window.loadRecipes();
        }, 1000);

    } catch (e) {
        console.error(e);
        progress.classList.add('hidden');
        progressBar.style.width = '0%';
        alert('❌ Import error: ' + e.message);
    } finally {
        input.value = '';
    }
}

export async function importJSON(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const progress = document.getElementById('importProgress');
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');

    try {
        progress.classList.remove('hidden');
        progressText.textContent = 'Uploading file...';
        progressBar.style.width = '30%';

        const response = await authFetch(`${state.API_URL}/import/recipes`, {
            method: 'POST',
            body: formData
        });

        progressBar.style.width = '70%';
        progressText.textContent = 'Importing recipes...';

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Import error');
        }

        const result = await response.json();
        progressBar.style.width = '100%';
        progressText.textContent = 'Done!';

        setTimeout(() => {
            progress.classList.add('hidden');
            progressBar.style.width = '0%';
            alert(`✅ ${result.message}\n\nRecipes imported: ${result.imported}\nDuplicates (skipped): ${result.skipped}`);
            if (window.closeSettingsModal) window.closeSettingsModal();
            if (window.loadRecipes) window.loadRecipes();
        }, 1000);

    } catch (e) {
        console.error(e);
        progress.classList.add('hidden');
        progressBar.style.width = '0%';
        alert('❌ Import error: ' + e.message);
    } finally {
        input.value = '';
    }
}

// --- Window Exposure ---
window.exportDatabase = exportDatabase;
window.exportJSON = exportJSON;
window.importDatabase = importDatabase;
window.importJSON = importJSON;

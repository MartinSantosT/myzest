// ============================================
// APP.JS — Entry Point for Zest Recipe Manager
// ============================================
// This file imports all modules and initializes the app.
// Each module self-registers its functions on `window`
// for inline onclick handlers in the HTML.
// ============================================

// --- Foundation ---
import * as state from './state.js';
import './api.js';

// --- i18n (must load early) ---
import { translatePage, initLangButton } from './i18n.js';

// --- Leaf Modules ---
import { updateThemeButton } from './theme.js';
import './rating.js';
import { initSidebar } from './sidebar.js';

// --- Auth ---
import './auth.js';

// --- Data Modules ---
import './ingredients.js';
import './calculator.js';
import './categories.js';
import './tags.js';

// --- Core ---
import './recipeFilters.js';
import './recipes.js';

// --- Features ---
import './whatToCook.js';
import './shoppingList.js';
import './views.js';

// --- Settings ---
import './profile.js';
import './exportImport.js';
import './backup.js';

// --- Cookbooks & Sharing ---
import './cookbooks.js';
import './sharing.js';
import { initCoverDragListeners } from './coverImages.js';

// --- Memories ---
import './memories.js';

// --- Recipe Detail (Reading View + Cooking Mode) ---
import './recipeDetail.js';

// --- Onboarding ---
import './onboarding.js';

// --- Scraper ---
import './scraper.js';

// ============================================
// INITIALIZATION
// ============================================

// Init sidebar layout
window.addEventListener('DOMContentLoaded', () => {
    initSidebar();
});

// Init theme button state
updateThemeButton();

// Init i18n — translate all data-i18n elements and set language button
translatePage();
initLangButton();

// Init cover drag-to-reposition
initCoverDragListeners();

// Attempt auto-login (will load recipes on success)
if (window.tryAutoLogin) {
    window.tryAutoLogin();
}

// ============================================
// UPDATE CHECK — admin only, fired after auto-login
// ============================================
// Calls /api/admin/check-update which compares APP_VERSION against the
// latest GitHub release. Server-side caches the GitHub response for 1
// hour to avoid rate limits. Banner only shown to admins; "Remind me
// later" hides it for 24h via localStorage.
async function maybeCheckForUpdate() {
    try {
        // Only admins see update notifications
        const user = state.currentUser;
        if (!user || !user.is_admin) return;
        const token = state.authToken;
        if (!token) return;

        // Respect "remind me later" — 24h snooze
        const snoozeUntil = parseInt(localStorage.getItem('zest_update_snooze_until') || '0', 10);
        if (Date.now() < snoozeUntil) return;

        const res = await fetch(`${state.API_URL || ''}/api/admin/check-update`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.is_outdated) return;

        const banner = document.createElement('div');
        banner.id = 'update-banner';
        banner.className = 'fixed bottom-4 right-4 z-[200] bg-orange-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-medium max-w-md';
        const releaseUrl = data.release_url || 'https://github.com/MartinSantosT/myzest/releases';
        banner.innerHTML = `
            <span>🍊 Zest <strong>${data.latest}</strong> is available (you are on ${data.current})</span>
            <a href="${releaseUrl}" target="_blank" rel="noopener" class="bg-white text-orange-600 px-3 py-1 rounded-lg font-bold hover:bg-orange-100 whitespace-nowrap">Release notes</a>
            <a href="https://github.com/MartinSantosT/myzest/blob/main/MANUAL.md#updating-zest-to-a-new-version" target="_blank" rel="noopener" class="bg-white/20 text-white px-3 py-1 rounded-lg font-medium hover:bg-white/30 whitespace-nowrap">How to update</a>
            <button onclick="localStorage.setItem('zest_update_snooze_until', String(Date.now() + 24*60*60*1000)); this.parentElement.remove();" class="text-white/70 hover:text-white ml-1 text-xs whitespace-nowrap" title="Hide for 24 hours">Later</button>
        `;
        document.body.appendChild(banner);
    } catch (e) {
        // Network error or GitHub unreachable: silently do nothing
    }
}

// Defer until after the auth state is settled (tryAutoLogin is async)
setTimeout(maybeCheckForUpdate, 1500);

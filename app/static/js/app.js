// ============================================
// APP.JS — Entry Point for Zest Recipe Manager
// ============================================
// This file imports all modules and initializes the app.
// Each module self-registers its functions on `window`
// for inline onclick handlers in the HTML.
// ============================================

// --- Foundation ---
import './state.js';
import './api.js';

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

// Init cover drag-to-reposition
initCoverDragListeners();

// Attempt auto-login (will load recipes on success)
if (window.tryAutoLogin) {
    window.tryAutoLogin();
}

// ============================================
// VERSION CHECK — Notify user of updates
// ============================================
(async function checkVersion() {
    try {
        const res = await fetch(`${window.API_URL || ''}/api/version`);
        if (!res.ok) return;
        const data = await res.json();
        const serverVersion = data.version;
        const localVersion = localStorage.getItem('zest_app_version');

        if (!localVersion) {
            // First visit — store current version silently
            localStorage.setItem('zest_app_version', serverVersion);
            return;
        }

        if (localVersion !== serverVersion) {
            // Show update banner
            const banner = document.createElement('div');
            banner.id = 'update-banner';
            banner.className = 'fixed bottom-4 right-4 z-[200] bg-orange-500 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 text-sm font-medium animate-pulse';
            banner.innerHTML = `
                <span>🍊 New version available (v${serverVersion})</span>
                <button onclick="localStorage.setItem('zest_app_version','${serverVersion}');location.reload()" class="bg-white text-orange-500 px-3 py-1 rounded-lg font-bold hover:bg-orange-100 transition-colors">Reload</button>
                <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white ml-1">✕</button>
            `;
            document.body.appendChild(banner);
        }
    } catch (e) {
        // Silently ignore version check failures
    }
})();

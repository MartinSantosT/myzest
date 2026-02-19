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

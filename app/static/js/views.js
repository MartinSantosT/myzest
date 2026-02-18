// ============================================
// VIEWS.JS — View Navigation System
// ============================================

import * as state from './state.js';
import { applyFilters } from './recipeFilters.js';
import { renderShoppingList } from './shoppingList.js';
import { loadCookbooks } from './cookbooks.js';
import { loadMemories } from './memories.js';

export function showView(view) {
    // Hide all views
    document.getElementById('viewRecipes').classList.add('hidden');
    document.getElementById('viewCalculator').classList.add('hidden');
    document.getElementById('viewWhatToCook').classList.add('hidden');
    document.getElementById('viewShoppingList').classList.add('hidden');
    document.getElementById('viewCookbooks').classList.add('hidden');
    document.getElementById('viewCookbookDetail').classList.add('hidden');
    document.getElementById('viewScraper').classList.add('hidden');
    document.getElementById('viewMemories').classList.add('hidden');
    document.getElementById('viewMemoryDetail').classList.add('hidden');
    document.getElementById('viewPlanner').classList.add('hidden');
    document.getElementById('viewRecipeDetail').classList.add('hidden');

    // Clear active nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // Show/hide filter header based on view
    const header = document.querySelector('#mainContent > header');

    if (view === 'calculator') {
        document.getElementById('viewCalculator').classList.remove('hidden');
        document.getElementById('navCalculator').classList.add('active');
        header.classList.add('hidden');
    } else if (view === 'whatToCook') {
        document.getElementById('viewWhatToCook').classList.remove('hidden');
        document.getElementById('navWhatToCook').classList.add('active');
        header.classList.add('hidden');
    } else if (view === 'shoppingList') {
        document.getElementById('viewShoppingList').classList.remove('hidden');
        document.getElementById('navShoppingList').classList.add('active');
        header.classList.add('hidden');
        renderShoppingList();
    } else if (view === 'cookbooks') {
        document.getElementById('viewCookbooks').classList.remove('hidden');
        document.getElementById('navCookbooks').classList.add('active');
        header.classList.add('hidden');
        loadCookbooks();
    } else if (view === 'cookbookDetail') {
        document.getElementById('viewCookbookDetail').classList.remove('hidden');
        document.getElementById('navCookbooks').classList.add('active');
        header.classList.add('hidden');
    } else if (view === 'memories') {
        document.getElementById('viewMemories').classList.remove('hidden');
        document.getElementById('navMemories').classList.add('active');
        header.classList.add('hidden');
        loadMemories();
    } else if (view === 'memoryDetail') {
        document.getElementById('viewMemoryDetail').classList.remove('hidden');
        document.getElementById('navMemories').classList.add('active');
        header.classList.add('hidden');
    } else if (view === 'scraper') {
        document.getElementById('viewScraper').classList.remove('hidden');
        document.getElementById('navScraper').classList.add('active');
        header.classList.add('hidden');
    } else if (view === 'planner') {
        document.getElementById('viewPlanner').classList.remove('hidden');
        header.classList.add('hidden');
    } else if (view === 'recipeDetail') {
        document.getElementById('viewRecipeDetail').classList.remove('hidden');
        header.classList.add('hidden');
    } else {
        document.getElementById('viewRecipes').classList.remove('hidden');
        header.classList.remove('hidden');

        if (view === 'favorites') {
            document.getElementById('navFavorites').classList.add('active');
        } else {
            const allNav = document.querySelector('.nav-item[onclick="filterByView(\'all\')"]');
            if (allNav) allNav.classList.add('active');
        }
    }
}

export function filterByView(view) {
    state.setCurrentView(view);
    showView(view);
    applyFilters();
}

// --- Window Exposure ---
window.showView = showView;
window.filterByView = filterByView;

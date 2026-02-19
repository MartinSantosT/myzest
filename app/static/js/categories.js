// ============================================
// CATEGORIES.JS — Category Management
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';

export function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="">All Categories</option>';

    state.allCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });
}

export function populateCategoriesContainer() {
    // The dropdown is populated dynamically
}

export function toggleCategory(catId) {
    const cats = [...state.selectedCategories];
    const index = cats.indexOf(catId);
    if (index > -1) {
        cats.splice(index, 1);
    } else {
        cats.push(catId);
    }
    state.setSelectedCategories(cats);
    updateSelectedCategoriesDisplay();
}

export function updateSelectedCategoriesDisplay() {
    const container = document.getElementById('selectedCategoriesContainer');
    if (!container) return;

    if (state.selectedCategories.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-400">Select or create categories...</span>';
        return;
    }

    container.innerHTML = state.selectedCategories.map(catId => {
        const cat = state.allCategories.find(c => c.id === catId);
        if (!cat) return '';

        return `
            <span class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium"
                  style="background-color: #f97316; color: white;">
                ${cat.name}
                <button
                    type="button"
                    onclick="toggleCategory(${cat.id})"
                    class="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                    <i class="ph-bold ph-x text-xs"></i>
                </button>
            </span>
        `;
    }).join('');
}

export function showCategoryDropdown() {
    filterCategoryDropdown();
    document.getElementById('categoryDropdown').classList.remove('hidden');
}

export function hideCategoryDropdown() {
    setTimeout(() => {
        document.getElementById('categoryDropdown').classList.add('hidden');
    }, 150);
}

export function filterCategoryDropdown() {
    const input = document.getElementById('categorySearchInput');
    const dropdown = document.getElementById('categoryDropdown');
    const query = input.value.trim().toLowerCase();

    const available = state.allCategories.filter(cat =>
        !state.selectedCategories.includes(cat.id) &&
        (query === '' || cat.name.toLowerCase().includes(query))
    );

    let html = '';

    available.forEach(cat => {
        html += `
            <button type="button"
                onmousedown="selectCategoryFromDropdown(${cat.id})"
                class="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer">
                <i class="ph-bold ph-folder text-orange-400 text-xs"></i>
                <span>${cat.name}</span>
            </button>
        `;
    });

    if (query && !state.allCategories.some(c => c.name.toLowerCase() === query)) {
        html += `
            <button type="button"
                onmousedown="createCategoryFromDropdown('${query.replace(/'/g, "\\'")}')"
                class="w-full text-left px-3 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2 cursor-pointer border-t border-gray-200 dark:border-gray-600 text-green-600 dark:text-green-400 font-medium">
                <i class="ph-bold ph-plus-circle text-sm"></i>
                <span>Create "${input.value.trim()}"</span>
            </button>
        `;
    }

    if (!html) {
        html = '<div class="px-3 py-2 text-xs text-gray-400">No categories available</div>';
    }

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
}

export function selectCategoryFromDropdown(catId) {
    const cats = [...state.selectedCategories];
    if (!cats.includes(catId)) {
        cats.push(catId);
    }
    state.setSelectedCategories(cats);
    updateSelectedCategoriesDisplay();

    const input = document.getElementById('categorySearchInput');
    input.value = '';
    filterCategoryDropdown();
    input.focus();
}

export async function createCategoryFromDropdown(name) {
    try {
        const res = await authFetch(`${state.API_URL}/categories/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });

        if (res.ok) {
            const newCat = await res.json();

            const cats = [...state.allCategories];
            if (!cats.find(c => c.id === newCat.id)) {
                cats.push(newCat);
                cats.sort((a, b) => a.name.localeCompare(b.name));
            }
            state.setAllCategories(cats);

            const selected = [...state.selectedCategories];
            if (!selected.includes(newCat.id)) {
                selected.push(newCat.id);
            }
            state.setSelectedCategories(selected);

            updateSelectedCategoriesDisplay();
            populateCategoryFilter();

            const input = document.getElementById('categorySearchInput');
            input.value = '';
            filterCategoryDropdown();
            input.focus();
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

export function loadRecipeCategories(recipe) {
    state.setSelectedCategories(recipe.categories ? recipe.categories.map(c => c.id) : []);
    updateSelectedCategoriesDisplay();
}

export function clearSelectedCategories() {
    state.setSelectedCategories([]);
    updateSelectedCategoriesDisplay();
}

// --- Window Exposure ---
window.toggleCategory = toggleCategory;
window.selectCategoryFromDropdown = selectCategoryFromDropdown;
window.createCategoryFromDropdown = createCategoryFromDropdown;
window.showCategoryDropdown = showCategoryDropdown;
window.hideCategoryDropdown = hideCategoryDropdown;
window.filterCategoryDropdown = filterCategoryDropdown;
window.clearSelectedCategories = clearSelectedCategories;

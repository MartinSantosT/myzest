// ============================================
// RECIPEFILTERS.JS — Load, Filter & Render Recipes
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';
import { populateCategoryFilter, populateCategoriesContainer } from './categories.js';
import { populateTagFilter, populateTagsContainer } from './tags.js';

export async function loadRecipes() {
    try {
        const res = await authFetch(`${state.API_URL}/recipes/`);
        state.setAllRecipes(await res.json());

        await loadCategories();
        await loadTags();
        populateCategoryFilter();
        populateCategoriesContainer();
        populateTagFilter();
        populateTagsContainer();
        applyFilters();
        updateStats();
    } catch (e) {
        console.error("Error loading recipes:", e);
    }
}

export async function loadCategories() {
    try {
        const res = await authFetch(`${state.API_URL}/categories/`);
        state.setAllCategories(await res.json());
    } catch (e) {
        console.error("Error loading categories:", e);
        state.setAllCategories([]);
    }
}

export async function loadTags() {
    try {
        const res = await authFetch(`${state.API_URL}/tags/`);
        state.setAllTags(await res.json());
    } catch (e) {
        console.error("Error loading tags:", e);
        state.setAllTags([]);
    }
}

export function updateStats() {
    const categoryIds = new Set();
    state.allRecipes.forEach(r => {
        if (r.categories && r.categories.length > 0) {
            r.categories.forEach(cat => categoryIds.add(cat.id));
        }
    });

    const favorites = state.allRecipes.filter(r => r.is_favorite);
    const fiveStars = state.allRecipes.filter(r => r.rating === 5);

    document.getElementById('statTotal').textContent = state.allRecipes.length;
    document.getElementById('statFolders').textContent = categoryIds.size;
    document.getElementById('statTags').textContent = state.allTags.length;
    document.getElementById('statFavorites').textContent = favorites.length;
    document.getElementById('statFiveStars').textContent = fiveStars.length;
}

export function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.classList.toggle('hidden', !search);
    const categoryValue = document.getElementById('categoryFilter').value;
    const tagValue = document.getElementById('tagFilter').value;
    const ratingValue = document.getElementById('ratingFilter').value;

    let filtered = state.allRecipes;

    if (state.currentView === 'favorites') {
        filtered = filtered.filter(r => r.is_favorite);
    }

    if (search) {
        filtered = filtered.filter(r => {
            const titleMatch = r.title.toLowerCase().includes(search);
            const ingredientMatch = r.ingredients && r.ingredients.some(ing => {
                const name = (ing.name || '').toLowerCase();
                const text = (ing.text || '').toLowerCase();
                return name.includes(search) || text.includes(search);
            });
            return titleMatch || ingredientMatch;
        });
    }

    if (categoryValue) {
        const catId = parseInt(categoryValue);
        filtered = filtered.filter(r =>
            r.categories && r.categories.some(c => c.id === catId)
        );
    }

    if (tagValue) {
        const tagId = parseInt(tagValue);
        filtered = filtered.filter(r =>
            r.tags && r.tags.some(t => t.id === tagId)
        );
    }

    if (ratingValue !== '' && ratingValue !== undefined && ratingValue !== null) {
        const exactRating = parseInt(ratingValue);
        if (exactRating === 0) {
            filtered = filtered.filter(r => !r.rating || r.rating === 0);
        } else {
            filtered = filtered.filter(r => r.rating === exactRating);
        }
    }

    renderRecipes(filtered, search);
}

export function renderRecipes(recipes, searchTerm = '') {
    const grid = document.getElementById('recipeGrid');
    if (!recipes.length) {
        grid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400"><i class="ph-bold ph-cooking-pot text-6xl mb-4"></i><p class="text-xl">No recipes to display</p></div>';
        return;
    }

    grid.innerHTML = recipes.map(r => {
        let ingredientBadge = '';
        if (searchTerm) {
            const titleMatch = r.title.toLowerCase().includes(searchTerm);
            if (!titleMatch && r.ingredients) {
                const matchedIng = r.ingredients.find(ing => {
                    const name = (ing.name || '').toLowerCase();
                    const text = (ing.text || '').toLowerCase();
                    return name.includes(searchTerm) || text.includes(searchTerm);
                });
                if (matchedIng) {
                    const displayName = matchedIng.name || matchedIng.text;
                    ingredientBadge = `<div class="flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400 mt-1">
                        <i class="ph-bold ph-magnifying-glass"></i>
                        <span>Contains: ${displayName}</span>
                    </div>`;
                }
            }
        }

        return `
        <div class="card-recipe bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer relative group">

            <button
                onclick="event.stopPropagation(); toggleFavorite(${r.id}, ${r.is_favorite})"
                class="favorite-btn absolute top-3 left-3 z-10 p-2 rounded-full ${r.is_favorite ? 'bg-orange-500 text-white' : 'bg-white/90 text-gray-400'} shadow-lg hover:shadow-xl">
                <i class="ph-fill ph-heart text-xl"></i>
            </button>

            ${r.source_type === 'imported' ? `
            <div class="absolute top-3 right-3 z-10 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                <i class="ph-bold ph-globe"></i> Imported
            </div>` : ''}

            <div onclick="openRecipeDetail(${r.id})">
                ${r.image_url
                    ? `<img src="${r.image_url}" class="w-full h-48 object-cover">`
                    : `<div class="w-full h-48 bg-orange-100 dark:bg-orange-900/30 flex flex-col items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors gap-1">
                        <i class="ph-duotone ph-chef-hat text-7xl text-orange-500 drop-shadow-sm mb-1"></i>
                        <span class="font-black text-xl tracking-widest text-orange-600 dark:text-orange-400 opacity-80 border-2 border-orange-500/30 px-2 rounded">NO IMAGE</span>
                    </div>`
                }

                <div class="p-5">
                    <h3 class="font-black text-lg text-gray-800 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">${r.title}</h3>
                    ${ingredientBadge}

                    ${r.categories && r.categories.length > 0
                        ? r.categories.map(c => `<span class="inline-block text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded mr-1 mb-1">${c.name}</span>`).join('')
                        : ''
                    }

                    ${r.tags && r.tags.length > 0
                        ? `<div class="flex flex-wrap gap-1 mt-2">
                            ${r.tags.map(tag =>
                                `<span class="inline-flex items-center text-xs px-2 py-1 rounded-full font-medium"
                                       style="background-color: ${tag.color}20; color: ${tag.color}; border: 1px solid ${tag.color}40;">
                                    #${tag.name}
                                </span>`
                            ).join('')}
                           </div>`
                        : ''
                    }

                    <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
                        <span class="flex items-center gap-1" title="Prep: ${r.prep_time || 0}min | Cooking: ${r.cook_time || 0}min">
                            <i class="ph-bold ph-clock"></i> ${((r.prep_time || 0) + (r.cook_time || 0)) >= 60
                                ? Math.floor(((r.prep_time || 0) + (r.cook_time || 0)) / 60) + 'h ' + (((r.prep_time || 0) + (r.cook_time || 0)) % 60 > 0 ? ((r.prep_time || 0) + (r.cook_time || 0)) % 60 + 'm' : '')
                                : ((r.prep_time || 0) + (r.cook_time || 0)) + ' min'}
                        </span>
                        <div class="flex items-center gap-3">
                            ${r.memory_count > 0 ? `<span class="flex items-center gap-1 text-orange-400" title="${r.memory_count} memor${r.memory_count > 1 ? 'ies' : 'y'}"><i class="ph-bold ph-camera"></i> ${r.memory_count}</span>` : ''}
                            <span class="flex items-center gap-1"><i class="ph-bold ph-users"></i> ${r.servings}</span>
                        </div>
                    </div>

                    ${r.rating > 0
                        ? `<div class="flex items-center gap-1 mt-2">
                            ${Array(5).fill(0).map((_, i) =>
                                `<i class="ph-fill ph-star text-sm ${i < r.rating ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}"></i>`
                            ).join('')}
                            <span class="text-xs text-gray-500 ml-1">(${r.rating}/5)</span>
                           </div>`
                        : ''
                    }
                </div>
            </div>
        </div>
    `}).join('');
}

// --- Window Exposure ---
window.loadRecipes = loadRecipes;
window.applyFilters = applyFilters;

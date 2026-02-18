// ============================================
// WHATTOCOOK.JS — "What to Cook?" Reverse Search
// ============================================

import * as state from './state.js';
import { formatQuantity } from './calculator.js';

export function addWtcIngredient(value) {
    const input = document.getElementById('wtcInput');
    const name = (value || input.value).trim().toLowerCase();

    if (!name || state.wtcIngredients.includes(name)) {
        input.value = '';
        return;
    }

    const ings = [...state.wtcIngredients, name];
    state.setWtcIngredients(ings);
    input.value = '';
    document.getElementById('wtcSuggestions').classList.add('hidden');
    renderWtcPills();
    searchWtcRecipes();
}

export function removeWtcIngredient(name) {
    state.setWtcIngredients(state.wtcIngredients.filter(i => i !== name));
    renderWtcPills();
    searchWtcRecipes();
}

export function renderWtcPills() {
    const container = document.getElementById('wtcSelectedPills');

    if (!state.wtcIngredients.length) {
        container.innerHTML = '<span class="text-xs text-gray-400 py-2">Add ingredients to see suggestions...</span>';
        document.getElementById('wtcResults').classList.add('hidden');
        return;
    }

    container.innerHTML = state.wtcIngredients.map(name => `
        <span class="inline-flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-full text-sm font-medium">
            <i class="ph-bold ph-carrot text-xs"></i>
            ${name}
            <button type="button" onclick="removeWtcIngredient('${name.replace(/'/g, "\\'")}')"
                class="ml-0.5 hover:text-red-500 transition-colors">
                <i class="ph-bold ph-x text-xs"></i>
            </button>
        </span>
    `).join('');
}

export function filterWtcSuggestions() {
    const query = document.getElementById('wtcInput').value.toLowerCase().trim();
    const dropdown = document.getElementById('wtcSuggestions');

    if (!query || query.length < 2) {
        dropdown.classList.add('hidden');
        return;
    }

    const allNames = new Set();
    state.allRecipes.forEach(r => {
        if (r.ingredients) {
            r.ingredients.forEach(ing => {
                const name = (ing.name || '').toLowerCase().trim();
                if (name && name.length > 1) allNames.add(name);
            });
        }
    });

    const matches = [...allNames]
        .filter(n => n.includes(query) && !state.wtcIngredients.includes(n))
        .sort((a, b) => {
            const aStarts = a.startsWith(query) ? 0 : 1;
            const bStarts = b.startsWith(query) ? 0 : 1;
            return aStarts - bStarts || a.localeCompare(b);
        })
        .slice(0, 8);

    if (!matches.length) {
        dropdown.classList.add('hidden');
        return;
    }

    dropdown.innerHTML = matches.map(name => `
        <button type="button"
            onmousedown="addWtcIngredient('${name.replace(/'/g, "\\'")}')"
            class="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-gray-600 transition-colors cursor-pointer flex items-center gap-2">
            <i class="ph-bold ph-plus-circle text-orange-400 text-xs"></i>
            ${name}
        </button>
    `).join('');
    dropdown.classList.remove('hidden');
}

export function searchWtcRecipes() {
    if (!state.wtcIngredients.length) {
        document.getElementById('wtcResults').classList.add('hidden');
        return;
    }

    const results = [];

    state.allRecipes.forEach(r => {
        if (!r.ingredients || !r.ingredients.length) return;

        const validIngs = r.ingredients.filter(ing => {
            const name = (ing.name || ing.text || '').toLowerCase().trim();
            return name.length > 1;
        });

        if (!validIngs.length) return;

        let matchedIngs = [];
        let missingIngs = [];

        validIngs.forEach(ing => {
            const name = (ing.name || ing.text || '').toLowerCase();
            const found = state.wtcIngredients.some(userIng =>
                name.includes(userIng) || userIng.includes(name)
            );
            if (found) {
                matchedIngs.push(ing);
            } else {
                missingIngs.push(ing);
            }
        });

        if (matchedIngs.length === 0) return;

        const matchPercent = Math.round((matchedIngs.length / validIngs.length) * 100);

        const portions = { ...state.wtcPortions };
        if (!portions[r.id]) {
            portions[r.id] = r.servings || 4;
            state.setWtcPortions(portions);
        }

        results.push({
            recipe: r,
            matchedIngs, missingIngs, matchPercent,
            matchCount: matchedIngs.length,
            totalCount: validIngs.length,
        });
    });

    results.sort((a, b) => b.matchPercent - a.matchPercent || b.matchCount - a.matchCount);
    state.setWtcResultsCache(results);
    renderWtcResults(results);
}

export function renderWtcResults(results) {
    const container = document.getElementById('wtcResultsList');
    const resultsSection = document.getElementById('wtcResults');

    if (!results.length) {
        resultsSection.classList.remove('hidden');
        document.getElementById('wtcResultCount').textContent = 'No results';
        container.innerHTML = `
            <div class="text-center py-10 text-gray-400">
                <i class="ph-bold ph-smiley-sad text-4xl mb-3"></i>
                <p>No recipes found with those ingredients.</p>
                <p class="text-xs mt-1">Try adding more ingredients.</p>
            </div>
        `;
        return;
    }

    resultsSection.classList.remove('hidden');
    document.getElementById('wtcResultCount').textContent = `${results.length} recipe${results.length !== 1 ? 's' : ''}`;

    container.innerHTML = results.slice(0, 20).map(r => {
        const pctColor = r.matchPercent >= 75 ? 'text-green-500' :
                         r.matchPercent >= 50 ? 'text-orange-500' : 'text-gray-400';
        const pctBg = r.matchPercent >= 75 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40' :
                      r.matchPercent >= 50 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40' :
                      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';

        const portions = state.wtcPortions[r.recipe.id] || r.recipe.servings || 4;
        const baseServ = r.recipe.servings || 4;
        const multiplier = portions / baseServ;

        const missingPreview = r.missingIngs.length > 0
            ? `<div class="mt-2 flex flex-wrap gap-1">
                <span class="text-xs text-gray-400 mr-1">Missing:</span>
                ${r.missingIngs.slice(0, 4).map(m =>
                    `<span class="text-xs bg-red-50 dark:bg-red-900/20 text-red-400 px-2 py-0.5 rounded-full">${m.name || m.text}</span>`
                ).join('')}
                ${r.missingIngs.length > 4 ? `<span class="text-xs text-gray-400">+${r.missingIngs.length - 4} more</span>` : ''}
               </div>`
            : '<div class="mt-1"><span class="text-xs text-green-500 font-medium">✓ You have all ingredients</span></div>';

        const matchedHtml = r.matchedIngs.map(ing => {
            const qty = ing.quantity ? formatQuantity(ing.quantity * multiplier) : '';
            return `<div class="flex items-center gap-2 text-sm py-1">
                <i class="ph-bold ph-check-circle text-green-500 text-xs shrink-0"></i>
                <span class="w-14 text-right font-medium text-gray-600 dark:text-gray-400 shrink-0">${qty}</span>
                <span class="text-xs text-gray-400 w-20 shrink-0">${ing.unit || ''}</span>
                <span class="text-gray-700 dark:text-gray-300">${ing.name || ing.text}</span>
            </div>`;
        }).join('');

        const missingHtml = r.missingIngs.map(ing => {
            const qty = ing.quantity ? formatQuantity(ing.quantity * multiplier) : '';
            return `<div class="flex items-center gap-2 text-sm py-1">
                <i class="ph-bold ph-x-circle text-red-400 text-xs shrink-0"></i>
                <span class="w-14 text-right font-bold text-red-500 shrink-0">${qty}</span>
                <span class="text-xs text-gray-400 w-20 shrink-0">${ing.unit || ''}</span>
                <span class="text-gray-700 dark:text-gray-300">${ing.name || ing.text}</span>
            </div>`;
        }).join('');

        return `
            <div class="rounded-xl border ${pctBg} overflow-hidden transition-shadow hover:shadow-md">
                <div class="p-4 cursor-pointer" onclick="toggleWtcExpand(${r.recipe.id})">
                    <div class="flex items-center gap-4">
                        ${r.recipe.image_url
                            ? `<img src="${r.recipe.image_url}" class="w-14 h-14 rounded-xl object-cover shrink-0">`
                            : `<div class="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0"><i class="ph-bold ph-cooking-pot text-orange-500 text-xl"></i></div>`
                        }
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <h4 class="font-bold text-gray-800 dark:text-white truncate">${r.recipe.title}</h4>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="font-black text-lg ${pctColor}">${r.matchPercent}%</span>
                                        <i id="wtcChevron_${r.recipe.id}" class="ph-bold ph-caret-down text-gray-400 transition-transform"></i>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-500 mt-0.5">
                                    ${r.matchCount} of ${r.totalCount} ingredients ·
                                    <i class="ph-bold ph-clock"></i> ${(r.recipe.prep_time || 0) + (r.recipe.cook_time || 0)} min ·
                                    <i class="ph-bold ph-users"></i> ${r.recipe.servings}
                                </p>
                                ${missingPreview}
                            </div>
                    </div>
                </div>

                <div id="wtcExpand_${r.recipe.id}" class="hidden border-t border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 px-5 py-3">
                        <span class="text-sm font-bold text-gray-700 dark:text-gray-300">
                            <i class="ph-bold ph-users text-orange-500"></i> Servings:
                        </span>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="event.stopPropagation(); adjustWtcPortions(${r.recipe.id}, -1)"
                                class="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-orange-100 transition-colors font-bold">−</button>
                            <span id="wtcPortions_${r.recipe.id}" class="text-xl font-black text-orange-500 w-8 text-center">${portions}</span>
                            <button type="button" onclick="event.stopPropagation(); adjustWtcPortions(${r.recipe.id}, 1)"
                                class="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-orange-100 transition-colors font-bold">+</button>
                            <span class="text-xs text-gray-400 ml-1">(original: ${baseServ})</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-0">
                        <div class="px-5 py-3 ${r.matchedIngs.length ? '' : 'hidden'}">
                            <p class="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
                                <i class="ph-bold ph-check-circle"></i> Have (${r.matchedIngs.length})
                            </p>
                            ${matchedHtml}
                        </div>
                        <div class="px-5 py-3 ${r.missingIngs.length ? '' : 'hidden'}">
                            <p class="text-xs font-bold text-red-500 mb-2 flex items-center gap-1">
                                <i class="ph-bold ph-x-circle"></i> Missing (${r.missingIngs.length})
                            </p>
                            ${missingHtml}
                        </div>
                    </div>

                    ${r.missingIngs.length > 0 ? `
                    <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                        <button onclick="event.stopPropagation(); addWtcToShoppingList(${r.recipe.id})"
                            class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                            <i class="ph-bold ph-shopping-cart"></i>
                            Add ${r.missingIngs.length} missing item${r.missingIngs.length !== 1 ? 's' : ''} to Shopping List
                        </button>
                    </div>` : `
                    <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                        <div class="text-center text-sm text-green-600 font-medium py-2">
                            <i class="ph-bold ph-confetti"></i> You can cook this recipe right now!
                        </div>
                    </div>`}
                </div>
            </div>
        `;
    }).join('');
}

export function toggleWtcExpand(recipeId) {
    const panel = document.getElementById(`wtcExpand_${recipeId}`);
    const chevron = document.getElementById(`wtcChevron_${recipeId}`);
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
    } else {
        panel.classList.add('hidden');
        chevron.style.transform = '';
    }
}

export function adjustWtcPortions(recipeId, delta) {
    const current = state.wtcPortions[recipeId] || 4;
    const newVal = current + delta;
    if (newVal < 1 || newVal > 100) return;
    const portions = { ...state.wtcPortions, [recipeId]: newVal };
    state.setWtcPortions(portions);
    renderWtcResults(state.wtcResultsCache);
    const panel = document.getElementById(`wtcExpand_${recipeId}`);
    if (panel) panel.classList.remove('hidden');
    const chevron = document.getElementById(`wtcChevron_${recipeId}`);
    if (chevron) chevron.style.transform = 'rotate(180deg)';
}

// --- Window Exposure ---
window.addWtcIngredient = addWtcIngredient;
window.removeWtcIngredient = removeWtcIngredient;
window.filterWtcSuggestions = filterWtcSuggestions;
window.toggleWtcExpand = toggleWtcExpand;
window.adjustWtcPortions = adjustWtcPortions;

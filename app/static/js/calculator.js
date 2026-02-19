// ============================================
// CALCULATOR.JS — Portion Calculator
// ============================================

import * as state from './state.js';

export function formatQuantity(qty) {
    if (qty === null || qty === undefined) return '';

    const fractions = [
        { val: 0.25, str: '¼' }, { val: 0.333, str: '⅓' },
        { val: 0.5, str: '½' }, { val: 0.667, str: '⅔' }, { val: 0.75, str: '¾' },
    ];

    const whole = Math.floor(qty);
    const frac = qty - whole;

    if (frac > 0.01) {
        for (const f of fractions) {
            if (Math.abs(frac - f.val) < 0.05) {
                return whole > 0 ? `${whole} ${f.str}` : f.str;
            }
        }
    }

    if (Number.isInteger(qty)) return qty.toString();
    return qty.toFixed(1).replace(/\.0$/, '');
}

export function initPortionCalculator(recipe) {
    state.setCurrentRecipeIngredients(recipe.ingredients || []);
    state.setBaseServings(recipe.servings || 4);
    state.setCurrentPortions(state.baseServings);

    document.getElementById('calcPortionCount').textContent = state.currentPortions;
    document.getElementById('calcPortionOriginal').textContent = `(original: ${state.baseServings})`;
    document.getElementById('calcRecipeTitle').textContent = recipe.title;

    const imgEl = document.getElementById('calcRecipeImage');
    if (recipe.image_url) {
        imgEl.src = recipe.image_url;
        imgEl.classList.remove('hidden');
    } else {
        imgEl.classList.add('hidden');
    }

    renderCalcIngredients();
}

export function adjustPortions(delta) {
    const newVal = state.currentPortions + delta;
    if (newVal < 1 || newVal > 100) return;
    state.setCurrentPortions(newVal);

    const countEl = document.getElementById('calcPortionCount');
    countEl.textContent = state.currentPortions;

    if (state.currentPortions !== state.baseServings) {
        countEl.classList.add('text-orange-600');
    } else {
        countEl.classList.remove('text-orange-600');
    }

    renderCalcIngredients();
}

export function resetPortions() {
    state.setCurrentPortions(state.baseServings);
    document.getElementById('calcPortionCount').textContent = state.currentPortions;
    document.getElementById('calcPortionCount').classList.remove('text-orange-600');
    renderCalcIngredients();
}

function renderCalcIngredients() {
    const container = document.getElementById('calcIngredientsList');
    const multiplier = state.currentPortions / state.baseServings;

    if (!state.currentRecipeIngredients.length) {
        container.innerHTML = '<div class="p-6 text-sm text-gray-400 text-center">No ingredients</div>';
        return;
    }

    container.innerHTML = state.currentRecipeIngredients.map(ing => {
        const hasQty = ing.quantity !== null && ing.quantity !== undefined;
        const adjustedQty = hasQty ? ing.quantity * multiplier : null;
        const qtyDisplay = formatQuantity(adjustedQty);
        const unitDisplay = ing.unit || '';
        const nameDisplay = ing.name || ing.text || '';
        const noteDisplay = ing.note ? `<span class="text-gray-400 text-xs ml-1">(${ing.note})</span>` : '';
        const isAdjusted = hasQty && state.currentPortions !== state.baseServings;

        return `
            <div class="flex items-center px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div class="w-16 text-right font-bold ${isAdjusted ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'} shrink-0">
                    ${qtyDisplay}
                </div>
                <div class="w-24 text-center text-gray-500 dark:text-gray-400 text-xs shrink-0 px-2">
                    ${unitDisplay}
                </div>
                <div class="flex-1 text-gray-800 dark:text-gray-200">
                    ${nameDisplay}${noteDisplay}
                </div>
            </div>
        `;
    }).join('');
}

export function openCalculatorWithRecipe(recipeId) {
    const recipe = state.allRecipes.find(r => r.id === recipeId);
    if (recipe) {
        if (window.showView) window.showView('calculator');
        initPortionCalculator(recipe);
        document.getElementById('calcRecipeSearch').value = recipe.title;
    }
}

export function filterCalcRecipes() {
    const query = document.getElementById('calcRecipeSearch').value.toLowerCase().trim();
    const dropdown = document.getElementById('calcRecipeDropdown');

    if (!query) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = state.allRecipes.filter(r =>
        r.title.toLowerCase().includes(query)
    ).slice(0, 8);

    if (!matches.length) {
        dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-gray-400">No recipes found</div>';
    } else {
        dropdown.innerHTML = matches.map(r => `
            <button type="button"
                onmousedown="selectCalcRecipe(${r.id})"
                class="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-3 cursor-pointer">
                ${r.image_url
                    ? `<img src="${r.image_url}" class="w-10 h-10 rounded-lg object-cover shrink-0">`
                    : `<div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0"><i class="ph-bold ph-cooking-pot text-orange-500"></i></div>`
                }
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-800 dark:text-gray-200 truncate">${r.title}</p>
                    <p class="text-xs text-gray-400">${r.servings} servings · ${r.ingredients ? r.ingredients.length : 0} ingredients</p>
                </div>
            </button>
        `).join('');
    }
    dropdown.classList.remove('hidden');
}

export function selectCalcRecipe(recipeId) {
    const recipe = state.allRecipes.find(r => r.id === recipeId);
    if (recipe) {
        document.getElementById('calcRecipeSearch').value = recipe.title;
        document.getElementById('calcRecipeDropdown').classList.add('hidden');
        document.getElementById('calcContent').classList.remove('hidden');
        initPortionCalculator(recipe);
    }
}

export function hideCalcDropdown() {
    setTimeout(() => {
        document.getElementById('calcRecipeDropdown').classList.add('hidden');
    }, 150);
}

export function resetCalculator() {
    state.setCurrentRecipeIngredients([]);
    state.setBaseServings(4);
    state.setCurrentPortions(4);
    document.getElementById('calcRecipeSearch').value = '';
    document.getElementById('calcContent').classList.add('hidden');
}

// --- Window Exposure ---
window.adjustPortions = adjustPortions;
window.resetPortions = resetPortions;
window.openCalculatorWithRecipe = openCalculatorWithRecipe;
window.filterCalcRecipes = filterCalcRecipes;
window.selectCalcRecipe = selectCalcRecipe;
window.hideCalcDropdown = hideCalcDropdown;
window.resetCalculator = resetCalculator;

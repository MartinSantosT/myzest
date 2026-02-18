// ============================================
// SHOPPINGLIST.JS — Shopping List Management
// ============================================

import * as state from './state.js';
import { formatQuantity } from './calculator.js';

export function addWtcToShoppingList(recipeId) {
    const result = state.wtcResultsCache.find(r => r.recipe.id === recipeId);
    if (!result) return;

    const portions = state.wtcPortions[recipeId] || result.recipe.servings || 4;
    const baseServ = result.recipe.servings || 4;
    const multiplier = portions / baseServ;

    const items = result.missingIngs.map(ing => ({
        name: ing.name || ing.text || '',
        quantity: ing.quantity ? ing.quantity * multiplier : null,
        unit: ing.unit || '',
    }));

    const list = [...state.shoppingList, {
        recipeName: result.recipe.title,
        recipeId: recipeId,
        servings: portions,
        items: items,
    }];
    state.setShoppingList(list);

    updateShoppingBadge();
    alert(`✅ ${items.length} ingredient${items.length !== 1 ? 's' : ''} from "${result.recipe.title}" added to shopping list`);
}

export function addCalcToShoppingList() {
    if (!state.currentRecipeIngredients.length) return;

    const recipeName = document.getElementById('calcRecipeTitle').textContent;
    const multiplier = state.currentPortions / state.baseServings;

    const items = state.currentRecipeIngredients.map(ing => ({
        name: ing.name || ing.text || '',
        quantity: ing.quantity ? ing.quantity * multiplier : null,
        unit: ing.unit || '',
    }));

    const list = [...state.shoppingList, {
        recipeName: recipeName,
        recipeId: null,
        servings: state.currentPortions,
        items: items,
    }];
    state.setShoppingList(list);

    updateShoppingBadge();
    alert(`✅ ${items.length} ingredient${items.length !== 1 ? 's' : ''} from "${recipeName}" added to shopping list`);
}

export function removeShoppingGroup(index) {
    const list = [...state.shoppingList];
    list.splice(index, 1);
    state.setShoppingList(list);
    updateShoppingBadge();
    renderShoppingList();
}

export function clearShoppingList() {
    if (!state.shoppingList.length) return;
    if (!confirm('Clear entire shopping list?')) return;
    state.setShoppingList([]);
    updateShoppingBadge();
    renderShoppingList();
}

export function updateShoppingBadge() {
    const badge = document.getElementById('shoppingBadge');
    const totalItems = state.shoppingList.reduce((sum, g) => sum + g.items.length, 0);
    if (totalItems > 0) {
        badge.textContent = totalItems > 9 ? '9+' : totalItems;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

export function renderShoppingList() {
    const empty = document.getElementById('shopListEmpty');
    const content = document.getElementById('shopListContent');
    const clearBtn = document.getElementById('btnClearShopList');

    if (!state.shoppingList.length) {
        empty.classList.remove('hidden');
        content.classList.add('hidden');
        clearBtn.classList.add('hidden');
        return;
    }

    empty.classList.add('hidden');
    content.classList.remove('hidden');
    clearBtn.classList.remove('hidden');

    content.innerHTML = state.shoppingList.map((group, gi) => `
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h4 class="font-bold text-gray-800 dark:text-white text-sm">${group.recipeName}</h4>
                    <p class="text-xs text-gray-400">${group.servings} servings · ${group.items.length} ingredient${group.items.length !== 1 ? 's' : ''}</p>
                </div>
                <button onclick="removeShoppingGroup(${gi})" class="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <i class="ph-bold ph-x text-sm"></i>
                </button>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-gray-700">
                ${group.items.map(item => {
                    const qty = item.quantity ? formatQuantity(item.quantity) : '';
                    return `
                        <div class="flex items-center px-5 py-2.5 text-sm">
                            <div class="w-14 text-right font-bold text-orange-500 shrink-0">${qty}</div>
                            <div class="w-20 text-center text-gray-400 text-xs shrink-0 px-2">${item.unit}</div>
                            <div class="flex-1 text-gray-700 dark:text-gray-300">${item.name}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
}

// --- Window Exposure ---
window.addWtcToShoppingList = addWtcToShoppingList;
window.addCalcToShoppingList = addCalcToShoppingList;
window.removeShoppingGroup = removeShoppingGroup;
window.clearShoppingList = clearShoppingList;

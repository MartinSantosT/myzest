// ============================================
// INGREDIENTS.JS — Structured Ingredient Rows
// ============================================

import { formatQuantity } from './calculator.js';
import { T, getLang } from './i18n.js';

// Units with bilingual labels: [value, en, es]
const UNIT_OPTIONS = [
    ['', 'Unit', 'Unidad'],
    ['g', 'g', 'g'],
    ['kg', 'kg', 'kg'],
    ['ml', 'ml', 'ml'],
    ['liter', 'liter', 'litro'],
    ['cl', 'cl', 'cl'],
    ['cup', 'cup', 'taza'],
    ['tablespoon', 'tablespoon', 'cucharada'],
    ['teaspoon', 'teaspoon', 'cucharadita'],
    ['glass', 'glass', 'vaso'],
    ['clove', 'clove', 'diente'],
    ['leaf', 'leaf', 'hoja'],
    ['branch', 'branch', 'rama'],
    ['sprig', 'sprig', 'ramita'],
    ['slice', 'slice', 'rebanada'],
    ['bunch', 'bunch', 'manojo'],
    ['unit', 'unit', 'unidad'],
    ['piece', 'piece', 'pieza'],
    ['can', 'can', 'lata'],
    ['pot', 'pot', 'bote'],
    ['packet', 'packet', 'paquete'],
    ['bag', 'bag', 'bolsa'],
    ['package', 'package', 'empaque'],
    ['jar', 'jar', 'frasco'],
    ['pinch', 'pinch', 'pizca'],
    ['splash', 'splash', 'chorrito'],
    ['handful', 'handful', 'puñado'],
    ['pound', 'pound', 'libra'],
    ['ounce', 'ounce', 'onza'],
];

// For backward compatibility
export const COMMON_UNITS = UNIT_OPTIONS.map(u => u[0]);

export function addIngredientRow(qty = '', unit = '', name = '', note = '') {
    const container = document.getElementById('ingredientRows');
    const row = document.createElement('div');
    row.className = 'ing-row flex items-center gap-2';

    const lang = getLang();
    const unitOptions = UNIT_OPTIONS.map(([val, en, es]) =>
        `<option value="${val}" ${val === unit ? 'selected' : ''}>${lang === 'es' ? es : en}</option>`
    ).join('');

    row.innerHTML = `
        <input type="number" step="any" min="0" placeholder="${T('common.qty')}" value="${qty}"
            class="ing-qty w-20 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-orange-500 outline-none">
        <select class="ing-unit w-28 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg px-2 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer">
            ${unitOptions}
        </select>
        <input type="text" placeholder="${T('common.ingredient')}" value="${name.replace(/"/g, '&quot;')}"
            class="ing-name flex-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
        <button type="button" onclick="this.closest('.ing-row').remove()"
            class="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0">
            <i class="ph-bold ph-trash text-sm"></i>
        </button>
    `;

    container.appendChild(row);
    row.querySelector('.ing-name').focus();
    container.scrollTop = container.scrollHeight;
}

export function populateIngredientRows(ingredients) {
    const container = document.getElementById('ingredientRows');
    container.innerHTML = '';

    if (!ingredients || !ingredients.length) {
        addIngredientRow();
        return;
    }

    ingredients.forEach(ing => {
        const qty = ing.quantity !== null && ing.quantity !== undefined ? ing.quantity : '';
        const unit = ing.unit || '';
        const name = ing.name || ing.text || '';
        const note = ing.note || '';
        addIngredientRow(qty, unit, name, note);
    });
}

export function getIngredientsFromRows() {
    const rows = document.querySelectorAll('.ing-row');
    const ingredients = [];

    rows.forEach((row, i) => {
        const qty = row.querySelector('.ing-qty').value;
        const unit = row.querySelector('.ing-unit').value;
        const name = row.querySelector('.ing-name').value.trim();

        if (!name && !qty) return;

        let text = '';
        if (qty) text += qty;
        if (unit) text += (text ? ' ' : '') + unit;
        if (name) text += (text ? '  ' : '') + name;
        if (!text) text = name;

        ingredients.push({
            text: text,
            order_index: i
        });
    });

    return ingredients;
}

export function renderIngredientsReadView(ingredients) {
    const container = document.getElementById('ingredientsReadView');

    if (!ingredients || !ingredients.length) {
        container.innerHTML = `<div class="p-4 text-sm text-gray-400 text-center">${T('calc.noIngredients')}</div>`;
        return;
    }

    container.innerHTML = ingredients.map(ing => {
        const qty = ing.quantity !== null && ing.quantity !== undefined ? formatQuantity(ing.quantity) : '';
        const unit = ing.unit || '';
        const name = ing.name || ing.text || '';
        const note = ing.note ? `<span class="text-gray-400 text-xs ml-1">(${ing.note})</span>` : '';

        return `
            <div class="flex items-center px-4 py-2.5 text-sm">
                <div class="w-14 text-right font-bold text-gray-700 dark:text-gray-300 shrink-0">${qty}</div>
                <div class="w-24 text-center text-gray-500 dark:text-gray-400 text-xs shrink-0 px-2">${unit}</div>
                <div class="flex-1 text-gray-800 dark:text-gray-200">${name}${note}</div>
            </div>
        `;
    }).join('');
}

// --- Window Exposure ---
window.addIngredientRow = addIngredientRow;

// ============================================
// RECIPEDETAIL.JS — Reading View + Cooking Mode
// "Every recipe deserves to be read calmly."
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';
import { loadRecipeMemories } from './memories.js';

// ============ READING VIEW ============

export async function openRecipeDetail(recipeId) {
    // Search recipe in state or load from server
    let recipe = state.allRecipes.find(r => r.id === recipeId);
    if (!recipe) {
        try {
            const res = await authFetch(`${state.API_URL}/recipes/${recipeId}`);
            if (res.ok) recipe = await res.json();
        } catch (e) { console.error('Error loading recipe:', e); }
    }
    if (!recipe) return;

    state.setCurrentRecipe(recipe);
    renderRecipeDetail(recipe);
    if (window.showView) window.showView('recipeDetail');
}

function renderRecipeDetail(r) {
    const container = document.getElementById('recipeDetailContent');
    if (!container) return;

    const totalTime = (r.prep_time || 0) + (r.cook_time || 0);
    const steps = r.steps
        ? r.steps.sort((a, b) => a.order_index - b.order_index).map(s => s.text)
        : [];

    const ingredients = r.ingredients
        ? r.ingredients.sort((a, b) => a.order_index - b.order_index)
        : [];

    // --- Format time ---
    function fmtTime(mins) {
        if (!mins) return '';
        if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? mins % 60 + 'min' : ''}`;
        return `${mins} min`;
    }

    // --- Hero image ---
    const heroHtml = r.image_url
        ? `<div class="relative rounded-2xl overflow-hidden mb-8 shadow-lg">
            <img src="${r.image_url}" class="w-full h-64 md:h-80 object-cover" alt="${r.title}">
            ${r.source_type === 'imported' ? `
                <div class="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1">
                    <i class="ph-bold ph-globe"></i> Imported
                </div>` : ''}
           </div>`
        : '';

    // --- Meta badges ---
    const metaItems = [];
    if (totalTime) metaItems.push(`<span class="flex items-center gap-1.5"><i class="ph-bold ph-clock text-orange-500"></i> ${fmtTime(totalTime)}</span>`);
    if (r.servings) metaItems.push(`<span class="flex items-center gap-1.5"><i class="ph-bold ph-users text-orange-500"></i> ${r.servings} servings</span>`);
    if (r.prep_time) metaItems.push(`<span class="flex items-center gap-1.5"><i class="ph-bold ph-knife text-orange-500"></i> Prep: ${fmtTime(r.prep_time)}</span>`);
    if (r.cook_time) metaItems.push(`<span class="flex items-center gap-1.5"><i class="ph-bold ph-fire text-orange-500"></i> Cook: ${fmtTime(r.cook_time)}</span>`);

    // --- Rating ---
    const ratingHtml = r.rating > 0
        ? `<div class="flex items-center gap-0.5">
            ${Array(5).fill(0).map((_, i) =>
                `<i class="ph-fill ph-star text-lg ${i < r.rating ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}"></i>`
            ).join('')}
           </div>`
        : '';

    // --- Categories & Tags ---
    const categoriesHtml = r.categories && r.categories.length > 0
        ? r.categories.map(c => `<span class="inline-block text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg font-medium">${c.name}</span>`).join(' ')
        : '';

    const tagsHtml = r.tags && r.tags.length > 0
        ? r.tags.map(t => `<span class="inline-flex items-center text-xs px-3 py-1.5 rounded-full font-medium" style="background-color: ${t.color}20; color: ${t.color}; border: 1px solid ${t.color}40;">#${t.name}</span>`).join(' ')
        : '';

    // --- Ingredients with checkboxes ---
    const ingredientsHtml = ingredients.map((ing, i) => {
        const qty = ing.quantity !== null && ing.quantity !== undefined ? _formatQty(ing.quantity) : '';
        const unit = ing.unit || '';
        const name = ing.name || ing.text || '';
        const note = ing.note ? `<span class="text-gray-400 text-sm ml-1">(${ing.note})</span>` : '';

        return `
            <label class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer transition-colors group" id="ing-check-${i}">
                <input type="checkbox" onchange="toggleIngredientCheck(${i})" class="w-5 h-5 accent-orange-500 rounded shrink-0">
                <span class="group-[.checked]:line-through group-[.checked]:text-gray-400 transition-colors">
                    ${qty ? `<strong class="text-gray-700 dark:text-gray-300">${qty}</strong>` : ''}
                    ${unit ? `<span class="text-gray-500 dark:text-gray-400 text-sm">${unit}</span>` : ''}
                    <span class="text-gray-800 dark:text-gray-200">${name}</span>${note}
                </span>
            </label>`;
    }).join('');

    // --- Steps numbered ---
    const stepsHtml = steps.map((step, i) => `
        <div class="flex gap-4 py-4 ${i < steps.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''}">
            <div class="shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">${i + 1}</div>
            <p class="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">${step}</p>
        </div>
    `).join('');

    // --- Additional images ---
    const additionalImagesHtml = r.images && r.images.length > 0
        ? `<div class="mt-8">
            <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <i class="ph-bold ph-images text-orange-500"></i> Additional photos
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                ${r.images.map(img => `
                    <div class="rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                         onclick="viewRecipeImage('${img.image_url}')">
                        <img src="${img.image_url}" class="w-full h-40 object-cover" alt="${img.caption || ''}">
                        ${img.caption ? `<p class="text-xs text-gray-500 mt-1 text-center italic p-1">${img.caption}</p>` : ''}
                    </div>
                `).join('')}
            </div>
           </div>`
        : '';

    // --- Source URL ---
    const sourceHtml = r.source_url
        ? `<div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
            <a href="${r.source_url}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-2">
                <i class="ph-bold ph-globe"></i> View original recipe
            </a>
           </div>`
        : '';

    container.innerHTML = `
        <!-- Header: Action buttons -->
        <div class="flex items-center justify-between mb-6">
            <button onclick="showView('recipes')" class="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors">
                <i class="ph-bold ph-arrow-left text-xl"></i>
                <span class="text-sm font-medium">Back to Recipes</span>
            </button>
            <div class="flex gap-2">
                ${steps.length > 0 ? `
                <button onclick="startCookingMode(${r.id})" class="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
                    <i class="ph-bold ph-cooking-pot"></i> Cook
                </button>` : ''}
                <button onclick="shareRecipe(${r.id})" class="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
                    <i class="ph-bold ph-share-network"></i> Share
                </button>
                <button onclick="editRecipeFromDetail(${r.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                    <i class="ph-bold ph-pencil-simple"></i> Edit
                </button>
                <button id="detailFavBtn" onclick="toggleFavorite(${r.id}, ${r.is_favorite})" class="p-2 rounded-xl transition-colors ${r.is_favorite ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-orange-500'}">
                    <i class="ph-fill ph-heart text-xl"></i>
                </button>
            </div>
        </div>

        <!-- Title -->
        <h1 class="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-4">${r.title}</h1>

        <!-- Rating + Categories + Tags -->
        <div class="flex flex-wrap items-center gap-3 mb-6">
            ${ratingHtml}
            ${categoriesHtml}
            ${tagsHtml}
        </div>

        <!-- Hero Image -->
        ${heroHtml}

        <!-- Meta badges -->
        ${metaItems.length > 0 ? `
        <div class="flex flex-wrap gap-4 mb-8 text-sm text-gray-600 dark:text-gray-400">
            ${metaItems.join('')}
        </div>` : ''}

        <!-- Grid: Ingredients + Steps -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <!-- Ingredients -->
            <div class="lg:col-span-1">
                <div class="bg-orange-50 dark:bg-orange-900/10 rounded-2xl p-5 border border-orange-200 dark:border-orange-800/30 sticky top-4">
                    <h2 class="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i class="ph-bold ph-list text-orange-500"></i> Ingredients
                        ${ingredients.length > 0 ? `<span class="text-xs text-gray-400 font-normal">(${ingredients.length})</span>` : ''}
                    </h2>
                    <div class="divide-y divide-orange-200/50 dark:divide-orange-800/20">
                        ${ingredientsHtml || '<p class="text-sm text-gray-400 py-2">No ingredients</p>'}
                    </div>
                </div>
            </div>

            <!-- Steps -->
            <div class="lg:col-span-2">
                <h2 class="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <i class="ph-bold ph-list-numbers text-orange-500"></i> Instructions
                    ${steps.length > 0 ? `<span class="text-xs text-gray-400 font-normal">(${steps.length} steps)</span>` : ''}
                </h2>
                <div>
                    ${stepsHtml || '<p class="text-sm text-gray-400 py-2">No instructions</p>'}
                </div>
            </div>
        </div>

        <!-- Source -->
        ${sourceHtml}

        <!-- Additional images -->
        ${additionalImagesHtml}

        <!-- Linked memories -->
        <div id="recipeMemoriesSection" class="hidden mt-8"></div>
    `;

    // Load linked memories
    if (loadRecipeMemories) loadRecipeMemories(r.id);
}

function _formatQty(q) {
    if (q === null || q === undefined) return '';
    if (Number.isInteger(q)) return String(q);
    // Common fractions
    const frac = q % 1;
    const whole = Math.floor(q);
    const fractions = { 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.67: '⅔', 0.75: '¾' };
    for (const [val, sym] of Object.entries(fractions)) {
        if (Math.abs(frac - parseFloat(val)) < 0.05) {
            return whole > 0 ? `${whole} ${sym}` : sym;
        }
    }
    return String(parseFloat(q.toFixed(2)));
}

function toggleIngredientCheck(index) {
    const label = document.getElementById(`ing-check-${index}`);
    if (label) label.classList.toggle('checked');
}

function viewRecipeImage(imageUrl) {
    const viewer = document.createElement('div');
    viewer.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center cursor-pointer';
    viewer.onclick = () => viewer.remove();
    viewer.innerHTML = `<img src="${imageUrl}" class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl">`;
    document.body.appendChild(viewer);
}


// ============ COOKING MODE ============

let cookingSteps = [];
let cookingIngredients = [];
let cookingCurrentStep = 0;
let cookingTimerInterval = null;
let cookingTimerSeconds = 0;
let wakeLock = null;

function startCookingMode(recipeId) {
    const recipe = state.allRecipes.find(r => r.id === recipeId) || state.currentRecipe;
    if (!recipe) return;

    cookingSteps = recipe.steps
        ? recipe.steps.sort((a, b) => a.order_index - b.order_index).map(s => s.text)
        : [];

    if (!cookingSteps.length) return;

    cookingIngredients = recipe.ingredients
        ? recipe.ingredients.sort((a, b) => a.order_index - b.order_index)
        : [];

    cookingCurrentStep = 0;

    // Set title
    document.getElementById('cookingRecipeTitle').textContent = recipe.title;

    // Build ingredients list
    const ingList = document.getElementById('cookingIngredientsList');
    ingList.innerHTML = cookingIngredients.map(ing => {
        const qty = ing.quantity ? _formatQty(ing.quantity) : '';
        const unit = ing.unit || '';
        const name = ing.name || ing.text || '';
        return `<div class="text-gray-300 text-sm py-1.5 border-b border-gray-700/50">
            ${qty ? `<strong class="text-white">${qty}</strong> ` : ''}${unit ? `<span class="text-gray-400">${unit}</span> ` : ''}${name}
        </div>`;
    }).join('');

    // Build dots
    const dots = document.getElementById('cookingDots');
    dots.innerHTML = cookingSteps.map((_, i) =>
        `<div class="w-2.5 h-2.5 rounded-full transition-all ${i === 0 ? 'bg-orange-500 scale-125' : 'bg-gray-600'}" id="cookingDot-${i}"></div>`
    ).join('');

    // Show overlay
    document.getElementById('cookingModeOverlay').classList.remove('hidden');
    document.getElementById('cookingIngredientsPanel').classList.remove('hidden');

    // Request Wake Lock
    requestWakeLock();

    // Render first step
    renderCookingStep();
}

function closeCookingMode() {
    document.getElementById('cookingModeOverlay').classList.add('hidden');
    stopCookingTimer();
    releaseWakeLock();
}

function renderCookingStep() {
    const step = cookingSteps[cookingCurrentStep];
    const total = cookingSteps.length;

    document.getElementById('cookingStepLabel').textContent = `Step ${cookingCurrentStep + 1} of ${total}`;
    document.getElementById('cookingStepText').textContent = step;

    // Progress
    const pct = ((cookingCurrentStep + 1) / total) * 100;
    document.getElementById('cookingProgress').style.width = `${pct}%`;

    // Update dots
    for (let i = 0; i < total; i++) {
        const dot = document.getElementById(`cookingDot-${i}`);
        if (dot) {
            dot.className = `w-2.5 h-2.5 rounded-full transition-all ${i === cookingCurrentStep ? 'bg-orange-500 scale-125' : i < cookingCurrentStep ? 'bg-orange-400/50' : 'bg-gray-600'}`;
        }
    }

    // Prev/Next buttons
    document.getElementById('cookingBtnPrev').style.visibility = cookingCurrentStep === 0 ? 'hidden' : 'visible';
    const nextBtn = document.getElementById('cookingBtnNext');
    if (cookingCurrentStep === total - 1) {
        nextBtn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Done!';
        nextBtn.onclick = () => closeCookingMode();
    } else {
        nextBtn.innerHTML = 'Next <i class="ph-bold ph-arrow-right"></i>';
        nextBtn.onclick = () => cookingNextStep();
    }

    // Timer: detect minutes in step text
    stopCookingTimer();
    const timerDiv = document.getElementById('cookingTimer');
    const minMatch = step.match(/(\d+)\s*min/i);
    if (minMatch) {
        cookingTimerSeconds = parseInt(minMatch[1]) * 60;
        document.getElementById('cookingTimerLabel').textContent = `Timer: ${minMatch[1]} min`;
        timerDiv.classList.remove('hidden');
        document.getElementById('cookingTimerBtn').disabled = false;
        document.getElementById('cookingTimerBtn').className = 'bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors';
    } else {
        timerDiv.classList.add('hidden');
    }
}

function cookingNextStep() {
    if (cookingCurrentStep < cookingSteps.length - 1) {
        cookingCurrentStep++;
        renderCookingStep();
    }
}

function cookingPrevStep() {
    if (cookingCurrentStep > 0) {
        cookingCurrentStep--;
        renderCookingStep();
    }
}

function toggleCookingIngredients() {
    document.getElementById('cookingIngredientsPanel').classList.toggle('hidden');
}

// --- Timer ---
function startCookingTimer() {
    if (cookingTimerInterval) {
        // Already running — stop
        stopCookingTimer();
        return;
    }

    let remaining = cookingTimerSeconds;
    const btn = document.getElementById('cookingTimerBtn');
    const label = document.getElementById('cookingTimerLabel');

    function updateLabel() {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        label.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

    updateLabel();
    btn.className = 'bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors animate-pulse';

    cookingTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            stopCookingTimer();
            label.textContent = "Time's up!";
            btn.className = 'bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2';
            // Sound notification
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 880;
                osc.connect(ctx.destination);
                osc.start();
                setTimeout(() => osc.stop(), 300);
                setTimeout(() => {
                    const osc2 = ctx.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.value = 880;
                    osc2.connect(ctx.destination);
                    osc2.start();
                    setTimeout(() => osc2.stop(), 300);
                }, 400);
            } catch (e) {}
        } else {
            updateLabel();
        }
    }, 1000);
}

function stopCookingTimer() {
    if (cookingTimerInterval) {
        clearInterval(cookingTimerInterval);
        cookingTimerInterval = null;
    }
}

// --- Wake Lock ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (e) { console.warn('Wake Lock not available:', e); }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}


// ============ SHARE INDIVIDUAL RECIPE ============

async function shareRecipe(recipeId) {
    const recipe = state.allRecipes.find(r => r.id === recipeId) || state.currentRecipe;
    if (!recipe) return;

    // Create toast with sharing options
    const existing = document.getElementById('shareRecipeToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'shareRecipeToast';
    toast.className = 'fixed inset-0 bg-black/50 z-[70] flex items-end md:items-center justify-center p-4';
    toast.onclick = (e) => { if (e.target === toast) toast.remove(); };

    toast.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div class="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex justify-between items-center">
                <h3 class="text-white font-bold flex items-center gap-2">
                    <i class="ph-bold ph-share-network"></i> Share recipe
                </h3>
                <button onclick="document.getElementById('shareRecipeToast').remove()" class="text-white hover:bg-white/20 p-1 rounded-lg">
                    <i class="ph-bold ph-x text-xl"></i>
                </button>
            </div>
            <div class="p-5">
                <!-- Public link -->
                <div id="shareRecipeLinkSection" class="mb-5">
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Generate a public link to share this recipe:</p>
                    <div id="shareRecipeLinkEmpty">
                        <button onclick="generateRecipeShareLink(${recipeId})" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                            <i class="ph-bold ph-link"></i> Generate public link
                        </button>
                    </div>
                    <div id="shareRecipeLinkExists" class="hidden">
                        <div class="flex gap-2">
                            <input id="shareRecipeLinkUrl" readonly class="flex-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-300">
                            <button onclick="copyRecipeShareLink()" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                                <i class="ph-bold ph-copy"></i>
                            </button>
                            <button onclick="deleteRecipeShareLink(${recipeId})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors" title="Delete link">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Social media -->
                <div class="flex justify-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button onclick="shareRecipeTo('whatsapp', ${recipeId})" class="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors" title="WhatsApp">
                        <i class="ph-bold ph-whatsapp-logo text-lg"></i>
                    </button>
                    <button onclick="shareRecipeTo('telegram', ${recipeId})" class="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors" title="Telegram">
                        <i class="ph-bold ph-telegram-logo text-lg"></i>
                    </button>
                    <button onclick="shareRecipeTo('twitter', ${recipeId})" class="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center transition-colors" title="X / Twitter">
                        <i class="ph-bold ph-x-logo text-lg"></i>
                    </button>
                    <button onclick="shareRecipeTo('facebook', ${recipeId})" class="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors" title="Facebook">
                        <i class="ph-bold ph-facebook-logo text-lg"></i>
                    </button>
                    <button onclick="shareRecipeTo('instagram', ${recipeId})" class="w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);" title="Instagram">
                        <i class="ph-bold ph-instagram-logo text-lg"></i>
                    </button>
                </div>
            </div>
            <div class="px-5 pb-4 text-center">
                <p class="text-xs text-gray-400">Shared Intentionally · <span class="text-orange-500 font-bold">Zest</span></p>
            </div>
        </div>
    `;

    document.body.appendChild(toast);

    // Check if recipe already has a share link
    try {
        const res = await authFetch(`${state.API_URL}/recipes/${recipeId}/share-link`);
        if (res.ok) {
            const data = await res.json();
            if (data.token) {
                const url = `${window.location.origin}/shared/recipe/${data.token}`;
                document.getElementById('shareRecipeLinkUrl').value = url;
                document.getElementById('shareRecipeLinkUrl').dataset.linkId = data.id;
                document.getElementById('shareRecipeLinkEmpty').classList.add('hidden');
                document.getElementById('shareRecipeLinkExists').classList.remove('hidden');
            }
        }
    } catch (e) { /* no existing link */ }
}

async function generateRecipeShareLink(recipeId) {
    try {
        const res = await authFetch(`${state.API_URL}/recipes/${recipeId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            const data = await res.json();
            const url = `${window.location.origin}/shared/recipe/${data.token}`;
            document.getElementById('shareRecipeLinkUrl').value = url;
            document.getElementById('shareRecipeLinkUrl').dataset.linkId = data.id;
            document.getElementById('shareRecipeLinkEmpty').classList.add('hidden');
            document.getElementById('shareRecipeLinkExists').classList.remove('hidden');
        }
    } catch (e) {
        console.error('Error generating link:', e);
    }
}

async function deleteRecipeShareLink(recipeId) {
    const linkId = document.getElementById('shareRecipeLinkUrl')?.dataset.linkId;
    if (!linkId) return;
    try {
        const res = await authFetch(`${state.API_URL}/share/${linkId}`, { method: 'DELETE' });
        if (res.ok) {
            document.getElementById('shareRecipeLinkUrl').value = '';
            document.getElementById('shareRecipeLinkUrl').dataset.linkId = '';
            document.getElementById('shareRecipeLinkExists').classList.add('hidden');
            document.getElementById('shareRecipeLinkEmpty').classList.remove('hidden');
        }
    } catch (e) {
        console.error('Error deleting link:', e);
    }
}

async function copyRecipeShareLink() {
    const url = document.getElementById('shareRecipeLinkUrl').value;
    try {
        await navigator.clipboard.writeText(url);
        const btn = document.querySelector('#shareRecipeLinkExists button');
        if (btn) {
            btn.innerHTML = '<i class="ph-bold ph-check text-green-300"></i>';
            setTimeout(() => { btn.innerHTML = '<i class="ph-bold ph-copy"></i>'; }, 1500);
        }
    } catch (e) {}
}

function shareRecipeTo(platform, recipeId) {
    const recipe = state.allRecipes.find(r => r.id === recipeId) || state.currentRecipe;
    const title = recipe ? recipe.title : '';
    const shareUrl = document.getElementById('shareRecipeLinkUrl')?.value || '';
    const textWithUrl = `${title} — Shared with Zest${shareUrl ? ' ' + shareUrl : ''}`;
    const encodedText = encodeURIComponent(textWithUrl);
    const encodedUrl = encodeURIComponent(shareUrl);

    const urls = {
        whatsapp: `https://wa.me/?text=${encodedText}`,
        telegram: shareUrl
            ? `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title + ' — Shared with Zest')}`
            : `https://t.me/share/url?text=${encodedText}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
        facebook: shareUrl
            ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(title + ' — Shared with Zest')}`
            : `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`,
        instagram: null, // No direct URL scheme — use Web Share API or copy
    };

    if (platform === 'instagram') {
        // Instagram doesn't support URL-based sharing from desktop
        if (navigator.share) {
            navigator.share({ title: title, text: textWithUrl, url: shareUrl || undefined }).catch(() => {});
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(textWithUrl).then(() => {
                _showToast ? _showToast('Copied! Paste it in Instagram') : alert('Copied to clipboard — paste it in Instagram');
            }).catch(() => {});
        }
        return;
    }

    if (urls[platform]) window.open(urls[platform], '_blank');
}


// ============ EDIT FROM DETAIL ============

function editRecipeFromDetail(recipeId) {
    const recipe = state.allRecipes.find(r => r.id === recipeId) || state.currentRecipe;
    if (!recipe) return;
    // Open modal in reading mode, then enable editing
    if (window.openModal) {
        window.openModal(false, recipe);
        // Small delay so modal renders then activate editing
        setTimeout(() => {
            if (window.enableEditMode) window.enableEditMode();
        }, 100);
    }
}


// ============ UPDATE FAVORITE IN DETAIL VIEW ============

function updateDetailFavoriteButton(recipeId, isFavorite) {
    const btn = document.getElementById('detailFavBtn');
    if (!btn) return;
    btn.className = `p-2 rounded-xl transition-colors ${isFavorite ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-orange-500'}`;
    btn.setAttribute('onclick', `toggleFavorite(${recipeId}, ${isFavorite})`);
}


// ============ WINDOW EXPOSURE ============

window.openRecipeDetail = openRecipeDetail;
window.updateDetailFavoriteButton = updateDetailFavoriteButton;
window.editRecipeFromDetail = editRecipeFromDetail;
window.toggleIngredientCheck = toggleIngredientCheck;
window.viewRecipeImage = viewRecipeImage;

// Cooking mode
window.startCookingMode = startCookingMode;
window.closeCookingMode = closeCookingMode;
window.cookingNextStep = cookingNextStep;
window.cookingPrevStep = cookingPrevStep;
window.toggleCookingIngredients = toggleCookingIngredients;
window.startCookingTimer = startCookingTimer;

// Share
window.shareRecipe = shareRecipe;
window.generateRecipeShareLink = generateRecipeShareLink;
window.copyRecipeShareLink = copyRecipeShareLink;
window.deleteRecipeShareLink = deleteRecipeShareLink;
window.shareRecipeTo = shareRecipeTo;

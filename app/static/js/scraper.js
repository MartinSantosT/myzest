// ============================================
// SCRAPER.JS — URL Recipe Scraping (Frontend)
// ============================================

import * as state from './state.js';
import { authFetch, authHeaders } from './api.js';

// --- Scraper state ---
let scrapedData = null;   // holds the preview data from the backend

// ============================================
// SCRAPE FROM URL
// ============================================

export async function scrapeFromUrl() {
    const input = document.getElementById('scraperUrlInput');
    const url = input.value.trim();

    if (!url) {
        input.focus();
        return;
    }

    // Validate URL-ish
    if (!url.match(/^https?:\/\/.+\..+/i) && !url.match(/^.+\..+/i)) {
        showScraperError('Please enter a valid URL (e.g., https://www.example.com/recipe)');
        return;
    }

    // Reset states
    hideAllScraperStates();
    document.getElementById('scraperLoading').classList.remove('hidden');
    document.getElementById('scraperBtn').disabled = true;
    document.getElementById('scraperBtn').innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Searching...';

    try {
        const resp = await authFetch(`${state.API_URL}/recipes/scrape`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ url })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(err.detail || `HTTP Error ${resp.status}`);
        }

        const data = await resp.json();

        if (!data.success) {
            throw new Error(data.error || 'Could not extract recipe');
        }

        scrapedData = data;
        showScraperPreview(data);

    } catch (err) {
        showScraperError(err.message);
    } finally {
        document.getElementById('scraperBtn').disabled = false;
        document.getElementById('scraperBtn').innerHTML = '<i class="ph-bold ph-magnifying-glass"></i> Search Recipe';
        document.getElementById('scraperLoading').classList.add('hidden');
    }
}


// ============================================
// SHOW PREVIEW
// ============================================

function showScraperPreview(data) {
    hideAllScraperStates();
    const recipe = data.recipe;

    // Fill fields
    document.getElementById('scraperTitle').value = recipe.title || '';
    document.getElementById('scraperDescription').value = recipe.description || '';
    document.getElementById('scraperServings').value = recipe.servings || '';
    document.getElementById('scraperPrepTime').value = recipe.prep_time || 0;
    document.getElementById('scraperCookTime').value = recipe.cook_time || 0;

    // Image
    const imgContainer = document.getElementById('scraperImageContainer');
    const imgEl = document.getElementById('scraperPreviewImage');
    if (recipe.image_url) {
        imgEl.src = recipe.image_url;
        imgContainer.classList.remove('hidden');
    } else {
        imgContainer.classList.add('hidden');
    }

    // Scraping method badge
    document.getElementById('scraperMethod').textContent = data.method || '';

    // Ingredients
    const ingList = document.getElementById('scraperIngredientsList');
    const ingredients = recipe.ingredients || [];
    document.getElementById('scraperIngCount').textContent = `(${ingredients.length})`;

    if (ingredients.length) {
        ingList.innerHTML = ingredients.map((ing, i) => `
            <div class="flex items-center px-4 py-2.5 text-sm">
                <span class="w-6 text-gray-400 text-xs font-bold shrink-0">${i + 1}</span>
                <span class="flex-1 text-gray-700 dark:text-gray-300">${escapeHtml(ing.text)}</span>
            </div>
        `).join('');
    } else {
        ingList.innerHTML = '<div class="px-4 py-3 text-sm text-gray-400 text-center">No ingredients found</div>';
    }

    // Steps
    const stepsList = document.getElementById('scraperStepsList');
    const steps = recipe.steps || [];
    document.getElementById('scraperStepCount').textContent = `(${steps.length})`;

    if (steps.length) {
        stepsList.innerHTML = steps.map((step, i) => `
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                <div class="flex items-start gap-3">
                    <span class="bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">${i + 1}</span>
                    <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">${escapeHtml(step.text)}</p>
                </div>
            </div>
        `).join('');
    } else {
        stepsList.innerHTML = '<div class="text-sm text-gray-400 text-center py-3">No steps found</div>';
    }

    // Source link
    const sourceLink = document.getElementById('scraperSourceLink');
    sourceLink.href = recipe.source_url || '#';
    sourceLink.textContent = recipe.source_url || '';

    document.getElementById('scraperPreview').classList.remove('hidden');
}


// ============================================
// IMPORT SCRAPED RECIPE
// ============================================

export async function importScrapedRecipe() {
    if (!scrapedData) return;

    const btn = document.getElementById('scraperImportBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Importing...';

    try {
        // Get user-edited values from the preview fields
        const title = document.getElementById('scraperTitle').value.trim() || scrapedData.recipe.title;
        const description = document.getElementById('scraperDescription').value.trim();
        const servings = parseInt(document.getElementById('scraperServings').value) || null;
        const prepTime = parseInt(document.getElementById('scraperPrepTime').value) || 0;
        const cookTime = parseInt(document.getElementById('scraperCookTime').value) || 0;

        // Get the "Imported from Web" category ID
        const importedCatId = await getOrCreateImportedCategory();

        // Build recipe payload matching RecipeCreate schema
        const payload = {
            title,
            description,
            servings,
            prep_time: prepTime,
            cook_time: cookTime,
            rating: 0,
            image_url: scrapedData.recipe.image_url || '',
            source_url: scrapedData.recipe.source_url || '',
            source_type: 'imported',
            is_favorite: false,
            ingredients: (scrapedData.recipe.ingredients || []).map((ing, i) => ({
                text: ing.text,
                order_index: i,
                note: ''
            })),
            steps: (scrapedData.recipe.steps || []).map((step, i) => ({
                text: step.text,
                order_index: i
            })),
            category_ids: importedCatId ? [importedCatId] : [],
            tag_ids: []
        };

        const resp = await authFetch(`${state.API_URL}/recipes/`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: 'Save error' }));
            throw new Error(err.detail || 'Error saving recipe');
        }

        // Success!
        hideAllScraperStates();
        document.getElementById('scraperSuccess').classList.remove('hidden');

        // Reload recipes in background
        if (window.loadRecipes) window.loadRecipes();

    } catch (err) {
        alert('Import error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-download-simple"></i> Import to My Recipes';
    }
}


// ============================================
// HELPERS
// ============================================

async function getOrCreateImportedCategory() {
    try {
        // First check if it already exists in loaded categories
        const existing = state.allCategories.find(c => c.name === 'Imported from Web');
        if (existing) return existing.id;

        // Otherwise create it
        const resp = await authFetch(`${state.API_URL}/categories/`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ name: 'Imported from Web' })
        });

        if (resp.ok) {
            const cat = await resp.json();
            return cat.id;
        }
    } catch (e) {
        console.warn('Could not get/create imported category:', e);
    }
    return null;
}


function showScraperError(message) {
    hideAllScraperStates();
    document.getElementById('scraperErrorText').textContent = message;
    document.getElementById('scraperError').classList.remove('hidden');
}

function hideAllScraperStates() {
    document.getElementById('scraperLoading').classList.add('hidden');
    document.getElementById('scraperError').classList.add('hidden');
    document.getElementById('scraperPreview').classList.add('hidden');
    document.getElementById('scraperSuccess').classList.add('hidden');
}

export function resetScraper() {
    scrapedData = null;
    document.getElementById('scraperUrlInput').value = '';
    hideAllScraperStates();
    document.getElementById('scraperUrlInput').focus();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}


// --- Window Exposure ---
window.scrapeFromUrl = scrapeFromUrl;
window.importScrapedRecipe = importScrapedRecipe;
window.resetScraper = resetScraper;

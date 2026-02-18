// ============================================
// RECIPES.JS — Recipe CRUD, Modal Logic
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';
import { displayRating } from './rating.js';
import { loadRecipeCategories, clearSelectedCategories, hideCategoryDropdown } from './categories.js';
import { loadRecipeTags, clearSelectedTags } from './tags.js';
import { addIngredientRow, populateIngredientRows, getIngredientsFromRows, renderIngredientsReadView } from './ingredients.js';
import { applyFilters, updateStats, loadRecipes } from './recipeFilters.js';

export function openModal(isNew = false, r = null) {
    const modal = document.getElementById('recipeModal');
    const form = document.getElementById('recipeForm');

    form.reset();
    disableEditMode();

    if (isNew) {
        enableEditMode();
        document.getElementById('modalTitle').innerText = 'Create New Recipe';
        document.getElementById('recipeId').value = '';
        document.getElementById('recipeSourceInfo').classList.add('hidden');

        clearSelectedCategories();

        document.getElementById('inputRating').value = 0;
        displayRating(0);

        clearSelectedTags();

        document.getElementById('ingredientRows').innerHTML = '';
        addIngredientRow();
        document.getElementById('ingredientsReadView').classList.add('hidden');
        document.getElementById('ingredientsEditView').classList.remove('hidden');

        updateImagePreview();
    } else {
        document.getElementById('modalTitle').innerText = 'Read Mode';
        document.getElementById('recipeId').value = r.id;
        document.getElementById('inputTitle').value = r.title;
        document.getElementById('inputTime').value = r.prep_time || 0;
        document.getElementById('inputCookTime').value = r.cook_time || 0;
        document.getElementById('inputServings').value = r.servings;
        updateTotalTime();
        document.getElementById('inputImage').value = r.image_url || '';
        document.getElementById('inputRating').value = r.rating || 0;
        displayRating(r.rating || 0);

        loadRecipeTags(r);
        loadRecipeCategories(r);

        const stepText = r.steps ? r.steps.map(s => s.text).join('\n') : '';

        renderIngredientsReadView(r.ingredients);
        populateIngredientRows(r.ingredients);
        document.getElementById('ingredientsReadView').classList.remove('hidden');
        document.getElementById('ingredientsEditView').classList.add('hidden');

        document.getElementById('inputSteps').value = stepText;
        updateImagePreview();

        // Show source URL for imported recipes
        const sourceInfo = document.getElementById('recipeSourceInfo');
        if (r.source_url && r.source_type === 'imported') {
            document.getElementById('recipeSourceUrl').href = r.source_url;
            document.getElementById('recipeSourceUrl').textContent = r.source_url;
            sourceInfo.classList.remove('hidden');
        } else {
            sourceInfo.classList.add('hidden');
        }
    }

    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('modalContent').classList.remove('scale-95'); }, 10);
}

export function enableEditMode() {
    document.querySelectorAll('#recipeForm input, #recipeForm textarea, #recipeForm select').forEach(el => {
        el.disabled = false;
        el.classList.add('editing-mode');
    });

    document.querySelectorAll('.rating-star').forEach(star => {
        star.disabled = false;
        star.classList.remove('cursor-not-allowed');
        star.classList.add('hover:text-orange-500', 'cursor-pointer');
    });

    document.getElementById('newTagInput').disabled = false;
    document.getElementById('newTagColor').disabled = false;
    document.querySelectorAll('.tag-available').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });

    const catSearch = document.getElementById('categorySearchInput');
    catSearch.disabled = false;
    catSearch.addEventListener('blur', hideCategoryDropdown);

    document.getElementById('btnEdit').classList.add('hidden');
    document.getElementById('btnSave').classList.remove('hidden');
    document.getElementById('uploadOverlay').classList.remove('hidden');
    document.getElementById('urlInputContainer').classList.remove('hidden');

    const recipeId = document.getElementById('recipeId').value;
    if (recipeId) {
        document.getElementById('btnDelete').classList.remove('hidden');
    }
    document.getElementById('modalTitle').innerText = 'Editing...';
    document.getElementById('modalTitleIcon').innerHTML = '<i class="ph-duotone ph-pencil-simple text-white"></i>';

    document.getElementById('ingredientsReadView').classList.add('hidden');
    document.getElementById('ingredientsEditView').classList.remove('hidden');
}

export function disableEditMode() {
    document.querySelectorAll('#recipeForm input, #recipeForm textarea, #recipeForm select').forEach(el => {
        el.disabled = true;
        el.classList.remove('editing-mode');
    });

    document.querySelectorAll('.rating-star').forEach(star => {
        star.disabled = true;
        star.classList.add('cursor-not-allowed');
        star.classList.remove('hover:text-orange-500', 'cursor-pointer');
    });

    document.getElementById('newTagInput').disabled = true;
    document.getElementById('newTagColor').disabled = true;
    document.querySelectorAll('.tag-available').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });

    const catSearch = document.getElementById('categorySearchInput');
    catSearch.disabled = true;
    catSearch.value = '';
    document.getElementById('categoryDropdown').classList.add('hidden');

    document.getElementById('btnEdit').classList.remove('hidden');
    document.getElementById('btnSave').classList.add('hidden');
    document.getElementById('btnDelete').classList.add('hidden');
    document.getElementById('uploadOverlay').classList.add('hidden');
    document.getElementById('urlInputContainer').classList.add('hidden');
    document.getElementById('modalTitleIcon').innerHTML = '<i class="ph-duotone ph-lock-key text-white"></i>';

    document.getElementById('ingredientsReadView').classList.remove('hidden');
    document.getElementById('ingredientsEditView').classList.add('hidden');
}

export async function saveRecipe() {
    const id = document.getElementById('recipeId').value;
    const btn = document.getElementById('btnSave');

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph-duotone ph-spinner animate-spin"></i> Saving...';
    btn.disabled = true;

    // Preserve source_url and source_type from original recipe (if editing)
    const currentRecipe = id ? state.allRecipes.find(r => r.id == id) : null;

    const payload = {
        title: document.getElementById('inputTitle').value,
        description: "",
        prep_time: parseInt(document.getElementById('inputTime').value) || 0,
        cook_time: parseInt(document.getElementById('inputCookTime').value) || 0,
        servings: parseInt(document.getElementById('inputServings').value) || null,
        rating: parseInt(document.getElementById('inputRating').value) || 0,
        image_url: document.getElementById('inputImage').value,
        source_url: currentRecipe?.source_url || "",
        source_type: currentRecipe?.source_type || "original",
        category_ids: state.selectedCategories,
        tag_ids: state.selectedTags,
        ingredients: getIngredientsFromRows(),
        steps: document.getElementById('inputSteps').value.split('\n').filter(l => l.trim()).map((t,i) => ({text:t, order_index:i}))
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${state.API_URL}/recipes/${id}` : `${state.API_URL}/recipes/`;

    try {
        const res = await authFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            closeModal();
            await loadRecipes();
            // Refresh recipe detail view if active
            if (state.currentView === 'recipeDetail' && id) {
                if (window.openRecipeDetail) window.openRecipeDetail(parseInt(id));
            }
        } else {
            const err = await res.json();
            alert("Error saving: " + (err.detail || "Check the console"));
        }
    } catch (e) {
        console.error(e);
        alert("Connection error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

export async function handleFileUpload(input) {
    if (input.files && input.files[0]) {
        const formData = new FormData();
        formData.append('file', input.files[0]);
        try {
            const res = await authFetch(`${state.API_URL}/upload/`, { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                document.getElementById('inputImage').value = data.url;
                updateImagePreview();
            }
        } catch (e) { alert("Error uploading image"); }
    }
}

export function closeModal() {
    const modal = document.getElementById('recipeModal');
    modal.classList.add('opacity-0');
    document.getElementById('modalContent').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

export function updateImagePreview() {
    const url = document.getElementById('inputImage').value;
    const img = document.getElementById('imagePreview');
    const ph = document.getElementById('imagePlaceholder');
    if(url) { img.src = url; img.classList.remove('hidden'); ph.classList.add('hidden'); }
    else { img.classList.add('hidden'); ph.classList.remove('hidden'); }
}

export async function toggleFavorite(recipeId, currentState) {
    try {
        const res = await authFetch(`${state.API_URL}/recipes/${recipeId}/favorite`, {
            method: 'PATCH'
        });

        if (res.ok) {
            const data = await res.json();
            const recipe = state.allRecipes.find(r => r.id === recipeId);
            if (recipe) {
                recipe.is_favorite = data.is_favorite;
            }
            if (state.currentRecipe && state.currentRecipe.id === recipeId) {
                state.setCurrentRecipe({ ...state.currentRecipe, is_favorite: data.is_favorite });
            }
            applyFilters();
            updateStats();
            if (window.updateDetailFavoriteButton) {
                window.updateDetailFavoriteButton(recipeId, data.is_favorite);
            }
        } else {
            alert('Error updating favorite');
        }
    } catch (e) {
        console.error('Error:', e);
        alert('Connection error');
    }
}

export async function confirmDelete() {
    const id = document.getElementById('recipeId').value;
    if (!id) return alert("No recipe to delete");

    const title = document.getElementById('inputTitle').value || 'this recipe';

    if (!confirm(`Delete "${title}"?\n\nThis action cannot be undone.`)) return;
    if (!confirm(`⚠️ CONFIRM: Do you really want to permanently delete "${title}"?`)) return;

    try {
        const res = await authFetch(`${state.API_URL}/recipes/${id}`, { method: 'DELETE' });
        if (res.ok) {
            closeModal();
            loadRecipes();
        } else {
            alert("Error deleting recipe");
        }
    } catch (e) {
        console.error(e);
        alert("Connection error");
    }
}

export function updateTotalTime() {
    const prep = parseInt(document.getElementById('inputTime').value) || 0;
    const cook = parseInt(document.getElementById('inputCookTime').value) || 0;
    const total = prep + cook;
    const display = document.getElementById('totalTimeDisplay');
    if (total >= 60) {
        const h = Math.floor(total / 60);
        const m = total % 60;
        display.textContent = m > 0 ? `${h}h ${m}m` : `${h}h`;
    } else {
        display.textContent = `${total} min`;
    }
}

// --- Window Exposure ---
window.openModal = openModal;
window.enableEditMode = enableEditMode;
window.saveRecipe = saveRecipe;
window.handleFileUpload = handleFileUpload;
window.closeModal = closeModal;
window.updateImagePreview = updateImagePreview;
window.updateTotalTime = updateTotalTime;
window.toggleFavorite = toggleFavorite;
window.confirmDelete = confirmDelete;

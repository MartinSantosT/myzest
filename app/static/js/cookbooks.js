// ============================================
// COOKBOOKS.JS — Cookbook CRUD & Detail View
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';

export async function loadCookbooks() {
    try {
        const res = await authFetch(`${state.API_URL}/cookbooks/`);
        if (res.ok) {
            state.setAllCookbooks(await res.json());
            renderCookbooks();
        }
    } catch (e) { console.error('Error loading cookbooks:', e); }
}

function renderCookbooks() {
    const grid = document.getElementById('cookbooksGrid');
    const empty = document.getElementById('cookbooksEmpty');

    if (!state.allCookbooks.length) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    empty.classList.add('hidden');

    grid.innerHTML = state.allCookbooks.map(cb => {
        const recipeCount = cb.recipes ? cb.recipes.length : 0;
        const previewImgs = (cb.recipes || [])
            .filter(r => r.image_url)
            .slice(0, 3)
            .map(r => r.image_url);

        const coverHtml = cb.cover_image_url
            ? `<img src="${state.API_URL}${cb.cover_image_url}" class="w-full h-full object-cover" style="object-position: ${cb.cover_position_1 || '50% 50%'}">`
            : previewImgs.length > 0
                ? `<div class="grid ${previewImgs.length >= 3 ? 'grid-cols-3' : previewImgs.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} h-full">
                    ${previewImgs.map(url => `<img src="${state.API_URL}${url}" class="w-full h-full object-cover">`).join('')}
                   </div>`
                : `<div class="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 flex items-center justify-center">
                    <i class="ph-bold ph-book-open text-5xl text-orange-300 dark:text-orange-700"></i>
                   </div>`;

        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group"
                 onclick="openCookbookDetail(${cb.id})">
                <div class="h-40 overflow-hidden">
                    ${coverHtml}
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-gray-800 dark:text-white group-hover:text-orange-500 transition-colors truncate">${cb.name}</h3>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">${cb.description || 'No description'}</p>
                    <div class="flex items-center justify-between mt-3">
                        <span class="text-xs text-gray-400 flex items-center gap-1">
                            <i class="ph-bold ph-cooking-pot"></i> ${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}
                        </span>
                        <span class="text-xs text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Open <i class="ph-bold ph-arrow-right"></i>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export async function openCookbookDetail(id) {
    try {
        const res = await authFetch(`${state.API_URL}/cookbooks/`);
        if (res.ok) {
            state.setAllCookbooks(await res.json());
            state.setCurrentCookbook(state.allCookbooks.find(cb => cb.id === id));
            if (!state.currentCookbook) return;

            renderCookbookDetail();
            if (window.showView) window.showView('cookbookDetail');
        }
    } catch (e) { console.error(e); }
}

function renderCookbookDetail() {
    const cb = state.currentCookbook;
    if (!cb) return;

    const covers = [];
    if (cb.cover_image_url) covers.push({ url: cb.cover_image_url, pos: cb.cover_position_1 || '50% 50%' });
    if (cb.cover_image_url_2) covers.push({ url: cb.cover_image_url_2, pos: cb.cover_position_2 || '50% 50%' });

    state.setCbDetailSlide(0);
    const headerEl = document.getElementById('cbDetailHeader');

    if (covers.length > 0) {
        const arrowsHtml = covers.length > 1 ? `
            <button onclick="event.stopPropagation(); cbDetailNav(-1)" class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors z-10">
                <i class="ph-bold ph-caret-left text-lg"></i>
            </button>
            <button onclick="event.stopPropagation(); cbDetailNav(1)" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors z-10">
                <i class="ph-bold ph-caret-right text-lg"></i>
            </button>
            <div class="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                ${covers.map((_, i) => `<div class="cbDetailDot w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'} transition-colors"></div>`).join('')}
            </div>
        ` : '';

        headerEl.innerHTML = `
            <div class="relative rounded-2xl overflow-hidden h-56">
                ${covers.map((c, i) => `
                    <img src="${state.API_URL}${c.url}" class="cbDetailSlide absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === 0 ? 'opacity-100' : 'opacity-0'}"
                         style="object-position: ${c.pos}">
                `).join('')}
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                ${arrowsHtml}
                <div class="absolute bottom-0 left-0 right-0 p-6">
                    <h2 class="text-3xl font-black text-white mb-1">${cb.name}</h2>
                    ${cb.description ? `<p class="text-white/80 text-sm">${cb.description}</p>` : ''}
                </div>
            </div>
        `;
    } else {
        headerEl.innerHTML = `
            <div class="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-8 border border-orange-200 dark:border-orange-800/40">
                <h2 class="text-3xl font-black text-gray-800 dark:text-white mb-1">${cb.name}</h2>
                ${cb.description ? `<p class="text-gray-600 dark:text-gray-400 text-sm mt-2">${cb.description}</p>` : ''}
                <p class="text-xs text-gray-400 mt-3 italic">Shared intentionally. 🍊</p>
            </div>
        `;
    }

    // Nota personal del autor
    const noteContainer = document.getElementById('cbDetailNote');
    if (noteContainer) {
        if (cb.note) {
            noteContainer.innerHTML = `
                <div class="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-2xl p-5 mb-4">
                    <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 text-sm">
                        <i class="ph-bold ph-pen-nib text-orange-500"></i> Personal note
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">${cb.note}</p>
                </div>
            `;
            noteContainer.classList.remove('hidden');
        } else {
            noteContainer.classList.add('hidden');
        }
    }

    const recipes = cb.recipes || [];
    document.getElementById('cbDetailRecipeCount').textContent =
        `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`;

    const grid = document.getElementById('cbDetailGrid');
    const empty = document.getElementById('cbDetailEmpty');

    if (!recipes.length) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    empty.classList.add('hidden');

    grid.innerHTML = recipes.map(r => `
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
             onclick="openRecipeDetail(${r.id})">
            ${r.image_url
                ? `<img src="${state.API_URL}${r.image_url}" class="w-full h-36 object-cover">`
                : `<div class="w-full h-36 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center"><i class="ph-bold ph-cooking-pot text-3xl text-orange-300"></i></div>`
            }
            <div class="p-3">
                <h4 class="font-bold text-sm text-gray-800 dark:text-white truncate">${r.title}</h4>
                <div class="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span><i class="ph-bold ph-clock"></i> ${(r.prep_time || 0) + (r.cook_time || 0)} min</span>
                    <span><i class="ph-bold ph-users"></i> ${r.servings}</span>
                    ${r.rating ? `<span class="text-orange-400"><i class="ph-fill ph-star"></i> ${r.rating}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

export function cbDetailNav(dir) {
    const slides = document.querySelectorAll('.cbDetailSlide');
    const dots = document.querySelectorAll('.cbDetailDot');
    if (slides.length < 2) return;

    const newSlide = (state.cbDetailSlide + dir + slides.length) % slides.length;
    state.setCbDetailSlide(newSlide);
    slides.forEach((s, i) => {
        s.style.opacity = i === state.cbDetailSlide ? '1' : '0';
    });
    dots.forEach((d, i) => {
        d.className = `cbDetailDot w-2 h-2 rounded-full ${i === state.cbDetailSlide ? 'bg-white' : 'bg-white/40'} transition-colors`;
    });
}

// --- Cookbook Modal ---
export function openCookbookModal(cookbookId = null) {
    state.setEditingCookbookId(cookbookId);
    state.setSelectedCbRecipes(new Set());

    document.getElementById('cbName').value = '';
    document.getElementById('cbDescription').value = '';
    document.getElementById('cbNote').value = '';
    document.getElementById('cbFeedback').classList.add('hidden');
    resetCbCover(1);
    resetCbCover(2);

    if (cookbookId) {
        const cb = state.allCookbooks.find(c => c.id === cookbookId);
        if (cb) {
            document.getElementById('cookbookModalTitle').textContent = 'Edit Cookbook';
            document.getElementById('cbName').value = cb.name;
            document.getElementById('cbDescription').value = cb.description || '';
            document.getElementById('cbNote').value = cb.note || '';

            if (cb.cover_image_url) setCbCoverFromUrl(1, cb.cover_image_url, cb.cover_position_1 || '50% 50%');
            if (cb.cover_image_url_2) setCbCoverFromUrl(2, cb.cover_image_url_2, cb.cover_position_2 || '50% 50%');

            const selectedSet = new Set();
            (cb.recipes || []).forEach(r => selectedSet.add(r.id));
            state.setSelectedCbRecipes(selectedSet);
            document.getElementById('btnDeleteCookbook').classList.remove('hidden');
        }
    } else {
        document.getElementById('cookbookModalTitle').textContent = 'New Cookbook';
        document.getElementById('btnDeleteCookbook').classList.add('hidden');
    }

    populateCbRecipeList();
    updateCbSelectedCount();

    const modal = document.getElementById('cookbookModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('cookbookModalContent').classList.remove('scale-95');
    }, 10);
}

export function closeCookbookModal() {
    const modal = document.getElementById('cookbookModal');
    modal.classList.add('opacity-0');
    document.getElementById('cookbookModalContent').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function resetCbCover(n) {
    document.getElementById(`cbCoverUrl${n}`).value = '';
    document.getElementById(`cbCoverPos${n}`).value = '50% 50%';
    const img = document.getElementById(`cbCover${n}Img`);
    img.classList.add('hidden');
    img.src = '';
    img.style.objectPosition = '50% 50%';
    document.getElementById(`cbCover${n}Placeholder`).classList.remove('hidden');
    document.getElementById(`cbCover${n}Remove`).classList.add('hidden');
    document.getElementById(`cbCover${n}Change`).classList.add('hidden');
}

function setCbCoverFromUrl(n, url, position) {
    document.getElementById(`cbCoverUrl${n}`).value = url;
    document.getElementById(`cbCoverPos${n}`).value = position || '50% 50%';
    const img = document.getElementById(`cbCover${n}Img`);
    img.src = `${state.API_URL}${url}`;
    img.style.objectPosition = position || '50% 50%';
    img.classList.remove('hidden');
    document.getElementById(`cbCover${n}Placeholder`).classList.add('hidden');
    document.getElementById(`cbCover${n}Remove`).classList.remove('hidden');
    document.getElementById(`cbCover${n}Change`).classList.remove('hidden');
}

export async function uploadCbCover(n, input) {
    if (!input.files || !input.files[0]) return;
    const formData = new FormData();
    formData.append('file', input.files[0]);
    try {
        const oldUrl = document.getElementById(`cbCoverUrl${n}`).value;

        const res = await authFetch(`${state.API_URL}/upload/`, { method: 'POST', body: formData });
        if (res.ok) {
            const data = await res.json();
            setCbCoverFromUrl(n, data.url, '50% 50%');

            if (oldUrl && !state.editingCookbookId) {
                authFetch(`${state.API_URL}/upload/?url=${encodeURIComponent(oldUrl)}`, { method: 'DELETE' }).catch(() => {});
            }
        }
    } catch (e) { console.error(e); }
    input.value = '';
}

export function removeCbCover(n) {
    const url = document.getElementById(`cbCoverUrl${n}`).value;
    if (url && !state.editingCookbookId) {
        authFetch(`${state.API_URL}/upload/?url=${encodeURIComponent(url)}`, { method: 'DELETE' }).catch(() => {});
    }
    resetCbCover(n);
}

export function populateCbRecipeList(filter = '') {
    const container = document.getElementById('cbRecipeList');
    const filtered = state.allRecipes.filter(r =>
        !filter || r.title.toLowerCase().includes(filter.toLowerCase())
    );

    container.innerHTML = filtered.map(r => {
        const checked = state.selectedCbRecipes.has(r.id) ? 'checked' : '';
        const imgHtml = r.image_url
            ? `<img src="${state.API_URL}${r.image_url}" class="w-10 h-10 rounded-lg object-cover shrink-0">`
            : `<div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0"><i class="ph-bold ph-cooking-pot text-orange-400 text-sm"></i></div>`;

        return `
            <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${checked ? 'bg-orange-50 dark:bg-orange-900/10' : ''}">
                <input type="checkbox" ${checked} onchange="toggleCbRecipe(${r.id})"
                    class="w-4 h-4 rounded accent-orange-500 shrink-0">
                ${imgHtml}
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-800 dark:text-white truncate">${r.title}</p>
                    <p class="text-xs text-gray-400">${(r.prep_time || 0) + (r.cook_time || 0)} min · ${r.servings} servings</p>
                </div>
            </label>
        `;
    }).join('');

    if (!filtered.length) {
        container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">No recipes found</p>';
    }
}

export function filterCookbookRecipes() {
    const query = document.getElementById('cbRecipeSearch').value;
    populateCbRecipeList(query);
}

export function toggleCbRecipe(id) {
    const set = new Set(state.selectedCbRecipes);
    if (set.has(id)) {
        set.delete(id);
    } else {
        set.add(id);
    }
    state.setSelectedCbRecipes(set);
    updateCbSelectedCount();
}

function updateCbSelectedCount() {
    document.getElementById('cbSelectedCount').textContent = `(${state.selectedCbRecipes.size} selected)`;
}

function showCbFeedback(msg, isError = false) {
    const el = document.getElementById('cbFeedback');
    el.textContent = msg;
    el.className = `p-3 rounded-xl text-sm text-center ${isError
        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800'
        : 'bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200 dark:border-green-800'}`;
    el.classList.remove('hidden');
}

export async function saveCookbook() {
    const name = document.getElementById('cbName').value.trim();
    if (!name) return showCbFeedback('Name is required', true);

    const payload = {
        name: name,
        description: document.getElementById('cbDescription').value.trim(),
        note: document.getElementById('cbNote').value.trim(),
        cover_image_url: document.getElementById('cbCoverUrl1').value,
        cover_image_url_2: document.getElementById('cbCoverUrl2').value,
        cover_position_1: document.getElementById('cbCoverPos1').value || '50% 50%',
        cover_position_2: document.getElementById('cbCoverPos2').value || '50% 50%',
        recipe_ids: Array.from(state.selectedCbRecipes)
    };

    const btn = document.getElementById('btnSaveCookbook');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const method = state.editingCookbookId ? 'PUT' : 'POST';
        const url = state.editingCookbookId
            ? `${state.API_URL}/cookbooks/${state.editingCookbookId}`
            : `${state.API_URL}/cookbooks/`;

        const res = await authFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeCookbookModal();
            await loadCookbooks();

            if (state.editingCookbookId && state.currentCookbook) {
                state.setCurrentCookbook(state.allCookbooks.find(c => c.id === state.editingCookbookId));
                if (state.currentCookbook) renderCookbookDetail();
            }
        } else {
            const err = await res.json();
            showCbFeedback(err.detail || 'Error saving', true);
        }
    } catch (e) {
        showCbFeedback('Connection error', true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

export function editCurrentCookbook() {
    if (state.currentCookbook) {
        openCookbookModal(state.currentCookbook.id);
    }
}

export async function deleteCurrentCookbook() {
    if (!state.editingCookbookId) return;
    const cb = state.allCookbooks.find(c => c.id === state.editingCookbookId);
    const name = cb ? cb.name : 'this cookbook';

    if (!confirm(`Delete "${name}"? Recipes will NOT be deleted, only the cookbook.`)) return;
    if (!confirm(`⚠️ CONFIRM: Really delete "${name}"?`)) return;

    try {
        const res = await authFetch(`${state.API_URL}/cookbooks/${state.editingCookbookId}`, { method: 'DELETE' });
        if (res.ok) {
            closeCookbookModal();
            state.setCurrentCookbook(null);
            if (window.showView) window.showView('cookbooks');
        }
    } catch (e) { console.error(e); }
}

// --- Window Exposure ---
window.loadCookbooks = loadCookbooks;
window.openCookbookDetail = openCookbookDetail;
window.cbDetailNav = cbDetailNav;
window.openCookbookModal = openCookbookModal;
window.closeCookbookModal = closeCookbookModal;
window.uploadCbCover = uploadCbCover;
window.removeCbCover = removeCbCover;
window.filterCookbookRecipes = filterCookbookRecipes;
window.toggleCbRecipe = toggleCbRecipe;
window.saveCookbook = saveCookbook;
window.editCurrentCookbook = editCurrentCookbook;
window.deleteCurrentCookbook = deleteCurrentCookbook;

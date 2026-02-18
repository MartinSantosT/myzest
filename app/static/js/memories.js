// ============================================
// MEMORIES.JS — Memories (Phase 6)
// "We don't save recipes. We save the moments."
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';
import { readExifData, reverseGeocode } from './exif.js';

// Pending photos to upload (creation mode, before saving)
let pendingPhotos = []; // Array of { file: File, preview: string, exif: {...} }

// ============ LOADING AND RENDERING ============

export async function loadMemories() {
    try {
        const res = await authFetch(`${state.API_URL}/memories/`);
        if (res.ok) {
            state.setAllMemories(await res.json());
            renderMemories();
        }
    } catch (e) { console.error('Error loading memories:', e); }
}

function renderMemories() {
    const grid = document.getElementById('memoriesGrid');
    const empty = document.getElementById('memoriesEmpty');

    if (!state.allMemories.length) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    empty.classList.add('hidden');

    grid.innerHTML = state.allMemories.map(m => {
        const firstPhoto = m.photos && m.photos.length > 0 ? m.photos[0] : null;
        const photoCount = m.photos ? m.photos.length : 0;
        const eventDate = m.event_date ? formatDate(m.event_date) : '';
        const recipeName = m.recipe ? m.recipe.title : '';

        const coverHtml = firstPhoto
            ? `<img src="${state.API_URL}${firstPhoto.image_url}" class="w-full h-full object-cover">`
            : `<div class="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
                <i class="ph-bold ph-camera text-5xl text-orange-300 dark:text-orange-700"></i>
               </div>`;

        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group"
                 onclick="openMemoryDetail(${m.id})">
                <div class="h-48 overflow-hidden relative">
                    ${coverHtml}
                    ${photoCount > 1 ? `<span class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><i class="ph-bold ph-images"></i> ${photoCount}</span>` : ''}
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-gray-800 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1">${m.title}</h3>
                    ${eventDate ? `<p class="text-xs text-orange-500 mt-1 flex items-center gap-1"><i class="ph-bold ph-calendar"></i> ${eventDate}</p>` : ''}
                    ${m.location ? `<p class="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate"><i class="ph-bold ph-map-pin"></i> ${m.location}</p>` : ''}
                    ${recipeName ? `<p class="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate"><i class="ph-bold ph-cooking-pot"></i> ${recipeName}</p>` : ''}
                    ${m.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">${m.description}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ============ MEMORY DETAIL ============

export async function openMemoryDetail(id) {
    try {
        const res = await authFetch(`${state.API_URL}/memories/${id}`);
        if (res.ok) {
            state.setCurrentMemory(await res.json());
            renderMemoryDetail();
            if (window.showView) window.showView('memoryDetail');
        }
    } catch (e) { console.error('Error loading memory:', e); }
}

function renderMemoryDetail() {
    const m = state.currentMemory;
    if (!m) return;

    const container = document.getElementById('memoryDetailContent');
    const eventDate = m.event_date ? formatDate(m.event_date) : '';

    // Photo gallery
    const photosHtml = m.photos && m.photos.length > 0
        ? `<div class="grid ${m.photos.length === 1 ? 'grid-cols-1' : m.photos.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-3 mb-6">
            ${m.photos.map((p, i) => `
                <div class="relative group/photo ${m.photos.length === 1 ? 'max-w-2xl mx-auto' : ''} ${i === 0 && m.photos.length === 3 ? 'col-span-2' : ''}">
                    <img src="${state.API_URL}${p.image_url}" class="w-full h-48 md:h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onclick="viewMemoryPhoto('${p.image_url}')">
                    ${p.caption ? `<p class="text-xs text-gray-500 mt-1 text-center italic">${p.caption}</p>` : ''}
                </div>
            `).join('')}
           </div>`
        : '';

    container.innerHTML = `
        <!-- Header with buttons -->
        <div class="flex items-center justify-between mb-6">
            <button onclick="showView('memories')" class="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors">
                <i class="ph-bold ph-arrow-left text-xl"></i>
                <span class="text-sm font-medium">Back to Memories</span>
            </button>
            <div class="flex gap-2">
                ${m.photos && m.photos.length > 0 ? `
                <button onclick="openShareCardModal(${m.id})" class="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
                    <i class="ph-bold ph-share-network"></i> Share
                </button>
                ` : ''}
                <button onclick="openMemoryModal(${m.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                    <i class="ph-bold ph-pencil-simple"></i> Edit
                </button>
                <button onclick="deleteMemory(${m.id})" class="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                    <i class="ph-bold ph-trash"></i> Delete
                </button>
            </div>
        </div>

        <!-- Title and date -->
        <div class="mb-6">
            <h1 class="text-3xl font-black text-gray-800 dark:text-white">${m.title}</h1>
            ${eventDate ? `<p class="text-orange-500 mt-2 flex items-center gap-2 font-medium"><i class="ph-bold ph-calendar"></i> ${eventDate}</p>` : ''}
            ${m.location ? `<p class="text-gray-500 mt-1 flex items-center gap-2 text-sm"><i class="ph-bold ph-map-pin"></i> ${m.location}</p>` : ''}
            ${m.recipe ? `<a onclick="event.stopPropagation(); if(window.openRecipeDetail) window.openRecipeDetail(${m.recipe.id})" class="inline-flex items-center gap-2 mt-2 text-sm text-gray-500 hover:text-orange-500 cursor-pointer transition-colors"><i class="ph-bold ph-cooking-pot"></i> ${m.recipe.title}</a>` : ''}
        </div>

        <!-- Photo gallery -->
        ${photosHtml}

        <!-- Description / Story -->
        ${m.description ? `
            <div class="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-2xl p-6">
                <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <i class="ph-bold ph-book-open-text text-orange-500"></i> The story
                </h3>
                <p class="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">${m.description}</p>
            </div>
        ` : ''}
    `;
}

// ============ CREATE/EDIT MODAL ============

function showModal() {
    const modal = document.getElementById('memoryModal');
    const inner = modal.querySelector('div > div');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.add('opacity-100');
        inner.classList.remove('scale-95');
        inner.classList.add('scale-100');
    });
}

function closeMemoryModal() {
    const modal = document.getElementById('memoryModal');
    const inner = modal.querySelector('div > div');
    modal.classList.remove('opacity-100');
    inner.classList.remove('scale-100');
    inner.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
    // Clean up pending photos and revoke URLs
    pendingPhotos.forEach(p => URL.revokeObjectURL(p.preview));
    pendingPhotos = [];
}

export async function openMemoryModal(id = null) {
    state.setEditingMemoryId(id);
    pendingPhotos = [];

    // Load FRESH recipes for dropdown (in case new ones were added)
    const recipeSelect = document.getElementById('memoryRecipeId');
    try {
        const recipesRes = await authFetch(`${state.API_URL}/recipes/`);
        if (recipesRes.ok) {
            const freshRecipes = await recipesRes.json();
            state.setAllRecipes(freshRecipes);
        }
    } catch (e) { console.warn('Error loading recipes for dropdown:', e); }

    const options = ['<option value="">No linked recipe</option>'];
    state.allRecipes.forEach(r => { options.push(`<option value="${r.id}">${r.title}</option>`); });
    recipeSelect.innerHTML = options.join('');

    if (id) {
        // Edit mode — load data BEFORE showing
        document.getElementById('memoryModalTitle').textContent = 'Edit Memory';
        try {
            const res = await authFetch(`${state.API_URL}/memories/${id}`);
            if (res.ok) {
                const m = await res.json();
                document.getElementById('memoryTitle').value = m.title;
                document.getElementById('memoryEventDate').value = m.event_date || '';
                document.getElementById('memoryRecipeId').value = m.recipe_id || '';
                document.getElementById('memoryDescription').value = m.description || '';
                document.getElementById('memoryLocation').value = m.location || '';
                renderPhotosArea(m.photos || [], id);
            }
        } catch (e) { console.error(e); }
        showModal();
    } else {
        // Creation mode — show immediately with photo area ready
        document.getElementById('memoryModalTitle').textContent = 'New Memory';
        document.getElementById('memoryTitle').value = '';
        document.getElementById('memoryEventDate').value = '';
        document.getElementById('memoryRecipeId').value = '';
        document.getElementById('memoryDescription').value = '';
        document.getElementById('memoryLocation').value = '';
        renderPhotosArea([], null);
        showModal();
    }
}

// ============ PHOTOS: UNIFIED AREA ============

function renderPhotosArea(existingPhotos, memoryId) {
    const container = document.getElementById('memoryPhotosContainer');
    const totalPhotos = existingPhotos.length + pendingPhotos.length;
    const canAdd = totalPhotos < 10;

    // Already uploaded photos (edit mode)
    const existingHtml = existingPhotos.map(p => `
        <div class="relative group/thumb">
            <img src="${state.API_URL}${p.image_url}" class="w-20 h-20 object-cover rounded-lg">
            <button onclick="deleteMemoryPhoto(${memoryId}, ${p.id})" class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                <i class="ph-bold ph-x"></i>
            </button>
        </div>
    `).join('');

    // Pending photos (creation mode, not yet uploaded)
    const pendingHtml = pendingPhotos.map((p, i) => `
        <div class="relative group/thumb">
            <img src="${p.preview}" class="w-20 h-20 object-cover rounded-lg ring-2 ring-orange-400 ring-offset-1">
            <button onclick="removePendingPhoto(${i})" class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                <i class="ph-bold ph-x"></i>
            </button>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="flex flex-wrap gap-3 items-center">
            ${existingHtml}
            ${pendingHtml}
            ${canAdd ? `
                <label class="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                    <input type="file" accept="image/*,.heic,.heif" multiple class="hidden" onchange="handlePhotoSelect(this)">
                    <i class="ph-bold ph-plus text-xl text-gray-400"></i>
                    <span class="text-[10px] text-gray-400 mt-0.5">Add</span>
                </label>
            ` : ''}
        </div>
        ${totalPhotos > 0 ? `<p class="text-xs text-gray-400 mt-2">${totalPhotos}/10 photos</p>` : `
            <p class="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <i class="ph-bold ph-magic-wand text-orange-400"></i>
                Upload photos with GPS to auto-detect date and location
            </p>
        `}
    `;
}

// Handle photo selection — supports multiple, works in creation and edit mode
async function handlePhotoSelect(input) {
    if (!input.files.length) return;
    const files = Array.from(input.files);
    const memoryId = state.editingMemoryId;

    for (const file of files) {
        // Read EXIF from first photo (or the one with data)
        let exifData = { date: null, lat: null, lon: null };
        try {
            exifData = await readExifData(file);
        } catch (e) { console.warn('Could not read EXIF:', e); }

        if (memoryId) {
            // Edit mode — upload directly to server
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await authFetch(`${state.API_URL}/memories/${memoryId}/photos`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    applyExifToFields(exifData);
                } else {
                    const err = await res.json();
                    alert(err.detail || 'Error uploading photo');
                    break; // Stop if error (e.g., 10 limit)
                }
            } catch (e) { console.error('Error uploading photo:', e); break; }
        } else {
            // Creation mode — local staging
            const preview = URL.createObjectURL(file);
            pendingPhotos.push({ file, preview, exif: exifData });
            applyExifToFields(exifData);
        }
    }

    // Update view
    if (memoryId) {
        const memRes = await authFetch(`${state.API_URL}/memories/${memoryId}`);
        if (memRes.ok) {
            const m = await memRes.json();
            renderPhotosArea(m.photos || [], memoryId);
        }
    } else {
        renderPhotosArea([], null);
    }

    input.value = '';
}

function applyExifToFields(exifData) {
    // Auto-fill date
    const dateField = document.getElementById('memoryEventDate');
    if (exifData.date && dateField && !dateField.value) {
        dateField.value = exifData.date;
        showExifNotification('Date detected from photo');
    }

    // Auto-fill location
    const locationField = document.getElementById('memoryLocation');
    if (exifData.lat && exifData.lon && locationField && !locationField.value) {
        locationField.value = 'Getting location...';
        reverseGeocode(exifData.lat, exifData.lon).then(place => {
            if (place) {
                locationField.value = place;
                showExifNotification('Location detected from photo');
            } else {
                locationField.value = `${exifData.lat.toFixed(4)}, ${exifData.lon.toFixed(4)}`;
            }
        });
    }
}

function removePendingPhoto(index) {
    if (pendingPhotos[index]) {
        URL.revokeObjectURL(pendingPhotos[index].preview);
        pendingPhotos.splice(index, 1);
        renderPhotosArea([], null);
    }
}

// ============ CRUD OPERATIONS ============

export async function saveMemory() {
    const title = document.getElementById('memoryTitle').value.trim();
    if (!title) return alert('Title is required');

    const payload = {
        title,
        event_date: document.getElementById('memoryEventDate').value || null,
        recipe_id: parseInt(document.getElementById('memoryRecipeId').value) || null,
        description: document.getElementById('memoryDescription').value.trim(),
        location: document.getElementById('memoryLocation').value.trim()
    };

    const id = state.editingMemoryId;
    const url = id ? `${state.API_URL}/memories/${id}` : `${state.API_URL}/memories/`;
    const method = id ? 'PUT' : 'POST';

    // Show saving indicator
    const saveBtn = document.querySelector('#memoryModal button[onclick="saveMemory()"]');
    const originalHtml = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Saving...';
        saveBtn.disabled = true;
    }

    try {
        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const saved = await res.json();

            // If there are pending photos (creation mode), upload them now
            if (!id && pendingPhotos.length > 0) {
                if (saveBtn) saveBtn.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Uploading photos (0/${pendingPhotos.length})...`;

                for (let i = 0; i < pendingPhotos.length; i++) {
                    if (saveBtn) saveBtn.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Uploading photos (${i + 1}/${pendingPhotos.length})...`;
                    const formData = new FormData();
                    formData.append('file', pendingPhotos[i].file);
                    try {
                        await authFetch(`${state.API_URL}/memories/${saved.id}/photos`, {
                            method: 'POST',
                            body: formData
                        });
                    } catch (e) { console.error('Error uploading pending photo:', e); }
                }
                // Clean up previews
                pendingPhotos.forEach(p => URL.revokeObjectURL(p.preview));
                pendingPhotos = [];
            }

            closeMemoryModal();
            await loadMemories();

            // If we're editing from detail, refresh the view
            if (id && state.currentMemory && state.currentMemory.id === id) {
                const refreshRes = await authFetch(`${state.API_URL}/memories/${id}`);
                if (refreshRes.ok) {
                    state.setCurrentMemory(await refreshRes.json());
                    renderMemoryDetail();
                }
            }
        } else {
            const err = await res.json();
            alert(err.detail || 'Error saving memory');
        }
    } catch (e) {
        console.error('Error saving memory:', e);
        alert('Connection error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalHtml;
            saveBtn.disabled = false;
        }
    }
}

export async function deleteMemory(id) {
    if (!confirm('Delete this memory and all its photos?')) return;

    try {
        const res = await authFetch(`${state.API_URL}/memories/${id}`, { method: 'DELETE' });
        if (res.ok) {
            state.setCurrentMemory(null);
            await loadMemories();
            if (window.showView) window.showView('memories');
        } else {
            const err = await res.json();
            alert(err.detail || 'Error deleting memory');
        }
    } catch (e) {
        console.error('Error deleting memory:', e);
        alert('Connection error');
    }
}

// Direct upload for edit mode (already connected to server)
export async function uploadMemoryPhoto(memoryId, input) {
    if (!input.files.length) return;
    // Redirect to unified handler
    await handlePhotoSelect(input);
}

export async function deleteMemoryPhoto(memoryId, photoId) {
    try {
        const res = await authFetch(`${state.API_URL}/memories/${memoryId}/photos/${photoId}`, { method: 'DELETE' });
        if (res.ok) {
            const memRes = await authFetch(`${state.API_URL}/memories/${memoryId}`);
            if (memRes.ok) {
                const m = await memRes.json();
                renderPhotosArea(m.photos || [], memoryId);
            }
        }
    } catch (e) { console.error('Error deleting photo:', e); }
}

function showExifNotification(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg z-[70] flex items-center gap-2 animate-pulse';
    toast.innerHTML = `<i class="ph-bold ph-magic-wand"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============ MEMORIES IN RECIPE DETAIL ============

export async function loadRecipeMemories(recipeId) {
    const container = document.getElementById('recipeMemoriesSection');
    if (!container) return;

    try {
        const res = await authFetch(`${state.API_URL}/memories/by-recipe/${recipeId}`);
        if (!res.ok) return;

        const memories = await res.json();

        if (!memories.length) {
            container.innerHTML = `
                <div class="text-center py-6">
                    <i class="ph-bold ph-camera text-4xl text-gray-300 dark:text-gray-600 mb-2"></i>
                    <p class="text-sm text-gray-400">No memories of this recipe</p>
                    <button onclick="openMemoryModalForRecipe(${recipeId})" class="mt-3 text-sm text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 mx-auto">
                        <i class="ph-bold ph-plus"></i> Create a memory
                    </button>
                </div>`;
            container.classList.remove('hidden');
            return;
        }

        container.innerHTML = `
            <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <i class="ph-bold ph-camera text-orange-500"></i> Memories (${memories.length})
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                ${memories.map(m => {
                    const photo = m.photos && m.photos.length > 0 ? m.photos[0] : null;
                    return `
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all" onclick="openMemoryDetail(${m.id})">
                            <div class="h-24 overflow-hidden">
                                ${photo
                                    ? `<img src="${state.API_URL}${photo.image_url}" class="w-full h-full object-cover">`
                                    : `<div class="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 flex items-center justify-center"><i class="ph-bold ph-camera text-2xl text-orange-300"></i></div>`
                                }
                            </div>
                            <div class="p-2">
                                <p class="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">${m.title}</p>
                                ${m.event_date ? `<p class="text-[10px] text-orange-500">${formatDate(m.event_date)}</p>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <button onclick="openMemoryModalForRecipe(${recipeId})" class="mt-3 text-sm text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1">
                <i class="ph-bold ph-plus"></i> Add memory
            </button>
        `;
        container.classList.remove('hidden');
    } catch (e) { console.error('Error loading recipe memories:', e); }
}

export function openMemoryModalForRecipe(recipeId) {
    openMemoryModal(null);
    setTimeout(() => {
        const select = document.getElementById('memoryRecipeId');
        if (select) select.value = recipeId;
    }, 100);
}

// ============ PHOTO VIEWER ============

function viewMemoryPhoto(imageUrl) {
    const viewer = document.createElement('div');
    viewer.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center cursor-pointer';
    viewer.onclick = () => viewer.remove();
    viewer.innerHTML = `<img src="${state.API_URL}${imageUrl}" class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl">`;
    document.body.appendChild(viewer);
}

// ============ UTILITIES ============

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return dateStr; }
}

// ============ WINDOW EXPOSURE ============
// Temporary moment cards (Phase 7)

window.loadMemories = loadMemories;
window.openMemoryDetail = openMemoryDetail;
window.openMemoryModal = openMemoryModal;
window.closeMemoryModal = closeMemoryModal;
window.saveMemory = saveMemory;
window.deleteMemory = deleteMemory;
window.uploadMemoryPhoto = uploadMemoryPhoto;
window.deleteMemoryPhoto = deleteMemoryPhoto;
window.loadRecipeMemories = loadRecipeMemories;
window.openMemoryModalForRecipe = openMemoryModalForRecipe;
window.viewMemoryPhoto = viewMemoryPhoto;
window.handlePhotoSelect = handlePhotoSelect;
window.removePendingPhoto = removePendingPhoto;
window.openShareCardModal = openShareCardModal;
window.closeShareCardModal = closeShareCardModal;
window.selectCardTemplate = selectCardTemplate;
window.selectCardPhoto = selectCardPhoto;
window.onCardOptionChange = onCardOptionChange;
window.downloadCard = downloadCard;
window.shareCard = shareCard;
window.shareToWhatsApp = shareToWhatsApp;
window.shareToTelegram = shareToTelegram;
window.shareToTwitter = shareToTwitter;
window.shareToFacebook = shareToFacebook;
window.shareToInstagram = shareToInstagram;
window.copyCardImage = copyCardImage;
window.generateMemoryShareLink = generateMemoryShareLink;
window.copyMemoryShareLink = copyMemoryShareLink;
window.deleteMemoryShareLink = deleteMemoryShareLink;

let currentCardTemplate = 'square';
let currentCardMemoryId = null;
let currentCardPhotoIndex = 0;

function openShareCardModal(memoryId) {
    currentCardMemoryId = memoryId;
    currentCardTemplate = 'square';
    currentCardPhotoIndex = 0;

    // Reset options
    const hideLocCheckbox = document.getElementById('cardHideLocation');
    if (hideLocCheckbox) hideLocCheckbox.checked = false;

    // Reset link section
    document.getElementById('memoryShareLinkUrl').value = '';
    document.getElementById('memoryShareLinkUrl').dataset.linkId = '';
    document.getElementById('memoryShareLinkExists').classList.add('hidden');
    document.getElementById('memoryShareLinkEmpty').classList.remove('hidden');

    const modal = document.getElementById('shareCardModal');
    const inner = modal.querySelector('div > div');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.add('opacity-100');
        inner.classList.remove('scale-95');
        inner.classList.add('scale-100');
    });

    // Build photo selector
    buildPhotoSelector(memoryId);

    // Activate default template and load preview
    updateTemplateButtons();
    loadCardPreview();

    // Check if memory already has a share link
    checkMemoryShareLink(memoryId);
}

async function checkMemoryShareLink(memoryId) {
    try {
        const token = (localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token'));
        const res = await fetch(`${state.API_URL}/memories/${memoryId}/share-link`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.token) {
                const url = `${window.location.origin}/shared/memory/${data.token}`;
                document.getElementById('memoryShareLinkUrl').value = url;
                document.getElementById('memoryShareLinkUrl').dataset.linkId = data.id;
                document.getElementById('memoryShareLinkEmpty').classList.add('hidden');
                document.getElementById('memoryShareLinkExists').classList.remove('hidden');
            }
        }
    } catch (e) { /* no existing link */ }
}

async function generateMemoryShareLink() {
    try {
        const token = (localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token'));
        const res = await fetch(`${state.API_URL}/memories/${currentCardMemoryId}/share`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            const data = await res.json();
            const url = `${window.location.origin}/shared/memory/${data.token}`;
            document.getElementById('memoryShareLinkUrl').value = url;
            document.getElementById('memoryShareLinkUrl').dataset.linkId = data.id;
            document.getElementById('memoryShareLinkEmpty').classList.add('hidden');
            document.getElementById('memoryShareLinkExists').classList.remove('hidden');
        }
    } catch (e) {
        console.error('Error generating memory link:', e);
    }
}

async function copyMemoryShareLink() {
    const url = document.getElementById('memoryShareLinkUrl').value;
    try {
        await navigator.clipboard.writeText(url);
        _showToast('Link copied!');
    } catch (e) {}
}

async function deleteMemoryShareLink() {
    const linkId = document.getElementById('memoryShareLinkUrl')?.dataset.linkId;
    if (!linkId) return;
    try {
        const token = (localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token'));
        const res = await fetch(`${state.API_URL}/share/${linkId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            document.getElementById('memoryShareLinkUrl').value = '';
            document.getElementById('memoryShareLinkUrl').dataset.linkId = '';
            document.getElementById('memoryShareLinkExists').classList.add('hidden');
            document.getElementById('memoryShareLinkEmpty').classList.remove('hidden');
        }
    } catch (e) {
        console.error('Error deleting memory link:', e);
    }
}

function buildPhotoSelector(memoryId) {
    const memory = state.allMemories.find(m => m.id === memoryId) || state.currentMemory;
    const container = document.getElementById('cardPhotoSelector');
    const thumbsContainer = document.getElementById('cardPhotoThumbs');

    if (!memory || !memory.photos || memory.photos.length <= 1) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    thumbsContainer.innerHTML = memory.photos.map((p, i) => `
        <button onclick="selectCardPhoto(${i})" id="cardThumb-${i}"
            class="w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === 0 ? 'border-orange-500 ring-2 ring-orange-300' : 'border-gray-300 dark:border-gray-600 opacity-60 hover:opacity-100'}">
            <img src="${state.API_URL}${p.image_url}" class="w-full h-full object-cover">
        </button>
    `).join('');
}

function selectCardPhoto(index) {
    currentCardPhotoIndex = index;
    const memory = state.allMemories.find(m => m.id === currentCardMemoryId) || state.currentMemory;
    if (memory && memory.photos) {
        memory.photos.forEach((_, i) => {
            const thumb = document.getElementById(`cardThumb-${i}`);
            if (thumb) {
                if (i === index) {
                    thumb.className = 'w-10 h-10 rounded-lg overflow-hidden border-2 transition-all border-orange-500 ring-2 ring-orange-300';
                } else {
                    thumb.className = 'w-10 h-10 rounded-lg overflow-hidden border-2 transition-all border-gray-300 dark:border-gray-600 opacity-60 hover:opacity-100';
                }
            }
        });
    }
    loadCardPreview();
}

function onCardOptionChange() {
    loadCardPreview();
}

function closeShareCardModal() {
    const modal = document.getElementById('shareCardModal');
    const inner = modal.querySelector('div > div');
    modal.classList.remove('opacity-100');
    inner.classList.remove('scale-100');
    inner.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function selectCardTemplate(template) {
    currentCardTemplate = template;
    updateTemplateButtons();
    loadCardPreview();
}

function updateTemplateButtons() {
    const templates = ['story', 'square', 'landscape'];
    templates.forEach(t => {
        const btn = document.getElementById(`cardBtn-${t}`);
        if (btn) {
            if (t === currentCardTemplate) {
                btn.className = 'px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 text-white shadow-md';
            } else {
                btn.className = 'px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors';
            }
        }
    });
}

function _buildCardUrl() {
    const hideLocation = document.getElementById('cardHideLocation')?.checked || false;
    let url = `${state.API_URL}/memories/${currentCardMemoryId}/card?template=${currentCardTemplate}&photo_index=${currentCardPhotoIndex}`;
    if (hideLocation) url += '&hide_location=true';
    return url;
}

async function loadCardPreview() {
    const preview = document.getElementById('cardPreview');
    const loading = document.getElementById('cardLoading');

    preview.classList.add('hidden');
    loading.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-3xl text-orange-400"></i><p class="text-sm text-gray-400 mt-2">Generating card...</p>';
    loading.classList.remove('hidden');

    try {
        const token = (localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token'));
        const res = await fetch(_buildCardUrl(), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            preview.src = url;
            preview.onload = () => {
                loading.classList.add('hidden');
                preview.classList.remove('hidden');
            };
        } else {
            loading.innerHTML = '<i class="ph-bold ph-warning text-3xl text-red-400"></i><p class="text-sm text-red-400 mt-2">Error generating card</p>';
        }
    } catch (e) {
        console.error('Error loading preview:', e);
        loading.innerHTML = '<i class="ph-bold ph-warning text-3xl text-red-400"></i><p class="text-sm text-red-400 mt-2">Connection error</p>';
    }
}

async function downloadCard() {
    try {
        const token = (localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token'));
        const res = await fetch(_buildCardUrl(), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `moment-zest-${currentCardTemplate}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        console.error('Error downloading card:', e);
        alert('Error downloading');
    }
}

async function shareCard() {
    // Try Web Share API (mobile)
    if (navigator.share && navigator.canShare) {
        try {
            const token = (localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token'));
            const res = await fetch(_buildCardUrl(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const file = new File([blob], 'moment-zest.png', { type: 'image/png' });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'My moment — Zest',
                    });
                    return;
                }
            }
        } catch (e) {
            if (e.name === 'AbortError') return; // User cancelled
            console.warn('Web Share failed, using download:', e);
        }
    }

    // Fallback: direct download
    await downloadCard();
}

function _getShareText() {
    const memory = state.allMemories.find(m => m.id === currentCardMemoryId) || state.currentMemory;
    const title = memory ? memory.title : 'My moment';
    const shareUrl = document.getElementById('memoryShareLinkUrl')?.value || '';
    return `${title} — Shared with Zest${shareUrl ? ' ' + shareUrl : ''}`;
}

function _getMemoryShareUrl() {
    return document.getElementById('memoryShareLinkUrl')?.value || '';
}

// Helper: get the image as File for sharing
async function _getCardFile() {
    const token = (localStorage.getItem('zest_token') || sessionStorage.getItem('zest_token'));
    const res = await fetch(_buildCardUrl(), {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error generating card');
    const blob = await res.blob();
    return new File([blob], 'moment-zest.png', { type: 'image/png' });
}

// Share with Web Share API (image + text) or fallback to download
async function _shareWithImage(title) {
    if (navigator.share && navigator.canShare) {
        try {
            const file = await _getCardFile();
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: title || _getShareText(),
                    text: _getShareText(),
                });
                return true;
            }
        } catch (e) {
            if (e.name === 'AbortError') return true; // User cancelled, don't fallback
        }
    }
    return false;
}

async function shareToWhatsApp() {
    const shared = await _shareWithImage('WhatsApp');
    if (!shared) {
        // Fallback: download image and open WhatsApp with text
        await downloadCard();
        setTimeout(() => {
            window.open(`https://wa.me/?text=${encodeURIComponent(_getShareText())}`, '_blank');
        }, 500);
    }
}

async function shareToTelegram() {
    const shared = await _shareWithImage('Telegram');
    if (!shared) {
        await downloadCard();
        const shareUrl = _getMemoryShareUrl() || window.location.origin;
        const text = encodeURIComponent(_getShareText());
        setTimeout(() => {
            window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank');
        }, 500);
    }
}

async function shareToTwitter() {
    const shared = await _shareWithImage('X');
    if (!shared) {
        await downloadCard();
        setTimeout(() => {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(_getShareText())}`, '_blank');
        }, 500);
    }
}

async function shareToFacebook() {
    const shared = await _shareWithImage('Facebook');
    if (!shared) {
        await downloadCard();
        const shareUrl = _getMemoryShareUrl() || window.location.origin;
        setTimeout(() => {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(_getShareText())}`, '_blank');
        }, 500);
    }
}

async function shareToInstagram() {
    // Instagram has no URL scheme for sharing — use Web Share API
    const shared = await _shareWithImage('Instagram');
    if (!shared) {
        // Fallback: download the image for user to manually upload
        await downloadCard();
        _showToast('Image downloaded — open it in Instagram to share');
    }
}

async function copyCardImage() {
    try {
        const file = await _getCardFile();
        // Try to copy image to clipboard
        if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': file });
            await navigator.clipboard.write([item]);
            _showCopyFeedback();
            _showToast('Image copied to clipboard');
            return;
        }
    } catch (e) {
        console.warn('Could not copy image:', e);
    }
    // Fallback: download
    await downloadCard();
    _showCopyFeedback();
    _showToast('Image downloaded');
}

function _showCopyFeedback() {
    const btn = document.querySelector('button[onclick="copyCardImage()"]');
    if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-check text-lg text-green-500"></i>';
        setTimeout(() => { btn.innerHTML = originalHtml; }, 1500);
    }
}

function _showToast(msg) {
    const existing = document.getElementById('shareToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'shareToast';
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg z-[60] animate-pulse';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

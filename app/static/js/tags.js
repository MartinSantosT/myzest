// ============================================
// TAGS.JS — Tag Management
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';

export function populateTagFilter() {
    const select = document.getElementById('tagFilter');
    if (!select) return;

    select.innerHTML = '<option value="">All Tags</option>';

    if (state.allTags && state.allTags.length > 0) {
        state.allTags.forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag.id;
            opt.textContent = `#${tag.name}`;
            select.appendChild(opt);
        });
    }
}

export function populateTagsContainer() {
    const container = document.getElementById('availableTagsContainer');
    if (!container) return;

    if (state.allTags.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-400">No tags. Create a new one.</span>';
        return;
    }

    container.innerHTML = state.allTags.map(tag => `
        <button
            type="button"
            onclick="toggleTag(${tag.id})"
            class="tag-available inline-flex items-center text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105"
            data-tag-id="${tag.id}"
            style="background-color: ${tag.color}20; color: ${tag.color}; border: 1px solid ${tag.color}40;">
            #${tag.name}
        </button>
    `).join('');
}

export function toggleTag(tagId) {
    const tags = [...state.selectedTags];
    const index = tags.indexOf(tagId);

    if (index > -1) {
        tags.splice(index, 1);
    } else {
        tags.push(tagId);
    }

    state.setSelectedTags(tags);
    updateSelectedTagsDisplay();
}

export function updateSelectedTagsDisplay() {
    const container = document.getElementById('selectedTagsContainer');
    if (!container) return;

    if (state.selectedTags.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-400">Select or create tags...</span>';
        return;
    }

    container.innerHTML = state.selectedTags.map(tagId => {
        const tag = state.allTags.find(t => t.id === tagId);
        if (!tag) return '';

        return `
            <span class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium"
                  style="background-color: ${tag.color}; color: white;">
                #${tag.name}
                <button
                    type="button"
                    onclick="toggleTag(${tag.id})"
                    class="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                    <i class="ph-bold ph-x text-xs"></i>
                </button>
            </span>
        `;
    }).join('');
}

export async function createNewTag() {
    const nameInput = document.getElementById('newTagInput');
    const colorSelect = document.getElementById('newTagColor');

    const name = nameInput.value.trim();
    const color = colorSelect.value;

    if (!name) {
        alert('Please enter a name for the tag');
        return;
    }

    try {
        const res = await authFetch(`${state.API_URL}/tags/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, color: color })
        });

        if (res.ok) {
            const newTag = await res.json();
            const tags = [...state.allTags, newTag];
            state.setAllTags(tags);

            const selected = [...state.selectedTags, newTag.id];
            state.setSelectedTags(selected);

            populateTagsContainer();
            updateSelectedTagsDisplay();

            nameInput.value = '';
            colorSelect.value = '#f97316';

            alert(`✓ Tag "${name}" created`);
        } else {
            alert('Error creating tag');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

export function loadRecipeTags(recipe) {
    state.setSelectedTags(recipe.tags ? recipe.tags.map(t => t.id) : []);
    updateSelectedTagsDisplay();
}

export function clearSelectedTags() {
    state.setSelectedTags([]);
    updateSelectedTagsDisplay();
}

// --- Window Exposure ---
window.toggleTag = toggleTag;
window.createNewTag = createNewTag;
window.clearSelectedTags = clearSelectedTags;

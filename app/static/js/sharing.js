// ============================================
// SHARING.JS — Share Links & PDF Download
// ============================================

import * as state from './state.js';
import { authFetch } from './api.js';

export function shareCurrentCookbook() {
    if (!state.currentCookbook) return;
    openShareModal(state.currentCookbook.id, state.currentCookbook.name);
}

export async function openShareModal(cookbookId, cookbookName) {
    document.getElementById('shareCbName').textContent = cookbookName;
    document.getElementById('shareFeedback').classList.add('hidden');
    document.getElementById('shareModal').dataset.cookbookId = cookbookId;

    state.setCurrentShareLinkId(null);
    state.setCurrentShareToken(null);

    try {
        const res = await authFetch(`${state.API_URL}/share/mine`);
        if (res.ok) {
            const links = await res.json();
            const existing = links.find(l => l.cookbook_id === cookbookId);

            if (existing) {
                state.setCurrentShareLinkId(existing.id);
                state.setCurrentShareToken(existing.token);
                showShareLinkUI(existing.token);
            } else {
                showShareEmptyUI();
            }
        }
    } catch (e) { showShareEmptyUI(); }

    const modal = document.getElementById('shareModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('shareModalContent').classList.remove('scale-95');
    }, 10);
}

export function closeShareModal() {
    const modal = document.getElementById('shareModal');
    modal.classList.add('opacity-0');
    document.getElementById('shareModalContent').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function showShareLinkUI(token) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/shared/${token}`;
    document.getElementById('shareLinkUrl').value = url;
    document.getElementById('shareLinkAnchor').href = url;
    document.getElementById('shareLinkEmpty').classList.add('hidden');
    document.getElementById('shareLinkExists').classList.remove('hidden');
}

function showShareEmptyUI() {
    document.getElementById('shareLinkEmpty').classList.remove('hidden');
    document.getElementById('shareLinkExists').classList.add('hidden');
}

function showShareFeedback(msg, isError = false) {
    const el = document.getElementById('shareFeedback');
    el.textContent = msg;
    el.className = `p-3 rounded-xl text-sm text-center ${isError
        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800'
        : 'bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200 dark:border-green-800'}`;
    el.classList.remove('hidden');
    if (!isError) setTimeout(() => el.classList.add('hidden'), 3000);
}

export async function generateShareLink() {
    const cookbookId = parseInt(document.getElementById('shareModal').dataset.cookbookId);
    const btn = document.getElementById('btnGenerateLink');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Generating...';

    try {
        const res = await authFetch(`${state.API_URL}/share/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookbook_id: cookbookId, allow_signup: false })
        });

        if (res.ok) {
            const link = await res.json();
            state.setCurrentShareLinkId(link.id);
            state.setCurrentShareToken(link.token);
            showShareLinkUI(link.token);
            showShareFeedback('✅ Link generated');
        } else {
            showShareFeedback('Error generating link', true);
        }
    } catch (e) {
        showShareFeedback('Connection error', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-link"></i> Generate Link';
    }
}

export async function copyShareLink() {
    const url = document.getElementById('shareLinkUrl').value;
    try {
        await navigator.clipboard.writeText(url);
        const btn = document.getElementById('btnCopyLink');
        btn.innerHTML = '<i class="ph-bold ph-check"></i> Copied!';
        btn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
        btn.classList.add('bg-green-500');
        setTimeout(() => {
            btn.innerHTML = '<i class="ph-bold ph-copy"></i> Copy';
            btn.classList.remove('bg-green-500');
            btn.classList.add('bg-blue-500', 'hover:bg-blue-600');
        }, 2000);
    } catch (e) {
        const input = document.getElementById('shareLinkUrl');
        input.select();
        document.execCommand('copy');
        showShareFeedback('✅ Link copied to clipboard');
    }
}

export async function deleteShareLink() {
    if (!state.currentShareLinkId) return;
    if (!confirm('Delete this link? No one will be able to access the cookbook with it.')) return;

    try {
        const res = await authFetch(`${state.API_URL}/share/${state.currentShareLinkId}`, { method: 'DELETE' });
        if (res.ok) {
            state.setCurrentShareLinkId(null);
            state.setCurrentShareToken(null);
            showShareEmptyUI();
            showShareFeedback('✅ Link deleted');
        }
    } catch (e) {
        showShareFeedback('Error deleting', true);
    }
}

export async function downloadCookbookPDF() {
    const cookbookId = parseInt(document.getElementById('shareModal').dataset.cookbookId);
    const btn = document.getElementById('btnDownloadPDF');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Generating PDF...';

    try {
        const res = await authFetch(`${state.API_URL}/cookbooks/${cookbookId}/pdf`);
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"','') || 'Zest_Cookbook.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showShareFeedback('✅ PDF downloaded');
        } else {
            const err = await res.json();
            showShareFeedback(err.detail || 'Error generating PDF', true);
        }
    } catch (e) {
        showShareFeedback('Connection error', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-download"></i> Download PDF';
    }
}

// --- Window Exposure ---
window.shareCurrentCookbook = shareCurrentCookbook;
window.openShareModal = openShareModal;
window.closeShareModal = closeShareModal;
window.generateShareLink = generateShareLink;
window.copyShareLink = copyShareLink;
window.deleteShareLink = deleteShareLink;
window.downloadCookbookPDF = downloadCookbookPDF;

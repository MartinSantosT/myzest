// ============================================
// COVERIMAGES.JS — Drag-to-Reposition Cover Images
// ============================================

import * as state from './state.js';

export function initCoverDrag(n) {
    const box = document.getElementById(`cbCover${n}Box`);
    const img = document.getElementById(`cbCover${n}Img`);

    function startDrag(e) {
        if (img.classList.contains('hidden')) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const pos = document.getElementById(`cbCoverPos${n}`).value.split(' ');
        state.setDragState({
            n: n,
            startX: clientX,
            startY: clientY,
            origX: parseFloat(pos[0]),
            origY: parseFloat(pos[1]),
            boxW: box.offsetWidth,
            boxH: box.offsetHeight
        });
        box.style.cursor = 'grabbing';
    }

    box.addEventListener('mousedown', startDrag);
    box.addEventListener('touchstart', startDrag, { passive: false });
}

export function handleDragMove(e) {
    if (!state.dragState) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - state.dragState.startX;
    const dy = clientY - state.dragState.startY;

    const sensX = 100 / (state.dragState.boxW * 0.8);
    const sensY = 100 / (state.dragState.boxH * 0.8);

    const newX = Math.max(0, Math.min(100, state.dragState.origX - dx * sensX));
    const newY = Math.max(0, Math.min(100, state.dragState.origY - dy * sensY));

    const pos = `${newX.toFixed(1)}% ${newY.toFixed(1)}%`;
    document.getElementById(`cbCover${state.dragState.n}Img`).style.objectPosition = pos;
    document.getElementById(`cbCoverPos${state.dragState.n}`).value = pos;
}

export function handleDragEnd() {
    if (state.dragState) {
        const box = document.getElementById(`cbCover${state.dragState.n}Box`);
        box.style.cursor = 'pointer';
        state.setDragState(null);
    }
}

export function initCoverDragListeners() {
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    // Init drag for both covers
    setTimeout(() => { initCoverDrag(1); initCoverDrag(2); }, 100);
}

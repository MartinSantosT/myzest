// ============================================
// SIDEBAR.JS — Sidebar Toggle & Initialization
// ============================================

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        sidebar.classList.toggle('sidebar-collapsed');
        sidebar.classList.toggle('sidebar-expanded');
        overlay.classList.toggle('hidden');
    } else {
        const isCollapsed = sidebar.classList.contains('sidebar-collapsed');

        if (isCollapsed) {
            sidebar.classList.remove('sidebar-collapsed');
            sidebar.classList.add('sidebar-expanded');
            mainContent.classList.remove('content-collapsed');
            mainContent.classList.add('content-expanded');
        } else {
            sidebar.classList.add('sidebar-collapsed');
            sidebar.classList.remove('sidebar-expanded');
            mainContent.classList.add('content-collapsed');
            mainContent.classList.remove('content-expanded');
        }
    }
}

export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        sidebar.classList.add('sidebar-collapsed');
    } else {
        sidebar.classList.add('sidebar-expanded');
        mainContent.classList.add('content-expanded');
    }
}

// --- Window Exposure (for inline onclick) ---
window.toggleSidebar = toggleSidebar;

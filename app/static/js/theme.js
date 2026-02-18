// ============================================
// THEME.JS — Dark/Light Mode Toggle
// ============================================

export function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    updateThemeButton();
}

export function updateThemeButton() {
    const isDark = document.documentElement.classList.contains('dark');
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');

    if (isDark) {
        icon.className = 'ph-fill ph-sun';
        text.textContent = 'Light Mode';
    } else {
        icon.className = 'ph-fill ph-moon';
        text.textContent = 'Dark Mode';
    }
}

// --- Window Exposure (for inline onclick) ---
window.toggleTheme = toggleTheme;

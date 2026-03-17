// ============================================
// THEME.JS — Dark/Light Mode Toggle
// ============================================

export function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    updateThemeButton();
}

export function updateThemeButton() {
    const isDark = document.documentElement.classList.contains('dark');

    // Update settings modal toggle
    const settingsToggle = document.getElementById('settingsDarkToggle');
    if (settingsToggle) settingsToggle.checked = isDark;

    const settingsIcon = document.getElementById('settingsThemeIcon');
    if (settingsIcon) settingsIcon.className = isDark ? 'ph-fill ph-sun text-xl text-orange-500' : 'ph-fill ph-moon text-xl text-orange-500';

    const settingsLabel = document.getElementById('settingsThemeLabel');
    if (settingsLabel) settingsLabel.textContent = isDark ? 'On' : 'Off';
}

// --- Collapsible settings sections ---
window.toggleSettingsSection = function(name) {
    const panel = document.getElementById('settingsPanel' + name.charAt(0).toUpperCase() + name.slice(1));
    const chevron = document.getElementById('settingsChevron' + name.charAt(0).toUpperCase() + name.slice(1));
    if (!panel) return;

    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (chevron) {
        chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    }
};

// --- Language toggle placeholder (will be wired with i18n later) ---
window.toggleSettingsLang = function() {
    // Placeholder — will be replaced when i18n is implemented
    const btn = document.getElementById('settingsLangBtn');
    const label = document.getElementById('settingsLangLabel');
    if (!btn || !label) return;

    if (btn.textContent.trim() === 'ES') {
        btn.textContent = 'EN';
        label.textContent = 'Español';
    } else {
        btn.textContent = 'ES';
        label.textContent = 'English';
    }
};

// --- Window Exposure (for inline onclick) ---
window.toggleTheme = toggleTheme;
window.updateThemeButton = updateThemeButton;

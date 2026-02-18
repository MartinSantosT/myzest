// ============================================
// ONBOARDING.JS — First-time user experience
// ============================================

import * as state from './state.js';

const ONBOARDING_KEY = 'zest_onboarding_done';

let currentStep = 0;
const steps = [
    {
        icon: 'ph-bold ph-orange-slice',
        title: 'Welcome to Zest',
        subtitle: 'Your personal culinary diary',
        body: 'We don\'t save recipes.<br><strong>We save the moments around the table.</strong>',
        color: 'from-orange-500 to-red-500',
        cta: null
    },
    {
        icon: 'ph-bold ph-cooking-pot',
        title: 'Your recipes, your story',
        subtitle: 'Start by creating your first recipe',
        body: 'You can <strong>create a recipe from scratch</strong> or <strong>import it from a URL</strong> from any cooking site. All your recipes are saved securely.',
        color: 'from-orange-500 to-amber-500',
        cta: null
    },
    {
        icon: 'ph-bold ph-camera',
        title: 'Memories',
        subtitle: 'What makes Zest different',
        body: 'Every recipe has a story. The birthday when you made the cake, Christmas with pozole, dinner with friends.<br><br><strong>Save those moments in Memories</strong> — with photos, dates, location and the story of what happened.',
        color: 'from-amber-500 to-orange-500',
        cta: { label: 'Create my first memory', action: 'finishAndOpenMemory()' }
    }
];

export function shouldShowOnboarding() {
    try {
        return !localStorage.getItem(ONBOARDING_KEY);
    } catch (e) { return false; }
}

export function showOnboarding() {
    currentStep = 0;
    renderOnboardingStep();
    document.getElementById('onboardingModal').classList.remove('hidden');
}

function renderOnboardingStep() {
    const step = steps[currentStep];
    const isLast = currentStep === steps.length - 1;
    const isFirst = currentStep === 0;

    const container = document.getElementById('onboardingContent');
    container.innerHTML = `
        <!-- Gradient Header -->
        <div class="bg-gradient-to-r ${step.color} p-10 text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4">
                <i class="${step.icon} text-4xl text-white"></i>
            </div>
            <h2 class="text-3xl font-black text-white">${step.title}</h2>
            <p class="text-white/80 mt-2">${step.subtitle}</p>
        </div>

        <!-- Body -->
        <div class="p-8 text-center">
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">${step.body}</p>
        </div>

        <!-- Progress dots + buttons -->
        <div class="px-8 pb-8">
            <!-- Progress dots -->
            <div class="flex justify-center gap-2 mb-6">
                ${steps.map((_, i) => `
                    <div class="w-2.5 h-2.5 rounded-full transition-colors ${i === currentStep ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}"></div>
                `).join('')}
            </div>

            <!-- Buttons -->
            <div class="flex flex-col gap-3">
                ${step.cta ? `
                    <button onclick="${step.cta.action}" class="w-full bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                        <i class="ph-bold ph-camera"></i> ${step.cta.label}
                    </button>
                    <button onclick="finishOnboarding()" class="w-full px-5 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        Explore on my own
                    </button>
                ` : `
                    <div class="flex gap-3">
                        ${!isFirst ? `
                            <button onclick="onboardingPrev()" class="flex-1 px-5 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <i class="ph-bold ph-arrow-left"></i> Previous
                            </button>
                        ` : `
                            <button onclick="skipOnboarding()" class="flex-1 px-5 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
                                Skip
                            </button>
                        `}
                        <button onclick="onboardingNext()" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors">
                            Next <i class="ph-bold ph-arrow-right"></i>
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
}

function onboardingNext() {
    if (currentStep < steps.length - 1) {
        currentStep++;
        renderOnboardingStep();
    }
}

function onboardingPrev() {
    if (currentStep > 0) {
        currentStep--;
        renderOnboardingStep();
    }
}

function finishOnboarding() {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch (e) {}
    document.getElementById('onboardingModal').classList.add('hidden');
}

function finishAndOpenMemory() {
    finishOnboarding();
    // Navigate to Memories and open create modal
    if (window.showView) window.showView('memories');
    setTimeout(() => {
        if (window.openMemoryModal) window.openMemoryModal();
    }, 300);
}

function skipOnboarding() {
    finishOnboarding();
}

// --- Window Exposure ---
window.onboardingNext = onboardingNext;
window.onboardingPrev = onboardingPrev;
window.finishOnboarding = finishOnboarding;
window.finishAndOpenMemory = finishAndOpenMemory;
window.skipOnboarding = skipOnboarding;
window.showOnboarding = showOnboarding;
window.shouldShowOnboarding = shouldShowOnboarding;

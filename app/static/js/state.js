// ============================================
// STATE.JS — Global State Management for Zest
// ============================================

export const API_URL = window.location.origin;

// --- Auth State ---
export let authToken = null;
export let currentUser = null;

export function setAuthToken(token) { authToken = token; }
export function setCurrentUser(user) { currentUser = user; }

// --- Recipe Data ---
export let allRecipes = [];
export let allCategories = [];
export let allTags = [];
export let selectedCategories = [];
export let selectedTags = [];

export function setAllRecipes(recipes) { allRecipes = recipes; }
export function setAllCategories(cats) { allCategories = cats; }
export function setAllTags(tags) { allTags = tags; }
export function setSelectedCategories(cats) { selectedCategories = cats; }
export function setSelectedTags(tags) { selectedTags = tags; }

// --- Portion Calculator ---
export let currentRecipeIngredients = [];
export let baseServings = 4;
export let currentPortions = 4;

export function setCurrentRecipeIngredients(ings) { currentRecipeIngredients = ings; }
export function setBaseServings(s) { baseServings = s; }
export function setCurrentPortions(p) { currentPortions = p; }

// --- What To Cook ---
export let wtcIngredients = [];
export let wtcPortions = {};
export let wtcResultsCache = [];

export function setWtcIngredients(ings) { wtcIngredients = ings; }
export function setWtcPortions(p) { wtcPortions = p; }
export function setWtcResultsCache(cache) { wtcResultsCache = cache; }

// --- Shopping List ---
export let shoppingList = [];
export function setShoppingList(list) { shoppingList = list; }

// --- Cookbooks ---
export let allCookbooks = [];
export let currentCookbook = null;
export let editingCookbookId = null;
export let selectedCbRecipes = new Set();
export let cbDetailSlide = 0;
export let dragState = null;

export function setAllCookbooks(cbs) { allCookbooks = cbs; }
export function setCurrentCookbook(cb) { currentCookbook = cb; }
export function setEditingCookbookId(id) { editingCookbookId = id; }
export function setSelectedCbRecipes(set) { selectedCbRecipes = set; }
export function setCbDetailSlide(s) { cbDetailSlide = s; }
export function setDragState(s) { dragState = s; }

// --- Recipe Detail ---
export let currentRecipe = null;
export function setCurrentRecipe(recipe) { currentRecipe = recipe; }

// --- Memories ---
export let allMemories = [];
export let currentMemory = null;
export let editingMemoryId = null;

export function setAllMemories(memories) { allMemories = memories; }
export function setCurrentMemory(memory) { currentMemory = memory; }
export function setEditingMemoryId(id) { editingMemoryId = id; }

// --- Share ---
export let currentShareLinkId = null;
export let currentShareToken = null;

export function setCurrentShareLinkId(id) { currentShareLinkId = id; }
export function setCurrentShareToken(token) { currentShareToken = token; }

// --- UI ---
export let currentView = 'all';
export function setCurrentView(v) { currentView = v; }

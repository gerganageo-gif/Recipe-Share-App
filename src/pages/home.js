import { renderRecipeCard } from '../components/recipeCard';
import { getCurrentUser } from '../services/authService';
import {
  getRecipeCategoryCounts,
  isRecipeFavorited,
  listFavoriteRecipesByUser,
  listFeaturedRecipes,
  listRecipes,
  toggleRecipeFavorite
} from '../services/recipeService';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { getQueryParam } from '../utils/query';
import { normalizeRecipeCategory, RECIPE_CATEGORIES } from '../utils/recipeCategories';
import { setupPage } from './shared';

const recipesGrid = document.querySelector('#recipes-grid');
const statusMessage = document.querySelector('#status-message');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const clearSearchButton = document.querySelector('#clear-search-btn');
const featuredGrid = document.querySelector('#featured-grid');
const featuredStatus = document.querySelector('#featured-status');
const activeCategoryBadge = document.querySelector('#active-category-badge');
const categoryChips = document.querySelector('#category-chips');

const selectedCategory = normalizeRecipeCategory(getQueryParam('category') || 'Всички');
const initialSearchTerm = String(getQueryParam('q') || '').trim();

let currentSearchTerm = initialSearchTerm;
let currentUser = null;
let favoriteRecipeIds = new Set();

await setupPage({ title: 'Всички рецепти' });
await loadCurrentUserFavorites();

if (searchInput) {
  searchInput.value = initialSearchTerm;
}

function syncClearSearchButtonVisibility() {
  if (!clearSearchButton) {
    return;
  }

  if (currentSearchTerm.trim()) {
    clearSearchButton.classList.remove('d-none');
  } else {
    clearSearchButton.classList.add('d-none');
  }
}

syncClearSearchButtonVisibility();

function updateHomeUrl(searchTerm) {
  const params = new URLSearchParams(window.location.search);

  if (selectedCategory !== 'Всички') {
    params.set('category', selectedCategory);
  } else {
    params.delete('category');
  }

  if (searchTerm.trim()) {
    params.set('q', searchTerm.trim());
  } else {
    params.delete('q');
  }

  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState({}, '', newUrl);
}

function renderCategoryChips(counts = {}) {
  if (!categoryChips) {
    return;
  }

  categoryChips.innerHTML = RECIPE_CATEGORIES
    .map((category) => {
      const isActive = selectedCategory === category;
      const params = new URLSearchParams();

      if (category !== 'Всички') {
        params.set('category', category);
      }

      if (currentSearchTerm.trim()) {
        params.set('q', currentSearchTerm.trim());
      }

      const query = params.toString();
      const href = `./index.html${query ? `?${query}` : ''}`;
      const count = counts[category] ?? 0;

      return `
        <a href="${href}" class="btn btn-sm rounded-pill ${isActive ? 'btn-success' : 'btn-outline-success'} category-chip-link">
          <span>${category}</span>
          <span class="chip-count">(${count})</span>
        </a>
      `;
    })
    .join('');
}

async function loadCurrentUserFavorites() {
  try {
    currentUser = await getCurrentUser().catch(() => null);

    if (!currentUser) {
      favoriteRecipeIds = new Set();
      return;
    }

    const favoriteRecipes = await listFavoriteRecipesByUser(currentUser.id);
    favoriteRecipeIds = new Set((favoriteRecipes || []).map((recipe) => String(recipe.id)));
  } catch {
    currentUser = null;
    favoriteRecipeIds = new Set();
  }
}

function updateFavoriteButtonsForRecipe(recipeId, isActive) {
  const encodedId = encodeURIComponent(recipeId);
  const buttons = document.querySelectorAll(`[data-favorite-id="${encodedId}"]`);

  for (const button of buttons) {
    button.setAttribute('data-favorite-active', isActive ? 'true' : 'false');
    button.classList.remove(
      'btn-outline-warning',
      'btn-warning',
      'btn-outline-secondary',
      'btn-danger',
      'border-danger-subtle',
      'bg-danger-subtle',
      'text-danger'
    );

    if (isActive) {
      button.classList.add('btn-danger');
    } else {
      button.classList.add('border-danger-subtle', 'bg-danger-subtle', 'text-danger');
    }

    button.innerHTML = `
      <i class="bi bi-heart${isActive ? '-fill' : ''} me-1"></i>
      ${isActive ? 'Премахни от любими' : 'Добави в любими'}
    `;
  }
}

async function handleFavoriteButtonClick(button) {
  if (!currentUser) {
    window.location.href = './login.html';
    return;
  }

  const recipeId = decodeURIComponent(button.getAttribute('data-favorite-id') || '');

  if (!recipeId) {
    return;
  }

  button.setAttribute('disabled', 'disabled');

  try {
    const currentlyFavorited = await isRecipeFavorited(recipeId, currentUser.id);
    const nextState = await toggleRecipeFavorite(recipeId, currentUser.id, currentlyFavorited);

    if (nextState) {
      favoriteRecipeIds.add(String(recipeId));
    } else {
      favoriteRecipeIds.delete(String(recipeId));
    }

    updateFavoriteButtonsForRecipe(recipeId, nextState);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    button.removeAttribute('disabled');
  }
}

function handleRecipeCardActivation(event) {
  const card = event.target.closest('[data-recipe-url]');

  if (!card) {
    return;
  }

  const recipeUrl = card.getAttribute('data-recipe-url');

  if (recipeUrl) {
    window.location.href = recipeUrl;
  }
}

async function handleGridClick(event) {
  const favoriteButton = event.target.closest('[data-favorite-id]');

  if (favoriteButton) {
    event.preventDefault();
    await handleFavoriteButtonClick(favoriteButton);
    return;
  }

  const interactiveElement = event.target.closest('a, button, input, textarea, select, label');

  if (interactiveElement) {
    return;
  }

  handleRecipeCardActivation(event);
}

function handleGridKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  const card = event.target.closest('[data-recipe-url]');

  if (!card) {
    return;
  }

  event.preventDefault();
  handleRecipeCardActivation(event);
}

async function loadCategoryCounts(searchTerm = '') {
  try {
    const counts = await getRecipeCategoryCounts({ searchTerm });
    renderCategoryChips(counts);
  } catch {
    renderCategoryChips({});
  }
}

if (activeCategoryBadge) {
  if (selectedCategory !== 'Всички') {
    activeCategoryBadge.classList.remove('d-none');
    activeCategoryBadge.innerHTML = `<i class="bi bi-filter me-1"></i>${selectedCategory}`;
  } else {
    activeCategoryBadge.classList.add('d-none');
    activeCategoryBadge.innerHTML = '';
  }
}

async function loadFeatured() {
  if (!featuredGrid) {
    return;
  }

  featuredGrid.innerHTML = `
    <div class="col-12 text-center py-4">
      <div class="spinner-border text-success" role="status" aria-label="Зареждане"></div>
    </div>
  `;

  clearInlineMessage(featuredStatus);

  try {
    const featuredRecipes = await listFeaturedRecipes(3);

    if (!featuredRecipes.length) {
      featuredGrid.innerHTML = '';
      showInlineMessage(featuredStatus, 'Все още няма подбрани рецепти за седмицата.', 'secondary');
      return;
    }

    featuredGrid.innerHTML = featuredRecipes
      .map((recipe) => renderRecipeCard(recipe, {
        showFavoriteAction: true,
        favoriteActive: favoriteRecipeIds.has(String(recipe.id))
      }))
      .join('');
  } catch (error) {
    featuredGrid.innerHTML = '';
    showInlineMessage(featuredStatus, error.message, 'danger');
  }
}

async function loadRecipes(searchTerm = '') {
  if (!recipesGrid) {
    return;
  }

  recipesGrid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-success" role="status" aria-label="Зареждане"></div>
    </div>
  `;

  clearInlineMessage(statusMessage);

  try {
    const recipes = await listRecipes({
      searchTerm,
      category: selectedCategory
    });

    if (!recipes.length) {
      recipesGrid.innerHTML = '';
      const categoryLabel = selectedCategory !== 'Всички' ? ` в категория "${selectedCategory}"` : '';
      showInlineMessage(statusMessage, `Няма намерени рецепти${categoryLabel}. Пробвай друга ключова дума или добави нова рецепта.`, 'secondary');
      return;
    }

    recipesGrid.innerHTML = recipes
      .map((recipe) => renderRecipeCard(recipe, {
        showFavoriteAction: true,
        favoriteActive: favoriteRecipeIds.has(String(recipe.id))
      }))
      .join('');
  } catch (error) {
    recipesGrid.innerHTML = '';
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

searchForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  currentSearchTerm = String(searchInput?.value || '').trim();
  syncClearSearchButtonVisibility();
  updateHomeUrl(currentSearchTerm);
  await Promise.all([
    loadCategoryCounts(currentSearchTerm),
    loadRecipes(currentSearchTerm)
  ]);
});

async function clearSearchAndReload() {
  currentSearchTerm = '';

  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }

  syncClearSearchButtonVisibility();
  updateHomeUrl(currentSearchTerm);

  await Promise.all([
    loadCategoryCounts(currentSearchTerm),
    loadRecipes(currentSearchTerm)
  ]);
}

searchInput?.addEventListener('input', () => {
  currentSearchTerm = String(searchInput.value || '').trim();
  syncClearSearchButtonVisibility();
});

searchInput?.addEventListener('keydown', async (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  const hasQuery = String(searchInput.value || '').trim().length > 0;

  if (!hasQuery) {
    return;
  }

  event.preventDefault();
  await clearSearchAndReload();
});

clearSearchButton?.addEventListener('click', async () => {
  await clearSearchAndReload();
});

recipesGrid?.addEventListener('click', (event) => {
  void handleGridClick(event);
});

featuredGrid?.addEventListener('click', (event) => {
  void handleGridClick(event);
});

recipesGrid?.addEventListener('keydown', handleGridKeydown);
featuredGrid?.addEventListener('keydown', handleGridKeydown);

await Promise.all([
  loadCategoryCounts(initialSearchTerm),
  loadFeatured(),
  loadRecipes(initialSearchTerm)
]);

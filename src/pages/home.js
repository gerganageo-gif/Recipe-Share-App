import { renderRecipeCard } from '../components/recipeCard';
import { getRecipeCategoryCounts, listFeaturedRecipes, listRecipes } from '../services/recipeService';
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

await setupPage({ title: 'Всички рецепти' });

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

    featuredGrid.innerHTML = featuredRecipes.map((recipe) => renderRecipeCard(recipe)).join('');
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

    recipesGrid.innerHTML = recipes.map((recipe) => renderRecipeCard(recipe)).join('');
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

await Promise.all([
  loadCategoryCounts(initialSearchTerm),
  loadFeatured(),
  loadRecipes(initialSearchTerm)
]);

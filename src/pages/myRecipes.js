import { renderRecipeCard } from '../components/recipeCard';
import {
  deleteRecipe,
  deleteRecipeImage,
  listFavoriteRecipesByUser,
  listRecipesByOwner
} from '../services/recipeService';
import { requireAuth } from '../utils/guards';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { setupPage } from './shared';

const uploadedGrid = document.querySelector('#uploaded-grid');
const favoritesGrid = document.querySelector('#favorites-grid');
const statusMessage = document.querySelector('#status-message');
const uploadedStatus = document.querySelector('#uploaded-status');
const favoritesStatus = document.querySelector('#favorites-status');

await setupPage({ title: 'Моите рецепти' });

let currentUser;
let loadedRecipes = [];

try {
  currentUser = await requireAuth();

  if (!currentUser) {
    return;
  }

  await Promise.all([loadMyRecipes(), loadFavoriteRecipes()]);
} catch (error) {
  showInlineMessage(statusMessage, error.message, 'danger');
}

async function loadMyRecipes() {
  if (!uploadedGrid || !currentUser) {
    return;
  }

  uploadedGrid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-success" role="status" aria-label="Зареждане"></div>
    </div>
  `;

  clearInlineMessage(uploadedStatus);

  try {
    loadedRecipes = await listRecipesByOwner(currentUser.id);

    if (!loadedRecipes.length) {
      uploadedGrid.innerHTML = '';
      showInlineMessage(uploadedStatus, 'Все още нямаш публикувани рецепти. Добави първата си рецепта.', 'secondary');
      return;
    }

    uploadedGrid.innerHTML = loadedRecipes
      .map((recipe) => renderRecipeCard(recipe, { showOwnerActions: true, showDeleteAction: true }))
      .join('');
  } catch (error) {
    uploadedGrid.innerHTML = '';
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

async function loadFavoriteRecipes() {
  if (!favoritesGrid || !currentUser) {
    return;
  }

  favoritesGrid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-success" role="status" aria-label="Зареждане"></div>
    </div>
  `;

  clearInlineMessage(favoritesStatus);

  try {
    const favoriteRecipes = await listFavoriteRecipesByUser(currentUser.id);

    if (!favoriteRecipes.length) {
      favoritesGrid.innerHTML = '';
      showInlineMessage(favoritesStatus, 'Все още нямаш любими рецепти от други автори.', 'secondary');
      return;
    }

    favoritesGrid.innerHTML = favoriteRecipes
      .map((recipe) => renderRecipeCard(recipe))
      .join('');
  } catch (error) {
    favoritesGrid.innerHTML = '';
    showInlineMessage(statusMessage, error.message, 'danger');
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

uploadedGrid?.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('[data-delete-id]');

  if (deleteButton) {
    const recipeId = decodeURIComponent(deleteButton.getAttribute('data-delete-id') || '');

    if (!recipeId) {
      return;
    }

    const recipe = loadedRecipes.find((item) => String(item.id) === recipeId);

    if (!recipe) {
      return;
    }

    const confirmed = window.confirm('Сигурен ли си, че искаш да изтриеш тази рецепта?');

    if (!confirmed) {
      return;
    }

    deleteButton.setAttribute('disabled', 'disabled');

    try {
      await deleteRecipe(recipeId);

      if (recipe.image_path) {
        await deleteRecipeImage(recipe.image_path).catch(() => null);
      }

      await Promise.all([loadMyRecipes(), loadFavoriteRecipes()]);
    } catch (error) {
      showInlineMessage(statusMessage, error.message, 'danger');
      deleteButton.removeAttribute('disabled');
    }

    return;
  }

  const interactiveElement = event.target.closest('a, button, input, textarea, select, label');

  if (interactiveElement) {
    return;
  }

  handleRecipeCardActivation(event);
});

favoritesGrid?.addEventListener('click', (event) => {
  const interactiveElement = event.target.closest('a, button, input, textarea, select, label');

  if (interactiveElement) {
    return;
  }

  handleRecipeCardActivation(event);
});

function handleCardKeydown(event) {
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

uploadedGrid?.addEventListener('keydown', handleCardKeydown);
favoritesGrid?.addEventListener('keydown', handleCardKeydown);

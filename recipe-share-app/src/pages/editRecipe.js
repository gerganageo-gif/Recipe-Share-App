import {
  deleteRecipeImage,
  getRecipeById,
  updateRecipe,
  uploadRecipeImage
} from '../services/recipeService';
import { getCurrentUserRole } from '../services/roleService';
import { requireAuth } from '../utils/guards';
import { getQueryParam } from '../utils/query';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { isValidRecipeCategory } from '../utils/recipeCategories';
import { setupPage } from './shared';

const form = document.querySelector('#recipe-form');
const statusMessage = document.querySelector('#status-message');
const submitButton = document.querySelector('#submit-btn');
const currentImageContainer = document.querySelector('#current-image-container');
const currentImage = document.querySelector('#current-image');

await setupPage({ title: 'Редакция на рецепта' });

const recipeId = getQueryParam('id');

if (!recipeId) {
  showInlineMessage(statusMessage, 'Липсва идентификатор на рецепта.', 'warning');
}

let currentUser;
let currentUserRole = 'user';
let loadedRecipe;

try {
  currentUser = await requireAuth();

  if (!currentUser || !recipeId) {
    return;
  }

  currentUserRole = (await getCurrentUserRole().catch(() => 'user')) || 'user';

  loadedRecipe = await getRecipeById(recipeId);

  if (!loadedRecipe) {
    showInlineMessage(statusMessage, 'Рецептата не е намерена.', 'warning');
    return;
  }

  if (loadedRecipe.author_id !== currentUser.id && currentUserRole !== 'admin') {
    window.location.href = `./recipe-details.html?id=${encodeURIComponent(recipeId)}`;
    return;
  }

  fillForm(loadedRecipe);
} catch (error) {
  showInlineMessage(statusMessage, error.message, 'danger');
}

function fillForm(recipe) {
  const titleInput = document.querySelector('#title');
  const categoryInput = document.querySelector('#category');
  const descriptionInput = document.querySelector('#description');
  const ingredientsInput = document.querySelector('#ingredients');
  const instructionsInput = document.querySelector('#instructions');

  if (titleInput) {
    titleInput.value = recipe.title || '';
  }

  if (categoryInput) {
    categoryInput.value = recipe.category || 'Основни ястия';
  }

  if (descriptionInput) {
    descriptionInput.value = recipe.description || '';
  }

  if (ingredientsInput) {
    ingredientsInput.value = recipe.ingredients || '';
  }

  if (instructionsInput) {
    instructionsInput.value = recipe.instructions || '';
  }

  if (recipe.image_url && currentImageContainer && currentImage) {
    currentImageContainer.classList.remove('d-none');
    currentImage.src = recipe.image_url;
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!loadedRecipe || !currentUser) {
    return;
  }

  clearInlineMessage(statusMessage);

  const formData = new FormData(form);
  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const ingredients = String(formData.get('ingredients') || '').trim();
  const instructions = String(formData.get('instructions') || '').trim();
  const imageFile = formData.get('image');

  if (!title || !category || !description || !ingredients || !instructions) {
    showInlineMessage(statusMessage, 'Моля, попълни всички задължителни полета.', 'warning');
    return;
  }

  if (!isValidRecipeCategory(category) || category === 'Всички') {
    showInlineMessage(statusMessage, 'Моля, избери валидна категория.', 'warning');
    return;
  }

  submitButton?.setAttribute('disabled', 'disabled');

  try {
    const payload = {
      category,
      title,
      description,
      ingredients,
      instructions
    };

    if (imageFile instanceof File && imageFile.size > 0) {
      const uploadedImage = await uploadRecipeImage(imageFile, currentUser.id);
      payload.image_url = uploadedImage.imageUrl;
      payload.image_path = uploadedImage.imagePath;

      if (loadedRecipe.image_path) {
        await deleteRecipeImage(loadedRecipe.image_path).catch(() => null);
      }
    }

    const updatedRecipe = await updateRecipe(loadedRecipe.id, payload);
    showInlineMessage(statusMessage, 'Промените са запазени.', 'success');

    setTimeout(() => {
      window.location.href = `./recipe-details.html?id=${updatedRecipe.id}`;
    }, 600);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    submitButton?.removeAttribute('disabled');
  }
});

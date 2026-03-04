import { createRecipe, uploadRecipeImage } from '../services/recipeService';
import { requireAuth } from '../utils/guards';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { isValidRecipeCategory } from '../utils/recipeCategories';
import { setupPage } from './shared';

const form = document.querySelector('#recipe-form');
const statusMessage = document.querySelector('#status-message');
const submitButton = document.querySelector('#submit-btn');

await setupPage({ title: 'Нова рецепта' });

let currentUser;

try {
  currentUser = await requireAuth();

  if (!currentUser) {
    return;
  }
} catch (error) {
  showInlineMessage(statusMessage, error.message, 'danger');
}

if (!currentUser) {
  return;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
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
      author_id: currentUser.id,
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
    }

    const createdRecipe = await createRecipe(payload);
    showInlineMessage(statusMessage, 'Рецептата беше публикувана успешно.', 'success');
    setTimeout(() => {
      window.location.href = `./recipe-details.html?id=${createdRecipe.id}`;
    }, 600);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    submitButton?.removeAttribute('disabled');
  }
});

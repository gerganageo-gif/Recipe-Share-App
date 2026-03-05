import { listRecipesForAdmin, listAdminRecentActivity, listRecipeComments, deleteRecipe, deleteRecipeImage, deleteRecipeComment } from '../services/recipeService';
import { getCurrentUserRole, listUsersWithRoles, updateUserRole } from '../services/roleService';
import { requireAuth } from '../utils/guards';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { setupPage } from './shared';
import { escapeHtml, multilineToHtml } from '../utils/safeHtml';
import { formatDate, truncateText } from '../utils/formatters';
import Modal from 'bootstrap/js/dist/modal';

const INITIAL_MODERATION_RECIPES_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 5;
const usersRows = document.querySelector('#users-rows');
const recipesAdminList = document.querySelector('#recipes-admin-list');
const showAllRecipesButton = document.querySelector('#show-all-recipes-btn');
const recentActivityList = document.querySelector('#recent-activity-list');
const recentActivityStatus = document.querySelector('#recent-activity-status');
const showAllActivityButton = document.querySelector('#show-all-activity-btn');
const statusMessage = document.querySelector('#status-message');
const recipePreviewModalElement = document.querySelector('#recipe-preview-modal');
const recipePreviewTitle = document.querySelector('#recipe-preview-title');
const recipePreviewMeta = document.querySelector('#recipe-preview-meta');
const recipePreviewImage = document.querySelector('#recipe-preview-image');
const recipePreviewDescription = document.querySelector('#recipe-preview-description');
const recipePreviewIngredients = document.querySelector('#recipe-preview-ingredients');
const recipePreviewInstructions = document.querySelector('#recipe-preview-instructions');
const recipePreviewComments = document.querySelector('#recipe-preview-comments');
const recipePreviewDeleteButton = document.querySelector('#recipe-preview-delete-btn');
const recipePreviewModal = recipePreviewModalElement
  ? Modal.getOrCreateInstance(recipePreviewModalElement)
  : null;

const setupPagePromise = setupPage({ title: 'Админ панел' }).catch((error) => {
  showInlineMessage(statusMessage, `Проблем при зареждане на навигацията: ${error.message}`, 'warning');
});

let adminUser;
let users = [];
let recipes = [];
let recentActivityEvents = [];
let isShowingAllRecipes = false;
let isShowingAllActivity = false;
let activePreviewRecipeId = '';

function fallbackImage(title) {
  return `https://placehold.co/900x450?text=${encodeURIComponent(title || 'Recipe')}`;
}

async function loadRecipePreviewComments(recipeId) {
  if (!recipePreviewComments) {
    return;
  }

  const requestedRecipeId = String(recipeId || '');

  if (!requestedRecipeId) {
    recipePreviewComments.innerHTML = '<p class="small text-body-secondary mb-0">Няма коментари.</p>';
    return;
  }

  recipePreviewComments.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm text-success" role="status"></div></div>';

  try {
    const comments = await listRecipeComments(requestedRecipeId);

    if (activePreviewRecipeId !== requestedRecipeId) {
      return;
    }

    if (!comments.length) {
      recipePreviewComments.innerHTML = '<p class="small text-body-secondary mb-0">Все още няма коментари.</p>';
      return;
    }

    recipePreviewComments.innerHTML = comments
      .map((comment) => {
        const authorName = escapeHtml(comment.author?.display_name || comment.author?.email || 'Потребител');

        return `
          <article class="comment-card p-3">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
              <span class="fw-semibold small">${authorName}</span>
              <div class="d-flex align-items-center gap-2">
                <span class="small text-body-secondary">${formatDate(comment.created_at)}</span>
                <button class="btn btn-outline-danger btn-sm" data-preview-delete-comment="${encodeURIComponent(comment.id)}">
                  Изтрий
                </button>
              </div>
            </div>
            <p class="small text-body-secondary mb-0">${multilineToHtml(comment.content || '')}</p>
          </article>
        `;
      })
      .join('');
  } catch {
    if (activePreviewRecipeId !== requestedRecipeId) {
      return;
    }

    recipePreviewComments.innerHTML = '<p class="small text-danger mb-0">Грешка при зареждане на коментарите.</p>';
  }
}

async function showRecipePreview(recipe) {
  if (!recipePreviewModal || !recipe) {
    return;
  }

  activePreviewRecipeId = String(recipe.id || '');

  if (recipePreviewTitle) {
    recipePreviewTitle.textContent = recipe.title || 'Без заглавие';
  }

  if (recipePreviewMeta) {
    recipePreviewMeta.innerHTML = `
      <span class="me-3"><i class="bi bi-tag me-1"></i>${escapeHtml(recipe.category || 'Основни ястия')}</span>
      <span class="me-3"><i class="bi bi-person me-1"></i>${escapeHtml(recipe.author?.display_name || recipe.author?.email || 'Unknown')}</span>
      <span><i class="bi bi-calendar3 me-1"></i>${formatDate(recipe.created_at)}</span>
    `;
  }

  if (recipePreviewImage) {
    recipePreviewImage.src = recipe.image_url || fallbackImage(recipe.title);
    recipePreviewImage.alt = recipe.title || 'Преглед на рецепта';
  }

  if (recipePreviewDescription) {
    recipePreviewDescription.innerHTML = multilineToHtml(recipe.description || 'Няма описание.');
  }

  if (recipePreviewIngredients) {
    recipePreviewIngredients.innerHTML = multilineToHtml(recipe.ingredients || 'Няма въведени продукти.');
  }

  if (recipePreviewInstructions) {
    recipePreviewInstructions.innerHTML = multilineToHtml(recipe.instructions || 'Няма въведени инструкции.');
  }

  if (recipePreviewDeleteButton) {
    recipePreviewDeleteButton.setAttribute('data-preview-recipe-id', encodeURIComponent(activePreviewRecipeId));
    recipePreviewDeleteButton.removeAttribute('disabled');
  }

  recipePreviewModal.show();
  await loadRecipePreviewComments(activePreviewRecipeId);
}

recipePreviewDeleteButton?.addEventListener('click', async () => {
  const recipeId = decodeURIComponent(recipePreviewDeleteButton.getAttribute('data-preview-recipe-id') || activePreviewRecipeId || '');

  if (!recipeId) {
    return;
  }

  const recipe = recipes.find((item) => item.id === recipeId);
  const confirmed = window.confirm('Потвърди изтриването на тази рецепта.');

  if (!confirmed) {
    return;
  }

  recipePreviewDeleteButton.setAttribute('disabled', 'disabled');

  try {
    await deleteRecipe(recipeId);

    if (recipe?.image_path) {
      await deleteRecipeImage(recipe.image_path).catch(() => null);
    }

    recipePreviewModal?.hide();
    showInlineMessage(statusMessage, 'Рецептата беше изтрита.', 'success');
    await Promise.all([loadRecipesForModeration(), loadRecentActivity()]);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    recipePreviewDeleteButton.removeAttribute('disabled');
  }
});

recipePreviewComments?.addEventListener('click', async (event) => {
  const deleteCommentButton = event.target.closest('[data-preview-delete-comment]');

  if (!deleteCommentButton || !activePreviewRecipeId) {
    return;
  }

  const commentId = decodeURIComponent(deleteCommentButton.getAttribute('data-preview-delete-comment') || '');

  if (!commentId) {
    return;
  }

  const confirmed = window.confirm('Потвърди изтриването на този коментар.');

  if (!confirmed) {
    return;
  }

  deleteCommentButton.setAttribute('disabled', 'disabled');

  try {
    await deleteRecipeComment(commentId);
    showInlineMessage(statusMessage, 'Коментарът беше изтрит.', 'success');
    await Promise.all([loadRecipePreviewComments(activePreviewRecipeId), loadRecentActivity()]);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    deleteCommentButton.removeAttribute('disabled');
  }
});

recipePreviewModalElement?.addEventListener('hidden.bs.modal', () => {
  activePreviewRecipeId = '';

  if (recipePreviewComments) {
    recipePreviewComments.innerHTML = '';
  }

  if (recipePreviewDeleteButton) {
    recipePreviewDeleteButton.removeAttribute('data-preview-recipe-id');
    recipePreviewDeleteButton.removeAttribute('disabled');
  }
});

await initializeAdminPage();

await setupPagePromise;

async function initializeAdminPage() {
  try {
    showInlineMessage(statusMessage, 'Зареждане на админ секциите...', 'info');

    const authenticatedUser = await requireAuth();

    if (!authenticatedUser) {
      return;
    }

    const role = await getCurrentUserRole();

    if (role !== 'admin') {
      showInlineMessage(statusMessage, 'Достъпът до админ панела е само за профили с роля admin.', 'warning');
      return;
    }

    adminUser = authenticatedUser;

    if (!adminUser) {
      return;
    }

    await Promise.all([loadUsers(), loadRecipesForModeration(), loadRecentActivity()]);
    clearInlineMessage(statusMessage);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

async function loadRecentActivity() {
  if (!recentActivityList) {
    return;
  }

  if (showAllActivityButton) {
    showAllActivityButton.classList.add('d-none');
    showAllActivityButton.setAttribute('disabled', 'disabled');
  }

  recentActivityList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-success" role="status"></div></div>';
  clearInlineMessage(recentActivityStatus);

  try {
    recentActivityEvents = await listAdminRecentActivity();

    if (!recentActivityEvents.length) {
      recentActivityList.innerHTML = '';
      showInlineMessage(recentActivityStatus, 'Все още няма събития.', 'secondary');
      return;
    }

    renderRecentActivity();
  } catch (error) {
    recentActivityEvents = [];
    recentActivityList.innerHTML = '';
    showInlineMessage(recentActivityStatus, 'Грешка при зареждане на събитията.', 'danger');
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

function renderRecentActivity() {
  if (!recentActivityList) {
    return;
  }

  const visibleEvents = isShowingAllActivity
    ? recentActivityEvents
    : recentActivityEvents.slice(0, RECENT_ACTIVITY_LIMIT);

  recentActivityList.innerHTML = visibleEvents
      .map((event) => {
        const actorName = escapeHtml(event.actor_name || 'Потребител');
        const createdAt = formatDate(event.created_at);

        if (event.type === 'recipe') {
          return `
            <article class="moderation-card p-3">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div class="fw-semibold mb-1"><i class="bi bi-journal-plus text-success me-1"></i>Добавена рецепта</div>
                  <p class="small mb-1">${escapeHtml(event.recipe_title || 'Без заглавие')}</p>
                  <p class="small text-body-secondary mb-0"><i class="bi bi-person me-1"></i>${actorName}</p>
                </div>
                <span class="small text-body-secondary">${createdAt}</span>
              </div>
            </article>
          `;
        }

        return `
          <article class="moderation-card p-3">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-semibold mb-1"><i class="bi bi-chat-left-text text-primary me-1"></i>Нов коментар</div>
                <p class="small mb-1">Към: ${escapeHtml(event.recipe_title || 'Неизвестна рецепта')}</p>
                <p class="small text-body-secondary mb-1">${escapeHtml(truncateText(event.content || '', 110))}</p>
                <p class="small text-body-secondary mb-0"><i class="bi bi-person me-1"></i>${actorName}</p>
              </div>
              <span class="small text-body-secondary">${createdAt}</span>
            </div>
          </article>
        `;
      })
      .join('');

  if (!showAllActivityButton) {
    return;
  }

  const shouldShowButton = !isShowingAllActivity && recentActivityEvents.length > RECENT_ACTIVITY_LIMIT;

  if (shouldShowButton) {
    showAllActivityButton.classList.remove('d-none');
    showAllActivityButton.removeAttribute('disabled');
    return;
  }

  showAllActivityButton.classList.add('d-none');
  showAllActivityButton.setAttribute('disabled', 'disabled');
}

showAllActivityButton?.addEventListener('click', () => {
  isShowingAllActivity = true;
  renderRecentActivity();
});

async function loadUsers() {
  if (!usersRows) {
    return;
  }

  usersRows.innerHTML = '<tr><td colspan="3" class="text-center py-4"><div class="spinner-border spinner-border-sm text-success" role="status"></div></td></tr>';

  try {
    users = await listUsersWithRoles();

    if (!users.length) {
      usersRows.innerHTML = '<tr><td colspan="3" class="text-body-secondary">Няма налични потребители.</td></tr>';
      return;
    }

    usersRows.innerHTML = users
      .map((entry) => {
        const profile = entry.profile ?? {};
        const isSelf = adminUser && entry.user_id === adminUser.id;

        return `
          <tr>
            <td>
              <div class="fw-semibold d-flex align-items-center gap-2">
                <i class="bi bi-person-circle text-success"></i>
                <span>${escapeHtml(profile.display_name || 'Без име')}</span>
              </div>
              <div class="small text-body-secondary">${escapeHtml(profile.email || 'no-email')}</div>
            </td>
            <td>
              <select class="form-select form-select-sm" data-role-select="${entry.user_id}" ${isSelf ? 'disabled' : ''}>
                <option value="user" ${entry.role === 'user' ? 'selected' : ''}>user</option>
                <option value="admin" ${entry.role === 'admin' ? 'selected' : ''}>admin</option>
              </select>
            </td>
            <td class="text-end">
              <button class="btn btn-outline-success btn-sm" data-save-role="${entry.user_id}" ${isSelf ? 'disabled' : ''}>
                Запази
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    usersRows.innerHTML = '<tr><td colspan="3" class="text-danger">Грешка при зареждане на потребителите.</td></tr>';
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

usersRows?.addEventListener('click', async (event) => {
  const saveButton = event.target.closest('[data-save-role]');

  if (!saveButton) {
    return;
  }

  const userId = saveButton.getAttribute('data-save-role');
  const select = usersRows.querySelector(`[data-role-select="${userId}"]`);
  const role = select?.value;

  if (!userId || !role) {
    return;
  }

  saveButton.setAttribute('disabled', 'disabled');
  clearInlineMessage(statusMessage);

  try {
    await updateUserRole(userId, role);
    showInlineMessage(statusMessage, 'Ролята е обновена успешно.', 'success');
    await loadUsers();
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    saveButton.removeAttribute('disabled');
  }
});

async function loadRecipesForModeration() {
  if (!recipesAdminList) {
    return;
  }

  if (showAllRecipesButton) {
    showAllRecipesButton.classList.add('d-none');
    showAllRecipesButton.setAttribute('disabled', 'disabled');
  }

  recipesAdminList.innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-border-sm text-success" role="status"></div></div>';

  try {
    recipes = await listRecipesForAdmin();

    if (!recipes.length) {
      recipesAdminList.innerHTML = '<p class="text-body-secondary mb-0">Няма рецепти за модерация.</p>';

      if (showAllRecipesButton) {
        showAllRecipesButton.classList.add('d-none');
        showAllRecipesButton.setAttribute('disabled', 'disabled');
      }

      return;
    }

    renderModerationRecipes();
  } catch (error) {
    recipesAdminList.innerHTML = '<p class="text-danger mb-0">Грешка при зареждане на рецептите.</p>';

    if (showAllRecipesButton) {
      showAllRecipesButton.classList.add('d-none');
      showAllRecipesButton.setAttribute('disabled', 'disabled');
    }

    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

function renderModerationRecipes() {
  if (!recipesAdminList) {
    return;
  }

  const visibleRecipes = isShowingAllRecipes
    ? recipes
    : recipes.slice(0, INITIAL_MODERATION_RECIPES_LIMIT);

  recipesAdminList.innerHTML = visibleRecipes
      .map((recipe) => `
        <article class="moderation-card p-3">
          <div class="d-flex justify-content-between gap-2 align-items-start">
            <div>
              <h3 class="h6 mb-1 d-flex align-items-center gap-2"><i class="bi bi-journal-text text-success"></i>${escapeHtml(recipe.title)}</h3>
              <p class="small text-body-secondary mb-1"><i class="bi bi-tag me-1"></i>${escapeHtml(recipe.category || 'Основни ястия')}</p>
              <p class="small text-body-secondary mb-1"><i class="bi bi-person me-1"></i>Автор: ${escapeHtml(recipe.author?.display_name || recipe.author?.email || 'Unknown')}</p>
              <p class="small text-body-secondary mb-0"><i class="bi bi-calendar3 me-1"></i>${formatDate(recipe.created_at)}</p>
            </div>
            <div class="d-flex flex-column flex-sm-row gap-2">
              <button class="btn btn-outline-secondary btn-sm" data-admin-preview-recipe="${encodeURIComponent(recipe.id)}">
                <i class="bi bi-eye me-1"></i>Покажи
              </button>
              <button class="btn btn-outline-danger btn-sm" data-admin-delete-recipe="${encodeURIComponent(recipe.id)}">
                <i class="bi bi-trash me-1"></i>Изтрий
              </button>
            </div>
          </div>
          <p class="small text-body-secondary mt-2 mb-0">${escapeHtml(truncateText(recipe.description, 90))}</p>
        </article>
      `)
      .join('');

  if (!showAllRecipesButton) {
    return;
  }

  const shouldShowButton = !isShowingAllRecipes && recipes.length > INITIAL_MODERATION_RECIPES_LIMIT;

  if (shouldShowButton) {
    showAllRecipesButton.classList.remove('d-none');
    showAllRecipesButton.removeAttribute('disabled');
    return;
  }

  showAllRecipesButton.classList.add('d-none');
  showAllRecipesButton.setAttribute('disabled', 'disabled');
}

showAllRecipesButton?.addEventListener('click', () => {
  isShowingAllRecipes = true;
  renderModerationRecipes();
});

recipesAdminList?.addEventListener('click', async (event) => {
  const previewButton = event.target.closest('[data-admin-preview-recipe]');

  if (previewButton) {
    const recipeId = decodeURIComponent(previewButton.getAttribute('data-admin-preview-recipe') || '');

    if (!recipeId) {
      return;
    }

    const recipe = recipes.find((item) => item.id === recipeId);

    if (!recipe) {
      return;
    }

    await showRecipePreview(recipe);
    return;
  }

  const deleteButton = event.target.closest('[data-admin-delete-recipe]');

  if (!deleteButton) {
    return;
  }

  const recipeId = decodeURIComponent(deleteButton.getAttribute('data-admin-delete-recipe') || '');

  if (!recipeId) {
    return;
  }

  const recipe = recipes.find((item) => item.id === recipeId);

  if (!recipe) {
    return;
  }

  const confirmed = window.confirm('Потвърди изтриването на тази рецепта.');

  if (!confirmed) {
    return;
  }

  deleteButton.setAttribute('disabled', 'disabled');

  try {
    await deleteRecipe(recipeId);

    if (recipe.image_path) {
      await deleteRecipeImage(recipe.image_path).catch(() => null);
    }

    showInlineMessage(statusMessage, 'Рецептата беше изтрита.', 'success');
    await Promise.all([loadRecipesForModeration(), loadRecentActivity()]);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    deleteButton.removeAttribute('disabled');
  }
});

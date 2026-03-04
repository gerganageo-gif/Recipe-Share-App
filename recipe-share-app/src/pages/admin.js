import { listRecipesForAdmin, deleteRecipe, deleteRecipeImage } from '../services/recipeService';
import { listUsersWithRoles, updateUserRole } from '../services/roleService';
import { requireAdmin } from '../utils/guards';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { setupPage } from './shared';
import { escapeHtml } from '../utils/safeHtml';
import { formatDate, truncateText } from '../utils/formatters';

const usersRows = document.querySelector('#users-rows');
const recipesAdminList = document.querySelector('#recipes-admin-list');
const statusMessage = document.querySelector('#status-message');

await setupPage({ title: 'Админ панел' });

let adminUser;
let users = [];
let recipes = [];

try {
  adminUser = await requireAdmin();

  if (!adminUser) {
    return;
  }

  await Promise.all([loadUsers(), loadRecipesForModeration()]);
} catch (error) {
  showInlineMessage(statusMessage, error.message, 'danger');
}

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

  recipesAdminList.innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-border-sm text-success" role="status"></div></div>';

  try {
    recipes = await listRecipesForAdmin(20);

    if (!recipes.length) {
      recipesAdminList.innerHTML = '<p class="text-body-secondary mb-0">Няма рецепти за модерация.</p>';
      return;
    }

    recipesAdminList.innerHTML = recipes
      .map((recipe) => `
        <article class="moderation-card p-3">
          <div class="d-flex justify-content-between gap-2 align-items-start">
            <div>
              <h3 class="h6 mb-1 d-flex align-items-center gap-2"><i class="bi bi-journal-text text-success"></i>${escapeHtml(recipe.title)}</h3>
              <p class="small text-body-secondary mb-1"><i class="bi bi-tag me-1"></i>${escapeHtml(recipe.category || 'Основни ястия')}</p>
              <p class="small text-body-secondary mb-1"><i class="bi bi-person me-1"></i>Автор: ${escapeHtml(recipe.author?.display_name || recipe.author?.email || 'Unknown')}</p>
              <p class="small text-body-secondary mb-0"><i class="bi bi-calendar3 me-1"></i>${formatDate(recipe.created_at)}</p>
            </div>
            <button class="btn btn-outline-danger btn-sm" data-admin-delete-recipe="${encodeURIComponent(recipe.id)}">
              <i class="bi bi-trash me-1"></i>Изтрий
            </button>
          </div>
          <p class="small text-body-secondary mt-2 mb-0">${escapeHtml(truncateText(recipe.description, 90))}</p>
        </article>
      `)
      .join('');
  } catch (error) {
    recipesAdminList.innerHTML = '<p class="text-danger mb-0">Грешка при зареждане на рецептите.</p>';
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

recipesAdminList?.addEventListener('click', async (event) => {
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
    await loadRecipesForModeration();
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    deleteButton.removeAttribute('disabled');
  }
});

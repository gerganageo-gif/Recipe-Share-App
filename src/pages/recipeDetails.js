import { getCurrentUser } from '../services/authService';
import { getCurrentUserRole } from '../services/roleService';
import {
  countRecipeFavorites,
  createRecipeComment,
  deleteRecipe,
  deleteRecipeComment,
  deleteRecipeImage,
  getRecipeById,
  isRecipeFavorited,
  listRecipeComments,
  toggleRecipeFavorite
} from '../services/recipeService';
import { formatDate } from '../utils/formatters';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { getQueryParam } from '../utils/query';
import { escapeHtml, multilineToHtml } from '../utils/safeHtml';
import { setupPage } from './shared';

const contentContainer = document.querySelector('#recipe-content');
const statusMessage = document.querySelector('#status-message');
const commentsList = document.querySelector('#comments-list');
const commentForm = document.querySelector('#comment-form');
const commentStatus = document.querySelector('#comment-status');

await setupPage({ title: 'Детайли на рецепта' });

const recipeId = getQueryParam('id');

let currentUser = null;
let currentUserRole = 'user';
let currentRecipe = null;
let recipeComments = [];
let isFavorited = false;
let favoritesCount = 0;

if (!recipeId) {
  showInlineMessage(statusMessage, 'Липсва идентификатор на рецепта.', 'warning');
} else {
  await initializePage(recipeId);
}

async function initializePage(id) {
  try {
    currentUser = await getCurrentUser().catch(() => null);

    if (currentUser) {
      currentUserRole = (await getCurrentUserRole().catch(() => 'user')) || 'user';
    }

    await Promise.all([loadRecipe(id), loadComments(id)]);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

function fallbackImage(title) {
  return `https://placehold.co/900x450?text=${encodeURIComponent(title || 'Recipe')}`;
}

function toListItems(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');
}

function canModerate() {
  return currentUserRole === 'admin';
}

function canDeleteComment(comment) {
  return Boolean(currentUser && (comment.author_id === currentUser.id || canModerate()));
}

async function loadRecipe(id) {
  if (!contentContainer) {
    return;
  }

  contentContainer.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-success" role="status" aria-label="Зареждане"></div>
    </div>
  `;

  try {
    const recipe = await getRecipeById(id);

    if (!recipe) {
      contentContainer.innerHTML = '';
      showInlineMessage(statusMessage, 'Рецептата не е намерена.', 'warning');
      return;
    }

    currentRecipe = recipe;

    if (currentUser) {
      const [favoriteState, totalFavorites] = await Promise.all([
        isRecipeFavorited(recipe.id, currentUser.id),
        countRecipeFavorites(recipe.id)
      ]);

      isFavorited = favoriteState;
      favoritesCount = totalFavorites;
    } else {
      favoritesCount = await countRecipeFavorites(recipe.id).catch(() => 0);
      isFavorited = false;
    }

    const isOwner = currentUser?.id === recipe.author_id;
    const canManageRecipe = isOwner || canModerate();
    const imageUrl = recipe.image_url ? escapeHtml(recipe.image_url) : fallbackImage(recipe.title);
    const authorName = escapeHtml(recipe.author?.display_name || recipe.author?.email || 'Потребител');
    const category = escapeHtml(recipe.category || 'Основни ястия');

    contentContainer.innerHTML = `
      <div class="card shadow-sm border-0 section-card recipe-details-card">
        <img src="${imageUrl}" alt="${escapeHtml(recipe.title)}" class="recipe-image-lg rounded-top">
        <div class="card-body p-4">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h1 class="h3 mb-1">${escapeHtml(recipe.title)}</h1>
              <p class="text-body-secondary mb-3">
                <span class="me-3"><i class="bi bi-person me-1"></i>${authorName}</span>
                <span class="me-3"><i class="bi bi-tag me-1"></i>${category}</span>
                <i class="bi bi-calendar3 me-1"></i>Публикувана на ${formatDate(recipe.created_at)}
              </p>
            </div>
            ${canManageRecipe ? `
              <div class="d-flex gap-2">
                <a href="./edit-recipe.html?id=${encodeURIComponent(recipe.id)}" class="btn btn-outline-secondary btn-sm">
                  <i class="bi bi-pencil me-1"></i>Редактирай
                </a>
                <button id="delete-recipe-btn" class="btn btn-outline-danger btn-sm">
                  <i class="bi bi-trash me-1"></i>Изтрий
                </button>
              </div>
            ` : ''}
          </div>

          ${currentUser ? `
            <button id="favorite-btn" class="btn btn-outline-warning btn-sm mb-3">
              <i class="bi bi-heart${isFavorited ? '-fill' : ''} me-1"></i>
              ${isFavorited ? 'Премахни от любими' : 'Добави в любими'} (${favoritesCount})
            </button>
          ` : `
            <p class="small text-body-secondary mb-3"><a href="./login.html">Влез</a>, за да добавяш в любими.</p>
          `}

          <h2 class="h5 mt-3 section-title"><i class="bi bi-card-text"></i>Описание</h2>
          <div class="content-block mb-3">
            <p class="text-body-secondary mb-0">${multilineToHtml(recipe.description)}</p>
          </div>

          <div class="row g-4 mt-1">
            <div class="col-12 col-lg-5">
              <h2 class="h5 section-title"><i class="bi bi-basket2"></i>Продукти</h2>
              <div class="content-block">
                <ul class="mb-0">${toListItems(recipe.ingredients)}</ul>
              </div>
            </div>
            <div class="col-12 col-lg-7">
              <h2 class="h5 section-title"><i class="bi bi-list-check"></i>Начин на приготвяне</h2>
              <div class="content-block">
                <p class="mb-0">${multilineToHtml(recipe.instructions)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (commentForm) {
      if (currentUser) {
        commentForm.classList.remove('d-none');
      } else {
        commentForm.classList.add('d-none');
      }
    }

    const deleteButton = document.querySelector('#delete-recipe-btn');
    const favoriteButton = document.querySelector('#favorite-btn');

    if (deleteButton) {
      deleteButton.addEventListener('click', async () => {
        const confirmed = window.confirm('Сигурен ли си, че искаш да изтриеш тази рецепта?');

        if (!confirmed) {
          return;
        }

        deleteButton.setAttribute('disabled', 'disabled');

        try {
          await deleteRecipe(recipe.id);

          if (recipe.image_path) {
            await deleteRecipeImage(recipe.image_path).catch(() => null);
          }

          window.location.href = './my-recipes.html';
        } catch (error) {
          showInlineMessage(statusMessage, error.message, 'danger');
          deleteButton.removeAttribute('disabled');
        }
      });
    }

    if (favoriteButton && currentUser) {
      favoriteButton.addEventListener('click', async () => {
        favoriteButton.setAttribute('disabled', 'disabled');

        try {
          isFavorited = await toggleRecipeFavorite(currentRecipe.id, currentUser.id, isFavorited);
          favoritesCount = await countRecipeFavorites(currentRecipe.id);

          favoriteButton.innerHTML = `
            <i class="bi bi-heart${isFavorited ? '-fill' : ''} me-1"></i>
            ${isFavorited ? 'Премахни от любими' : 'Добави в любими'} (${favoritesCount})
          `;
        } catch (error) {
          showInlineMessage(statusMessage, error.message, 'danger');
        } finally {
          favoriteButton.removeAttribute('disabled');
        }
      });
    }
  } catch (error) {
    contentContainer.innerHTML = '';
    showInlineMessage(statusMessage, error.message, 'danger');
  }
}

async function loadComments(id) {
  if (!commentsList) {
    return;
  }

  commentsList.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-success" role="status" aria-label="Зареждане"></div>
    </div>
  `;

  try {
    recipeComments = await listRecipeComments(id);
    renderComments();
  } catch (error) {
    commentsList.innerHTML = '';
    showInlineMessage(commentStatus, error.message, 'danger');
  }
}

function renderComments() {
  if (!commentsList) {
    return;
  }

  if (!recipeComments.length) {
    commentsList.innerHTML = '<p class="text-body-secondary mb-0"><i class="bi bi-chat-left-text me-1"></i>Все още няма коментари.</p>';
    return;
  }

  commentsList.innerHTML = recipeComments
    .map((comment) => {
      const authorName = escapeHtml(comment.author?.display_name || comment.author?.email || 'Потребител');

      return `
        <article class="comment-card p-3 mb-2">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <div class="fw-semibold">${authorName}</div>
              <div class="small text-body-secondary">${formatDate(comment.created_at)}</div>
            </div>
            ${canDeleteComment(comment)
              ? `<button class="btn btn-outline-danger btn-sm" data-delete-comment="${encodeURIComponent(comment.id)}">Изтрий</button>`
              : ''}
          </div>
          <p class="mb-0">${multilineToHtml(comment.content)}</p>
        </article>
      `;
    })
    .join('');
}

commentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearInlineMessage(commentStatus);

  if (!currentUser || !currentRecipe) {
    window.location.href = './login.html';
    return;
  }

  const submitButton = commentForm.querySelector('button[type="submit"]');
  const formData = new FormData(commentForm);
  const content = String(formData.get('content') || '').trim();

  if (content.length < 2) {
    showInlineMessage(commentStatus, 'Коментарът трябва да е минимум 2 символа.', 'warning');
    return;
  }

  submitButton?.setAttribute('disabled', 'disabled');

  try {
    await createRecipeComment({
      recipe_id: currentRecipe.id,
      author_id: currentUser.id,
      content
    });

    commentForm.reset();
    await loadComments(currentRecipe.id);
    showInlineMessage(commentStatus, 'Коментарът е публикуван.', 'success');
  } catch (error) {
    showInlineMessage(commentStatus, error.message, 'danger');
  } finally {
    submitButton?.removeAttribute('disabled');
  }
});

commentsList?.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('[data-delete-comment]');

  if (!deleteButton || !currentRecipe) {
    return;
  }

  const commentId = decodeURIComponent(deleteButton.getAttribute('data-delete-comment') || '');
  const comment = recipeComments.find((item) => item.id === commentId);

  if (!comment || !canDeleteComment(comment)) {
    return;
  }

  const confirmed = window.confirm('Сигурен ли си, че искаш да изтриеш този коментар?');

  if (!confirmed) {
    return;
  }

  deleteButton.setAttribute('disabled', 'disabled');

  try {
    await deleteRecipeComment(commentId);
    await loadComments(currentRecipe.id);
  } catch (error) {
    showInlineMessage(commentStatus, error.message, 'danger');
    deleteButton.removeAttribute('disabled');
  }
});

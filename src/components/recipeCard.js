import { formatDate, truncateText } from '../utils/formatters';
import { escapeHtml } from '../utils/safeHtml';

function fallbackImage(title) {
  const text = encodeURIComponent(title || 'Recipe');
  return `https://placehold.co/600x360?text=${text}`;
}

export function renderRecipeCard(recipe, { showOwnerActions = false, showDeleteAction = false } = {}) {
  const recipeId = encodeURIComponent(recipe.id);
  const imageSrc = recipe.image_url ? escapeHtml(recipe.image_url) : fallbackImage(recipe.title);
  const title = escapeHtml(recipe.title);
  const description = escapeHtml(truncateText(recipe.description, 120));
  const authorName = escapeHtml(recipe.author?.display_name || recipe.author?.email || 'Готвач от общността');
  const category = escapeHtml(recipe.category || 'Основни ястия');

  return `
    <article class="col">
      <div class="card h-100 shadow-sm border-0 recipe-card">
        <div class="position-relative">
          <img src="${imageSrc}" class="card-img-top recipe-cover" alt="${title}">
          <span class="badge text-bg-light position-absolute top-0 end-0 m-2 border">
            <i class="bi bi-tag me-1"></i>${category}
          </span>
        </div>
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-2">${title}</h5>
          <p class="text-body-secondary small mb-3">
            <span class="me-3"><i class="bi bi-person me-1"></i>${authorName}</span>
            <span><i class="bi bi-calendar3 me-1"></i>${formatDate(recipe.created_at)}</span>
          </p>
          <p class="card-text text-body-secondary flex-grow-1">${description}</p>
          <div class="d-flex gap-2 mt-3">
            <a href="./recipe-details.html?id=${recipeId}" class="btn btn-success btn-sm">
              <i class="bi bi-book me-1"></i>Преглед
            </a>
            ${showOwnerActions ? `<a href="./edit-recipe.html?id=${recipeId}" class="btn btn-outline-secondary btn-sm"><i class="bi bi-pencil me-1"></i>Редактирай</a>` : ''}
            ${showDeleteAction ? `<button class="btn btn-outline-danger btn-sm" data-delete-id="${recipeId}"><i class="bi bi-trash me-1"></i>Изтрий</button>` : ''}
          </div>
        </div>
      </div>
    </article>
  `;
}

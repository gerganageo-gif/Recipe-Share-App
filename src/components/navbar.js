import { getCurrentUser, signOutUser } from '../services/authService';
import { getCurrentUserRole } from '../services/roleService';
import { APP_NAME } from '../config';
import { buildLoginRedirectUrl } from '../utils/authRedirect';
import { RECIPE_CATEGORIES } from '../utils/recipeCategories';

function navLinkClass(currentPage, hrefPage) {
  return currentPage === hrefPage ? 'nav-link active' : 'nav-link';
}

export async function renderNavbar() {
  const navbarRoot = document.querySelector('#navbar-root');

  if (!navbarRoot) {
    return;
  }

  let currentUser = null;
  let currentRole = null;

  try {
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }

  if (currentUser) {
    try {
      currentRole = await getCurrentUserRole();
    } catch {
      currentRole = 'user';
    }
  } else {
    currentRole = null;
  }

  const displayName = currentUser?.user_metadata?.display_name || currentUser?.email;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const searchParams = new URLSearchParams(window.location.search);
  const selectedCategory = searchParams.get('category') || '';
  const activeSearchQuery = String(searchParams.get('q') || '').trim();
  const roleBadge = currentRole === 'admin'
    ? '<span class="badge text-bg-warning-subtle border border-warning-subtle text-warning-emphasis">admin</span>'
    : '<span class="badge text-bg-secondary">user</span>';

  const categoryLink = (category = '') => {
    const params = new URLSearchParams();

    if (category) {
      params.set('category', category);
    }

    if (activeSearchQuery) {
      params.set('q', activeSearchQuery);
    }

    const query = params.toString();
    return `./all-recipes.html${query ? `?${query}` : ''}`;
  };

  const categoriesMenu = RECIPE_CATEGORIES
    .filter((category) => category !== 'Всички')
    .map((category) => {
      const isActive = currentPage === 'all-recipes.html' && selectedCategory === category;
      return `<li><a class="dropdown-item ${isActive ? 'active' : ''}" href="${categoryLink(category)}">${category}</a></li>`;
    })
    .join('');

  const categoryNavClass = currentPage === 'all-recipes.html' && selectedCategory ? 'nav-link dropdown-toggle active' : 'nav-link dropdown-toggle';
  const loginHref = buildLoginRedirectUrl();
  const myRecipesHref = currentUser ? './my-recipes.html' : loginHref;
  const profileHref = currentUser ? './profile.html' : loginHref;

  navbarRoot.innerHTML = `
    <nav class="navbar navbar-expand-lg bg-success-subtle border-bottom app-navbar shadow-sm">
      <div class="container">
        <a class="navbar-brand fw-semibold text-success" href="./index.html">
          <i class="bi bi-journal-richtext me-2"></i>${APP_NAME}
        </a>
        ${!currentUser
          ? `<div class="d-flex align-items-center gap-2 ms-auto me-2 d-lg-none">
               <a class="btn btn-outline-success btn-sm" href="${loginHref}">Вход</a>
               <a class="btn btn-success btn-sm" href="./register.html">Регистрация</a>
             </div>`
          : ''}
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-nav" aria-controls="main-nav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="main-nav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="${navLinkClass(currentPage, 'index.html')}" href="./index.html">Начало</a></li>
            <li class="nav-item"><a class="${navLinkClass(currentPage, 'all-recipes.html')}" href="./all-recipes.html">Всички рецепти</a></li>
            <li class="nav-item dropdown">
              <a class="${categoryNavClass}" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Категории</a>
              <ul class="dropdown-menu shadow-sm">
                <li><a class="dropdown-item ${currentPage === 'all-recipes.html' && !selectedCategory ? 'active' : ''}" href="${categoryLink()}">Всички</a></li>
                <li><hr class="dropdown-divider"></li>
                ${categoriesMenu}
              </ul>
            </li>
            <li class="nav-item"><a class="${navLinkClass(currentPage, 'my-recipes.html')}" href="${myRecipesHref}">Моите рецепти</a></li>
            <li class="nav-item"><a class="${navLinkClass(currentPage, 'profile.html')}" href="${profileHref}">Моят профил</a></li>
            ${currentUser && currentRole === 'admin' ? `<li class="nav-item"><a class="${navLinkClass(currentPage, 'admin.html')}" href="./admin.html">Админ</a></li>` : ''}
          </ul>
           <div class="${currentUser ? 'd-flex align-items-center gap-2 flex-wrap' : 'd-none d-lg-flex align-items-center gap-2 flex-wrap'}">
            ${currentUser
              ? `<span class="small text-body-secondary me-1"><i class="bi bi-person-circle me-1"></i>${displayName}</span>
                ${roleBadge}
                 <button id="logout-btn" class="btn btn-outline-danger btn-sm"><i class="bi bi-box-arrow-right me-1"></i>Изход</button>`
              : `<a class="btn btn-outline-success btn-sm" href="${loginHref}">Вход</a>
                 <a class="btn btn-success btn-sm" href="./register.html">Регистрация</a>`}
          </div>
        </div>
      </div>
    </nav>
  `;

  const logoutButton = navbarRoot.querySelector('#logout-btn');

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await signOutUser();
        window.location.href = './index.html';
      } catch (error) {
        window.alert(error.message);
      }
    });
  }
}

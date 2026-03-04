import { getCurrentUser, signOutUser } from '../services/authService';
import { getCurrentUserRole } from '../services/roleService';
import {
  countMyUnreadNotifications,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../services/notificationService';
import { APP_NAME } from '../config';
import { buildLoginRedirectUrl } from '../utils/authRedirect';
import { RECIPE_CATEGORIES } from '../utils/recipeCategories';
import { escapeHtml } from '../utils/safeHtml';

const NOTIFICATION_PREVIEW_LIMIT = 8;

function navLinkClass(currentPage, hrefPage) {
  return currentPage === hrefPage ? 'nav-link active' : 'nav-link';
}

function notificationIcon(type) {
  return type === 'comment' ? 'bi-chat-left-text' : 'bi-heart-fill';
}

function formatNotificationDate(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('bg-BG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed);
}

function buildNotificationText(notification) {
  const actorName = escapeHtml(notification.actor?.display_name || notification.actor?.email || 'Потребител');
  const recipeTitle = escapeHtml(notification.recipe?.title || 'Ваша рецепта');

  if (notification.type === 'comment') {
    return `${actorName} коментира вашата рецепта "${recipeTitle}".`;
  }

  return `${actorName} добави вашата рецепта "${recipeTitle}" към любими.`;
}

function buildNotificationHref(notification) {
  const baseHref = `./recipe-details.html?id=${encodeURIComponent(notification.recipe_id)}`;
  return notification.type === 'comment' ? `${baseHref}#comments-list` : baseHref;
}

function updateUnreadBadge(badgeElement, unreadCount) {
  if (!badgeElement) {
    return;
  }

  if (!unreadCount) {
    badgeElement.classList.add('d-none');
    badgeElement.textContent = '0';
    return;
  }

  badgeElement.classList.remove('d-none');
  badgeElement.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
}

function renderNotificationItems(notifications) {
  if (!notifications.length) {
    return `
      <div class="px-3 py-3 small text-body-secondary">
        Нямате известия към момента.
      </div>
    `;
  }

  return notifications
    .map((notification) => {
      const itemClasses = notification.is_read
        ? 'notification-item list-group-item list-group-item-action border-0 rounded-0'
        : 'notification-item notification-item-unread list-group-item list-group-item-action border-0 rounded-0';

      return `
        <a
          href="${buildNotificationHref(notification)}"
          class="${itemClasses}"
          data-notification-id="${encodeURIComponent(notification.id)}"
        >
          <div class="d-flex gap-2 align-items-start">
            <i class="bi ${notificationIcon(notification.type)} text-success notification-icon"></i>
            <div class="flex-grow-1">
              <p class="small mb-1">${buildNotificationText(notification)}</p>
              <p class="small text-body-secondary mb-0">${escapeHtml(formatNotificationDate(notification.created_at))}</p>
            </div>
          </div>
        </a>
      `;
    })
    .join('');
}

async function setupNavbarNotifications(navbarRoot, userId) {
  const listElement = navbarRoot.querySelector('#notifications-list');
  const statusElement = navbarRoot.querySelector('#notifications-status');
  const unreadBadge = navbarRoot.querySelector('#notifications-unread-badge');
  const markAllButton = navbarRoot.querySelector('#mark-all-notifications-read-btn');
  const dropdownElement = navbarRoot.querySelector('#notifications-dropdown');

  if (!listElement || !statusElement || !unreadBadge || !markAllButton) {
    return;
  }

  const loadNotifications = async () => {
    statusElement.innerHTML = '';
    listElement.innerHTML = '<div class="px-3 py-3 small text-body-secondary">Зареждане...</div>';

    try {
      const [notifications, unreadCount] = await Promise.all([
        listMyNotifications(userId, NOTIFICATION_PREVIEW_LIMIT),
        countMyUnreadNotifications(userId)
      ]);

      listElement.innerHTML = renderNotificationItems(notifications);
      updateUnreadBadge(unreadBadge, unreadCount);

      if (unreadCount > 0) {
        markAllButton.removeAttribute('disabled');
      } else {
        markAllButton.setAttribute('disabled', 'disabled');
      }
    } catch (error) {
      statusElement.innerHTML = `<p class="small text-danger mb-2 px-3">${escapeHtml(error.message || 'Проблем при зареждане на известия.')}</p>`;
      listElement.innerHTML = '<div class="px-3 py-3 small text-body-secondary">Опитай отново след малко.</div>';
      updateUnreadBadge(unreadBadge, 0);
      markAllButton.setAttribute('disabled', 'disabled');
    }
  };

  markAllButton.addEventListener('click', async () => {
    markAllButton.setAttribute('disabled', 'disabled');

    try {
      await markAllNotificationsAsRead(userId);
    } catch (error) {
      statusElement.innerHTML = `<p class="small text-danger mb-2 px-3">${escapeHtml(error.message || 'Проблем при обновяване на известията.')}</p>`;
    }

    await loadNotifications();
  });

  listElement.addEventListener('click', async (event) => {
    const notificationLink = event.target.closest('[data-notification-id]');

    if (!notificationLink) {
      return;
    }

    event.preventDefault();
    const notificationId = decodeURIComponent(notificationLink.getAttribute('data-notification-id') || '');
    const targetHref = notificationLink.getAttribute('href') || './my-recipes.html';

    if (!notificationId) {
      window.location.href = targetHref;
      return;
    }

    try {
      await markNotificationAsRead(notificationId, userId);
    } catch {
      // Navigate anyway so the user reaches the recipe page.
    }

    window.location.href = targetHref;
  });

  dropdownElement?.addEventListener('show.bs.dropdown', () => {
    void loadNotifications();
  });

  await loadNotifications();
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

  const displayName = currentUser?.user_metadata?.display_name || currentUser?.email || 'Профил';
  const safeDisplayName = escapeHtml(displayName);

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

  const hasCategoryFilter = Boolean(selectedCategory && selectedCategory !== 'Всички');
  const clearCategoryFilterItem = hasCategoryFilter
    ? `<li><a class="dropdown-item" href="${categoryLink()}">Премахни филтъра</a></li><li><hr class="dropdown-divider"></li>`
    : '';
  const categoryNavClass = currentPage === 'all-recipes.html' && hasCategoryFilter ? 'nav-link dropdown-toggle active' : 'nav-link dropdown-toggle';
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
                ${clearCategoryFilterItem}
                ${categoriesMenu}
              </ul>
            </li>
            <li class="nav-item"><a class="${navLinkClass(currentPage, 'my-recipes.html')}" href="${myRecipesHref}">Моите рецепти</a></li>
            ${currentUser && currentRole === 'admin' ? `<li class="nav-item"><a class="${navLinkClass(currentPage, 'admin.html')}" href="./admin.html">Админ</a></li>` : ''}
          </ul>
           <div class="${currentUser ? 'd-flex align-items-center gap-2 flex-wrap' : 'd-none d-lg-flex align-items-center gap-2 flex-wrap'}">
            ${currentUser
              ? `<div id="notifications-dropdown" class="dropdown">
                   <button
                     id="notifications-toggle-btn"
                     class="btn btn-outline-success btn-sm position-relative"
                     type="button"
                     data-bs-toggle="dropdown"
                     data-bs-auto-close="outside"
                     aria-expanded="false"
                     aria-label="Известия"
                   >
                     <i class="bi bi-bell"></i>
                     <span id="notifications-unread-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger d-none">0</span>
                   </button>
                   <div class="dropdown-menu dropdown-menu-end p-0 shadow-sm notification-dropdown-menu" aria-labelledby="notifications-toggle-btn">
                     <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                       <span class="small fw-semibold">Известия</span>
                       <button id="mark-all-notifications-read-btn" type="button" class="btn btn-link btn-sm p-0 text-decoration-none">Маркирай всички</button>
                     </div>
                     <div id="notifications-status" class="pt-2"></div>
                     <div id="notifications-list" class="list-group list-group-flush"></div>
                   </div>
                 </div>
                 <a href="${profileHref}" class="small text-body-secondary me-1 text-decoration-none"><i class="bi bi-person-circle me-1"></i>${safeDisplayName}</a>
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

  if (currentUser) {
    await setupNavbarNotifications(navbarRoot, currentUser.id);
  }
}

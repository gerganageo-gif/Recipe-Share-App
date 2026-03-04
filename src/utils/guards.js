import { getCurrentUser } from '../services/authService';
import { getCurrentUserRole } from '../services/roleService';
import { buildLoginRedirectUrl } from './authRedirect';

const AUTH_CHECK_ATTEMPTS = 4;
const AUTH_CHECK_DELAY_MS = 180;

function wait(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

async function getCurrentUserWithRetry(maxAttempts = AUTH_CHECK_ATTEMPTS, delayMs = AUTH_CHECK_DELAY_MS) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const user = await getCurrentUser();

      if (user) {
        return user;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await wait(delayMs);
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

export async function requireAuth(redirectTo = null) {
  const user = await getCurrentUserWithRetry();

  if (!user) {
    window.location.href = redirectTo || buildLoginRedirectUrl();
    return null;
  }

  return user;
}

export async function requireGuest(redirectTo = './index.html') {
  const user = await getCurrentUser();

  if (user) {
    window.location.href = redirectTo;
    return user;
  }

  return null;
}

export async function requireAdmin(redirectTo = './index.html') {
  const user = await requireAuth();

  if (!user) {
    return null;
  }

  const role = await getCurrentUserRole();

  if (role !== 'admin') {
    window.location.href = redirectTo;
    return null;
  }

  return user;
}

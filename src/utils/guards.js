import { getCurrentUser } from '../services/authService';
import { getCurrentUserRole } from '../services/roleService';
import { buildLoginRedirectUrl } from './authRedirect';

export async function requireAuth(redirectTo = null) {
  const user = await getCurrentUser();

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

import { getCurrentUser } from './authService';
import { getSupabaseClient } from './supabaseClient';

const USER_ROLES_TABLE = 'user_roles';
const ALLOWED_ROLES = new Set(['user', 'admin']);

function ensureError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  return new Error(error.message || fallbackMessage);
}

export async function getCurrentUserRole() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(USER_ROLES_TABLE)
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на роля.');
  }

  return data?.role ?? 'user';
}

export async function isCurrentUserAdmin() {
  const role = await getCurrentUserRole();
  return role === 'admin';
}

export async function listUsersWithRoles() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(USER_ROLES_TABLE)
    .select(`
      user_id,
      role,
      created_at,
      profile:profiles!user_roles_user_id_fkey(
        id,
        display_name,
        email,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на потребители и роли.');
  }

  return data;
}

export async function updateUserRole(userId, role) {
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Невалидна роля.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(USER_ROLES_TABLE)
    .update({ role })
    .eq('user_id', userId)
    .select('user_id, role')
    .single();

  if (error) {
    throw ensureError(error, 'Неуспешна промяна на потребителска роля.');
  }

  return data;
}

import { getSupabaseClient } from './supabaseClient';

const NOTIFICATIONS_TABLE = 'recipe_notifications';

function ensureError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  return new Error(error.message || fallbackMessage);
}

function isNotificationsUnavailableError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();

  if (message.includes('recipe_notifications') && message.includes('schema cache')) {
    return true;
  }

  if (message.includes('relation') && message.includes('recipe_notifications') && message.includes('does not exist')) {
    return true;
  }

  return code === 'PGRST205' || code === '42P01';
}

function notificationSelectStatement() {
  return `
    id,
    recipient_id,
    actor_id,
    recipe_id,
    comment_id,
    type,
    is_read,
    created_at,
    actor:profiles!recipe_notifications_actor_id_fkey(
      id,
      display_name,
      email,
      avatar_url
    ),
    recipe:recipes!recipe_notifications_recipe_id_fkey(
      id,
      title
    )
  `;
}

export async function listMyNotifications(userId, limit = 12) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from(NOTIFICATIONS_TABLE)
    .select(notificationSelectStatement())
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (Number.isInteger(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    if (isNotificationsUnavailableError(error)) {
      return [];
    }

    throw ensureError(error, 'Неуспешно зареждане на известия.');
  }

  return data || [];
}

export async function countMyUnreadNotifications(userId) {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    if (isNotificationsUnavailableError(error)) {
      return 0;
    }

    throw ensureError(error, 'Неуспешно зареждане на брой непрочетени известия.');
  }

  return count ?? 0;
}

export async function markNotificationAsRead(notificationId, userId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    if (isNotificationsUnavailableError(error)) {
      return;
    }

    throw ensureError(error, 'Неуспешно отбелязване на известието като прочетено.');
  }
}

export async function markAllNotificationsAsRead(userId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    if (isNotificationsUnavailableError(error)) {
      return;
    }

    throw ensureError(error, 'Неуспешно отбелязване на известията като прочетени.');
  }
}

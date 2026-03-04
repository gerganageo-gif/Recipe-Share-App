import { getCurrentUser } from './authService';
import { getSupabaseClient } from './supabaseClient';

const PROFILES_TABLE = 'profiles';

function ensureError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  return new Error(error.message || fallbackMessage);
}

export async function getMyProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на профил.');
  }

  return data;
}

export async function updateMyProfile(profileData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Трябва да си влязъл, за да редактираш профила.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .update(profileData)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    throw ensureError(error, 'Неуспешно запазване на профил.');
  }

  return data;
}

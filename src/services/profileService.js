import { getCurrentUser } from './authService';
import { getSupabaseClient } from './supabaseClient';

const PROFILES_TABLE = 'profiles';

function ensureError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  return new Error(error.message || fallbackMessage);
}

function resolveDisplayName(user) {
  const fromMetadata = String(user?.user_metadata?.display_name || '').trim();

  if (fromMetadata) {
    return fromMetadata;
  }

  const fromEmailPrefix = String(user?.email || '').split('@')[0].trim();
  return fromEmailPrefix || 'Потребител';
}

async function getProfileById(userId) {
  const normalizedId = String(userId || '').trim();

  if (!normalizedId) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .eq('id', normalizedId)
    .maybeSingle();

  if (error) {
    throw ensureError(error, 'Неуспешно зареждане на профил по идентификатор.');
  }

  return data;
}

async function getProfileByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw ensureError(error, 'Неуспешно търсене на профил по имейл.');
  }

  return data;
}

async function createProfileFromAuthUser(user) {
  const supabase = getSupabaseClient();
  const fallbackEmail = String(user?.email || '').trim();

  if (!fallbackEmail) {
    throw new Error('Профилът не може да се създаде автоматично без имейл адрес.');
  }

  const payload = {
    id: user.id,
    email: fallbackEmail,
    display_name: resolveDisplayName(user)
  };

  const { error: insertError } = await supabase
    .from(PROFILES_TABLE)
    .insert(payload);

  if (insertError) {
    const normalizedMessage = String(insertError?.message || '').toLowerCase();

    // If the row already exists, load it instead of failing.
    if (!normalizedMessage.includes('duplicate key value')) {
      throw ensureError(insertError, 'Неуспешно създаване на липсващ профил.');
    }
  }

  const profileById = await getProfileById(user.id);

  if (profileById) {
    return profileById;
  }

  return getProfileByEmail(fallbackEmail);
}

function withProfileIdentityMismatchHint(error, fallbackMessage) {
  const baseError = ensureError(error, fallbackMessage);
  const message = String(baseError.message || '');

  if (message.toLowerCase().includes('row-level security')) {
    return new Error('Профилът за този имейл съществува, но е свързан с различен потребителски идентификатор.');
  }

  return baseError;
}

export async function getMyProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const profileById = await getProfileById(user.id);

  if (profileById) {
    return profileById;
  }

  const profileByEmail = await getProfileByEmail(user.email);

  if (profileByEmail) {
    return profileByEmail;
  }

  return createProfileFromAuthUser(user);
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
    throw withProfileIdentityMismatchHint(error, 'Неуспешно запазване на профил.');
  }

  return data;
}

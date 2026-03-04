import { getSupabaseClient } from './supabaseClient';

function normalizeError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  return new Error(error.message || fallbackMessage);
}

export async function registerUser({ email, password, displayName }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  });

  if (error) {
    throw normalizeError(error, 'Неуспешна регистрация.');
  }

  return data;
}

export async function loginUser({ email, password }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw normalizeError(error, 'Неуспешен вход.');
  }

  return data;
}

export async function signOutUser() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeError(error, 'Неуспешен изход.');
  }
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw normalizeError(error, 'Проблем при четене на сесия.');
  }

  return data.session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

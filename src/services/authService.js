import { getSupabaseClient } from './supabaseClient';

function normalizeAuthErrorMessage(message = '') {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return 'Имейлът не е потвърден. Потвърди регистрацията от писмото и опитай отново.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Невалиден имейл или парола.';
  }

  return message;
}

function normalizeError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  const message = normalizeAuthErrorMessage(error.message || fallbackMessage);
  return new Error(message || fallbackMessage);
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

export async function resendSignupConfirmation(email) {
  const normalizedEmail = String(email || '').trim();

  if (!normalizedEmail) {
    throw new Error('Въведи имейл, за да изпратим писмо за потвърждение.');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail
  });

  if (error) {
    throw normalizeError(error, 'Неуспешно повторно изпращане на имейл за потвърждение.');
  }
}

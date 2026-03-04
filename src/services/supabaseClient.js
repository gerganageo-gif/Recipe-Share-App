import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

let supabaseClient;

function canUseStorage(storage) {
  if (!storage) {
    return false;
  }

  try {
    const probeKey = '__recipe_share_storage_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function resolveAuthStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (canUseStorage(window.localStorage)) {
    return window.localStorage;
  }

  if (canUseStorage(window.sessionStorage)) {
    return window.sessionStorage;
  }

  return null;
}

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Липсва Supabase конфигурация. Добави VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.');
  }

  const authStorage = resolveAuthStorage();

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      ...(authStorage ? { storage: authStorage } : {})
    }
  });

  return supabaseClient;
}

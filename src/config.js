export const APP_NAME = 'RecipeShare';

const viteEnv = import.meta.env || {};
const runtimeEnv = globalThis.__APP_CONFIG__ || {};

export const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = viteEnv.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY || '';

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

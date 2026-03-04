# Recipe Share App - Agent Instructions

## Product context
- This is a multi-page recipe sharing app built with Vite + vanilla JavaScript + Bootstrap.
- Backend is Supabase (Auth, Postgres, Storage).
- Target users can register/login, browse recipes, create recipes with images, edit/delete their own recipes.

## Architecture rules
- Keep client-server separation: frontend only uses Supabase client SDK and API calls.
- Keep pages separated as individual HTML files (do not convert to SPA).
- Keep code modular:
  - `src/pages` for page-specific controllers
  - `src/services` for Supabase/Auth/Recipe data access
  - `src/components` for reusable UI pieces
  - `src/utils` for helper and guard functions
  - `src/styles` for shared styles
- Avoid monolithic files and keep each file focused.

## UI and UX constraints
- Use Bootstrap components and utility classes for responsive layouts.
- Keep interactions clear with visual cues (icons, card states, loading indicators, alerts).
- Prioritize simple and maintainable flows over feature bloat.

## Coding guidelines
- Use plain JavaScript (no TypeScript, no React/Vue).
- Validate input on client side before API calls.
- Surface API errors with user-friendly alerts.
- Prefer small pure functions and explicit naming.
- Preserve existing routes and file naming unless explicitly asked to change.

## Supabase conventions
- Use env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Recipes table should enforce RLS and ownership.
- Image uploads go to public storage bucket `recipe-images` under folder `user_id/`.
- Users can edit/delete only their own recipes.

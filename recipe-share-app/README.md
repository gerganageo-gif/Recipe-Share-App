# RecipeShare App

Multi-page JavaScript app for sharing recipes, built with **Vite + Bootstrap + Supabase**.

## Features
- Supabase Auth: register, login, logout
- Role-based authorization: `user` and `admin`
- Admin panel for role management and recipe moderation
- Recipe CRUD with image upload in Supabase Storage
- Comments and favorites for recipes
- Responsive multi-page UI (separate HTML files)

## Pages
- `index.html` — public recipes feed + search
- `login.html` — login
- `register.html` — register
- `create-recipe.html` — create recipe
- `recipe-details.html` — details + comments + favorites
- `edit-recipe.html` — edit recipe
- `my-recipes.html` — user dashboard
- `admin.html` — admin panel

## Tech stack
- Frontend: HTML, CSS, JavaScript, Bootstrap, Bootstrap Icons
- Backend: Supabase (Postgres DB, Auth, Storage)
- Build tools: Node.js, npm, Vite

## Database design (normalized)
Tables (5 total):
1. `profiles` (1:1 with auth users)
2. `user_roles` (`user` / `admin`)
3. `recipes` (author -> profiles)
4. `recipe_comments` (recipe + author)
5. `recipe_favorites` (many-to-many user <-> recipe)

Indexes, relationships, triggers, and RLS policies are included in migration SQL.

## Supabase migrations
Local migration scripts:
- `supabase/migrations/20260304093000_init_schema.sql`
- `supabase/migrations/20260304094000_seed_demo_data.sql`

Apply migrations:
```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Sync migration history from Supabase to local folder:
```bash
supabase migration list
supabase db pull
```

## Environment variables
Copy `.env.example` to `.env` and set:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Local run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Storage
- Bucket: `recipe-images` (public)
- Upload path format: `<user-id>/<timestamp>-<filename>`
- Storage RLS policies are included in migration

## Demo credentials (for testing)
Create these users in Supabase Auth dashboard:
- Admin: `admin@recipeshare.app` / `demo123`
- User: `demo@recipeshare.app` / `demo123`

Then run seed migration to set admin role and demo recipe.

## Deployment (Vercel / Netlify)
1. Push this project to GitHub
2. Import repo in Vercel or Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Notes about required GitHub history
This environment cannot push commits to your GitHub account directly. Use the checklist in `docs/github-commit-plan.md` to satisfy:
- minimum 15 commits
- commits on 3+ different days
- incremental feature-based history

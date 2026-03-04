# Supabase setup and migration sync

## 1) Link project
```bash
supabase login
supabase link --project-ref <YOUR_SUPABASE_PROJECT_REF>
```

## 2) Apply local migrations to remote DB
```bash
supabase db push
```

## 3) Sync migration history from remote to local
```bash
supabase migration list
supabase db pull
```

## 4) Keep migration SQL in repository
- All schema changes must be added as timestamped SQL scripts in `supabase/migrations`.
- Commit each migration script into GitHub together with related code changes.

## Demo credentials to create in Supabase Auth
- Admin: `admin@recipeshare.app` / `demo123`
- User: `demo@recipeshare.app` / `demo123`

After creating these users in Supabase Auth dashboard, run migration `20260304094000_seed_demo_data.sql`.

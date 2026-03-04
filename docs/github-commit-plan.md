# GitHub commit plan (capstone requirement)

Use this as a practical checklist to produce authentic project history.

## Minimum requirement targets
- 15+ commits total
- Activity on at least 3 different days
- Public repo with clear progress

## Suggested commit sequence
1. `init: scaffold Vite multi-page project`
2. `chore: add Bootstrap and base styles`
3. `feat: create shared navbar and page bootstrap module`
4. `feat: implement Supabase client and auth service`
5. `feat: add login and register pages`
6. `feat: add create recipe form with image upload`
7. `feat: add home recipes listing with search`
8. `feat: add recipe details page`
9. `feat: add edit and delete recipe flows`
10. `feat: add my recipes dashboard`
11. `feat: add DB migrations and RLS policies`
12. `feat: add comments and favorites`
13. `feat: add role service and admin guard`
14. `feat: add admin panel for roles and moderation`
15. `docs: add deployment instructions and demo credentials`
16. `fix: polish validation and error states`
17. `refactor: improve modular service boundaries`

## Work across 3 days example
- Day 1: commits 1-6
- Day 2: commits 7-12
- Day 3: commits 13-17

## Helpful commands
```bash
git add .
git commit -m "feat: add comments and favorites"
git push origin main
```

## Optional branch workflow
- Create feature branches (`feature/admin-panel`, `feature/comments`)
- Merge via pull requests for extra project credibility

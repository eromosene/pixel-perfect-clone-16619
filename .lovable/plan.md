
## Goal

Rebuild the Enigma College school-management PWA in this Lovable project. The source is Next.js 14 (App Router) + Prisma + NextAuth + Tailwind. Target stack: TanStack Start + Lovable Cloud (Supabase) for DB / auth / storage, server functions instead of API routes.

## Phasing

This is a large app (10 pages, 14 API endpoints, 11 DB tables, 4 user roles). I'll ship it in phases so each is testable, instead of one giant unreviewable change.

**Phase 1 — Foundation (this turn)**
- Enable Lovable Cloud.
- Port database schema (11 tables + 4 enums) via migration with RLS + GRANTs.
- Set up `user_roles` table (ADMIN/TEACHER/PARENT/STUDENT) with `has_role()` security-definer function (replaces NextAuth role-in-token pattern).
- Email/password auth + `/auth` page + `_authenticated` layout gate.
- Profiles table + trigger to auto-create on signup.
- Design system (school PWA aesthetic — clean, trustworthy, mobile-first since it's a PWA).
- App shell: bottom nav (mobile) / sidebar (desktop), role-aware.
- Empty Dashboard route as landing.

**Phase 2 — Core academics**
- Classes, Subjects, Students CRUD (admin).
- Students list/detail pages.
- Terms management.

**Phase 3 — Daily ops**
- Attendance marking (teacher).
- Scores / grade entry + report card view.
- Announcements (role-targeted).

**Phase 4 — Parent/Student portals + Fees**
- Parent dashboard (linked students, results, fees).
- Student dashboard.
- Fee payments list (Paystack integration is a separate ask — I'll stub the UI).

**Phase 5 — Polish**
- File upload via Lovable Cloud Storage (photos, avatars).
- PWA manifest for installability (no service worker — see PWA caveat).

## Tech mapping

| Source (Next.js) | Target (TanStack + Lovable Cloud) |
|---|---|
| Prisma models | Supabase tables + RLS |
| NextAuth credentials | Supabase email/password auth |
| `session.user.role` | `user_roles` table + `has_role()` |
| `app/api/*/route.js` | `createServerFn` in `src/lib/*.functions.ts` |
| `app/(app)/*/page.js` | `src/routes/_authenticated/*.tsx` |
| `app/(auth)/login` | `src/routes/auth.tsx` |
| Prisma `findMany` etc. | `supabase.from(...).select(...)` inside server fns |
| File upload route | Lovable Cloud Storage bucket |
| PWA manifest | `public/manifest.json` (installable, no SW) |

## Notes / caveats

- I won't copy `password` into the DB — Supabase Auth owns credentials.
- Roles live in a separate `user_roles` table (never on profiles) per security rules.
- No service worker — preview iframes break with SWs. App will still be installable via manifest.
- Paystack/payment integration deferred — I'll show the UI but won't wire payments unless you ask.
- I'll seed a default ADMIN role to the first user who signs up so you can log in and test.

## This turn delivers

Phase 1 only. After you confirm it works (sign up, log in, see dashboard shell), I'll move to Phase 2.

Reply to approve, or tell me to change phasing / cut features.

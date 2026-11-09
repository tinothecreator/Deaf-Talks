# Deaf-Talks
OpenAI x Andela hachathon : Deaf storytellers share SASL stories; learners learn signs from them with teacher feedback and clear credit.

## Foundation (Milestone 1)

The app uses **SignStories** as its working product name. This milestone adds
Next.js App Router, strict TypeScript, Tailwind CSS, ESLint, and Supabase client
helpers. Milestone 2 adds authentication and roles below. Uploads and story
features are not implemented.

### Local setup

Use Node.js 22 or newer and npm. Dependencies are pinned in `package.json` and
`package-lock.json`. The dev and build scripts use Webpack with Tailwind’s
PostCSS plugin; Turbopack’s worker ports were blocked in the build environment.

```sh
npm ci
cp -n .env.example .env.local
npm run dev
```

Open http://localhost:3000. The shell runs with empty environment values. Populate
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` when connecting
Supabase. Never commit `.env.local` or key values. Restart the dev server after
environment changes.

`SUPABASE_SERVICE_ROLE_KEY` is only used by the server-only admin helper.
`OPENAI_API_KEY` and `OPENAI_MODEL` are reserved for later text-only features;
this milestone does not call OpenAI. No secret key belongs in a `NEXT_PUBLIC_`
variable.

```sh
npm run lint
npm run build
```

### Supabase sessions and schema

- `lib/supabase/browser.ts`: browser client using only public configuration.
- `lib/supabase/server.ts`: per-request server client with session cookies.
- `lib/supabase/admin.ts`: server-only service-role client; callers must authorize
  operations before using it because the service role bypasses RLS.
- `proxy.ts`: Next.js session refresh using `getClaims()`. Refreshed cookies are
  forwarded to server rendering and the browser, along with Supabase's cache
  headers. With empty public configuration, the public shell passes through.
  Protected pages also enforce authorization with `requireAccount()`.

The authoritative schema lives at `supabase/schema.sql`. It has **not** been run
by the coding agent. Existing schemas need only the SQL change below. The full
file is now rerunnable (existing table definitions are not migrated).

### Manual Vercel setup

1. After reviewing the diff, commit/push it and import this Git repository into
   Vercel. Use the Next.js preset, repository root, and Node.js 22 or newer.
   Keep the Output Directory override disabled. `vercel.json` explicitly selects
   Next.js, uses `npm run build`, and resets the output directory to the framework
   default. If deployment reports `STATIC_BUILD_NO_OUT_DIR` looking for `public`,
   check these settings and deploy the commit containing `vercel.json`.
2. Add environment variables in Vercel Project Settings for Preview and
   Production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `OPENAI_MODEL`. The blank
   shell needs no keys; OpenAI values can wait until that feature exists. Keep
   secret values server-side.
3. Deploy/redeploy after setting variables. Open the generated preview URL on a
   phone and check keyboard navigation, focus indicators, and the missing-page
   screen (for example `/missing-page`).

Vercel connection, hosted environment configuration, and preview deployment are
manual; no deployment or commit is performed by this implementation.

## Milestone 2: authentication and roles

Email/password signup offers Learner and Storyteller only. The existing
`auth.users` insert trigger creates a profile and maps every metadata role other
than `storyteller` to `learner`, including `teacher` and `admin`. Updating auth
metadata later does not change the profile. Authorization reads the verified
user and database profile, never a metadata role. The session-scoped server
client handles all normal requests; the admin client is not imported.
Next.js development request/action logging is suppressed for the sign-in,
sign-up, and confirmation routes to keep authentication data out of those logs.

`/account` and the `(platform)` layout require a verified user and a profile.
Missing sessions redirect to `/sign-in`; profile or service failures show an
error instead of granting access. New protected pages must call
`requireAccount()` themselves too, and actions must check authorization on every
mutation. The header shows the display name, role, account link, and sign-out
button. Account content is a role-specific placeholder only.

### SQL to apply to an existing database

Run this block in the Supabase SQL editor, in this order. It is the only new
database behavior required for this milestone and can be repeated safely.
It revokes both table-level and column-level update grants, then permits only
display-name updates. Existing RLS still restricts updates to the user's row.
`id`, `role`, `created_at`, and the unused optional columns remain protected.

```sql
begin;
revoke update on table public.profiles from public, anon, authenticated;
revoke update (id, role, display_name, bio, province, sasl_variety, created_at)
  on table public.profiles from public, anon, authenticated;
grant update (display_name) on table public.profiles to authenticated;
commit;
```

For a completely empty project, review and run `supabase/schema.sql` first.
Its signup trigger is unchanged apart from safe trigger recreation. The other
edits make the existing enums, tables, indexes, triggers, and policies rerunnable;
they do not add story features or change existing story policies.

Promote an existing account manually in the SQL editor (replace the example
email; no signup metadata or service key is needed):

```sql
update public.profiles as p
set role = 'teacher'::public.user_role
from auth.users as u
where p.id = u.id
  and lower(u.email) = lower('person@example.com')
returning p.id, p.display_name, p.role;
```

### Email confirmation setup

Keep email confirmation enabled. Under Supabase Authentication → URL
Configuration, set **Site URL** to the exact app origin you are testing, such as
`http://localhost:3000` or your HTTPS preview origin. This implementation uses
that configured origin in confirmation emails. Change it when testing another
deployment.

Under Authentication → Email Templates → Confirm signup, use this link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

This follows the [Supabase SSR email confirmation flow](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs).
`/auth/confirm` verifies only email tokens, stores session cookies, and redirects
to `/account`. Invalid or expired links show a plain-English error. There is no
user-controlled redirect destination. Configure the two public Supabase
environment variables in the deployment and redeploy before testing.

### Manual acceptance checks

No accounts were created and no database SQL was executed by the coding agent.
After applying SQL and configuring confirmation emails:

1. In a signed-out browser, visit `/account`; it must redirect to `/sign-in`.
2. Create a Learner account yourself, confirm the email, and check its display
   name and role in the header and account page, with “Browse coming soon”.
3. Sign out, then sign in again. An incorrect password must show a visible error.
4. Repeat with a Storyteller account; it must show “Upload coming soon”. Teacher
   must never appear as a signup choice.
5. Promote one account with the SQL above, reload `/account`, and check Teacher
   and “Reviews coming soon”.
6. Check signup/signin at a phone-sized viewport and with keyboard navigation.
7. Leave a session open through token expiry, then reload `/account`; confirm
   that proxy refresh keeps it usable. Check the deployed preview too.

To test the role lock from the signed-in browser console, use the same public
project URL and anon key configured for the app (never a service key). The
following imports the official SSR browser client from a CDN and reads the
existing session cookies; it does not print tokens. Use a Learner or Storyteller
account. Each attempted protected update must fail with `42501`, and the role
must remain unchanged. The successful display-name request writes its current
value back, to check that editable-column access still works.

```js
const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.12.7');
const client = createBrowserClient('YOUR_PUBLIC_SUPABASE_URL', 'YOUR_PUBLIC_ANON_KEY');
const { data: { user }, error: userError } = await client.auth.getUser();
if (userError || !user) throw new Error('Sign in first.');
const { data: before, error: readError } = await client.from('profiles')
  .select('role,display_name,created_at').eq('id', user.id).single();
if (readError) throw new Error('Could not read your profile.');
for (const patch of [
  { role: 'teacher' },
  { role: 'storyteller' },
  { id: user.id },
  { created_at: before.created_at },
  { bio: 'blocked' },
]) {
  const { error } = await client.from('profiles').update(patch).eq('id', user.id);
  console.assert(error?.code === '42501', 'Protected update must fail', Object.keys(patch));
}
const { error: nameError } = await client.from('profiles')
  .update({ display_name: before.display_name }).eq('id', user.id);
console.assert(!nameError, 'Display-name update should succeed');
const { data: after } = await client.from('profiles').select('role')
  .eq('id', user.id).single();
console.assert(after?.role === before.role, 'Role must remain unchanged');
```

Do not paste session tokens or passwords into reports. Database enforcement and
real email delivery require your configured project and manual acceptance.

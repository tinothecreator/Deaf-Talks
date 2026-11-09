# Deaf-Talks
OpenAI x Andela hachathon : Deaf storytellers share SASL stories; learners learn signs from them with teacher feedback and clear credit.

## Foundation (Milestone 1)

The app uses **SignStories** as its working product name. This milestone adds
Next.js App Router, strict TypeScript, Tailwind CSS, ESLint, and Supabase client
helpers. The landing page has no sign-in, uploads, or database queries.

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
  Future protected pages must enforce their own authorization.

The unchanged schema now lives at `supabase/schema.sql`. It has **not** been run.
Do not apply it, seed data, or create test accounts as part of this milestone.
Real expired-session verification needs a configured Supabase project and a
signed-in session, once authentication is implemented in a later milestone.

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

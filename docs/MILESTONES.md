# Deaf-Talks
OpenAI x Andela hachathon : Deaf storytellers share SASL stories; learners learn signs from them with teacher feedback and clear credit.

## Milestone 5: watching stories

All signed-in roles have a **Stories** header link to `/stories`. Learners also
have **Browse stories** on their account page. The watching list requests only
published stories through the ordinary session client; existing RLS decides
consent and usage visibility. Cards show title, storyteller name, credit,
duration and a caption preview. Owner management remains under `/studio`.

`/stories/[storyId]` validates the UUID with Zod and first reads the story,
storyteller, ownership and signs using the session client. A missing/RLS-hidden
row returns the same generic not-found page without constructing an admin client.
Only a successful read permits use of the existing server-only admin helper to
sign the stored video path. It never reads story data with the service role.
The existing `PLAYBACK_URL_SECONDS` constant limits playback access to five
minutes. Reloading the page rechecks authorization before issuing another URL.
Story links disable prefetch so browsing the list does not issue playback URLs.

English captions and the existing credit/terms panel are always visible on a
loaded story page, including when signing or playback fails. Sign buttons show
label, meaning and m:ss start time and seek/play the video. No translations are
queried. There is no download action; `controlsList="nodownload"` is a courtesy,
and the terms panel explains that playback cannot prevent copying.

**SQL:** none needed. Existing authenticated profile reads allow storyteller
names; story, ownership and sign policies already enforce visibility. No SQL
was run and no migration is added.

### Playback checks

Run `npm run lint`, `npm run build`, and
`node --test tests/stories-playback.test.mjs`. The focused tests use doubles for
Supabase to check read-before-sign ordering, no signing for missing/hidden rows
or read failures, five-minute signing of the stored path, signing failure
recovery, and minimal list filtering. They do not prove deployed RLS behavior.

Manual checks with a learner and a separate owning storyteller browser:

1. Signed out, visit `/stories` and a story detail URL: both redirect to sign-in.
2. At 390 × 844 (and on a real phone), sign in as a learner. Open Stories from
   the header/account. Check title, storyteller name, credit, m:ss duration and
   caption preview. Check the empty list says “No stories to watch yet.” when
   there are no published visible stories. Repeat browsing as teacher and
   storyteller; the storyteller's My stories/editor pages must still work.
3. Open a published, consented, nonprivate story. With sound off, watch inline,
   read the English caption and credit/terms, and tap every sign. Each button
   must seek to its displayed time and play. Use Tab/Enter as well: focus is
   visible and buttons are large. Check no horizontal scrolling or download
   action, and no playback URL is requested just by browsing the list.
4. Open a draft, private/nonconsented draft, nonexistent UUID and malformed ID
   as the learner. Each shows the same generic not-found page. Existing
   publication constraints require private/nonconsented stories to be drafts.
   Using an ordinary learner session client, confirm the stories select returns
   no row. Do not use the service role for this check. The automated boundary
   test checks that a no-row result never calls the signer; server breakpoints
   can also verify that the signing branch is not reached for these requests.
5. **Withdrawal:** keep a learner story tab open and note only its UUID. In the
   storyteller's editor, withdraw it. Reload `/stories` as learner: the card
   disappears. Reload the saved detail URL, and open it in a fresh learner tab:
   both show generic not-found, with no new signing call. Repeat the ordinary
   session row check. A URL already issued before withdrawal may keep working
   for the remainder of its five-minute lifetime; test again after it expires.
   Do not paste signed URLs, tokens or keys into logs or reports.
6. Slow/block the network to check loading, list/detail error retry and visible
   video failure messages. After playback access expires, reload to recover if
   the story is still visible. Confirm caption, credit and terms remain visible
   if media signing fails. Test on the deployed preview after review/deployment.

This milestone adds no practice recording/upload, feedback, AI translations,
practice prompts, database changes, commits or deployment.

## Foundation (Milestone 1)

The app uses **SignStories** as its working product name. This milestone adds
Next.js App Router, strict TypeScript, Tailwind CSS, ESLint, and Supabase client
helpers. Milestones 2 and 3 add authentication, roles, private story upload,
and owner playback below.

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

## Milestone 3: private story upload and owner list

Only storytellers can use `/studio/new`, `/studio`, and `/studio/[storyId]`.
The upload page explains access requirements to signed-out users and learners.
At Milestone 3, learners still saw “Browse coming soon”. No publishing, sign tagging, ownership
editor, practice, or AI has been added. The app does not compress videos.

### SQL to run, in order

1. An existing project must already have the original schema and the Milestone 2
   profile role lock above. Do not rerun earlier setup on a populated project.
2. Copy **all** of `supabase/migrations/003_story_upload.sql` into the Supabase SQL
   editor and run it as one block. This is the complete, idempotent Milestone 3
   SQL, including the private bucket and `storage.objects` policies. It has not
   been executed by the coding agent. For a brand-new project, instead run the
   updated `supabase/schema.sql` once; it includes this migration's behavior.

The only new column is `stories.video_size_bytes`: the existing schema has no
place to store the required verified byte count. The existing duration check is
replaced to reject zero/negative values. Pending drafts have null duration and
size; completed drafts have both recorded. If existing rows contain invalid
durations, the transaction fails rather than silently altering those records;
review and correct them before retrying. No RLS is disabled.

`stories` is private, limited to 52,428,800 bytes (50 MiB, shown as 50 MB in the
UI) and MP4/WebM/QuickTime MIME types. The shared TypeScript limits match SQL.
Storage insert requires a storyteller, their own folder, and the exact path of
their pending draft. Updates/overwrites are denied. Direct reads, listing,
signing and deletion of story objects are limited to the owner's own folder;
restrictive guards prevent other permissive policies opening this bucket.
Practice bucket behavior is preserved; no practice feature is implemented.

### Upload and playback behavior

All operations use the existing session-scoped client and RLS. The service role
helper is not used. The server chooses `{user_id}/{story_id}/{random}.{ext}`;
filenames and client-supplied paths never determine the object key. Uploads go
directly to a server-issued Supabase signed upload URL, with progress, so the
video does not pass through a Next.js action. The server checks the saved
object's actual size and MIME metadata before finalizing. It stores integer
seconds rounded up from the browser metadata. Credit is automatically saved as
the storyteller's display name in existing `ownership_settings`, with private
usage and consent false. Every story view shows the name and credit.

Playback checks the verified role, row owner, and path before signing. URLs
expire after 300 seconds; reload the owner detail page to renew. They are bearer
links during that window, so do not share them. No permanent public URL is used.
Captions appear as visible text beneath the video; timed subtitles are deferred.
MOV acceptance does not guarantee its codec plays on every browser; use MP4 if
metadata reading or playback is unsupported.

Known limitation: duration is client-reported. Zod and SQL enforce the recorded
value (>0 and <=60), but no server inspection proves the actual video duration.
File MIME metadata is not independent inspection of the video contents either.
Incomplete uploads are visibly marked and cannot play. Failed transfers attempt
to discard the draft; confirmation failures offer retry/discard. Closing a tab
or losing connectivity can leave an incomplete draft, discardable in My stories.
Signed upload URLs have Supabase's two-hour lifetime; a late transfer after
cancellation may leave a private orphan file. No scheduled cleanup is added.
For demo cleanup, an administrator should compare Storage paths with
`stories.video_path` in the Supabase dashboard and remove only unreferenced
files older than two hours (after agreeing retention with the owner).

### Manual Milestone 3 tests

After applying SQL, configure the two public Supabase variables in Vercel and
redeploy the reviewed code. No service key is needed for these features.
No commit or deployment was performed by the coding agent.

1. Signed out: open `/studio/new`. It must explain that a Storyteller account is
   needed and offer Sign in. `/studio` must require authentication.
2. Learner: account still says “Browse coming soon”; `/studio/new` denies upload.
   Directly invoking upload actions must fail too. Repeat with Teacher.
3. Storyteller A: upload a self-recorded/consented MP4 with a title and English
   caption, at most 60 seconds and 50 MB. Watch progress and the success message.
   Open My stories: title, Draft, date, duration, name, and credit must appear.
   Open it: video controls, inline playback, and the visible caption must work
   without sound. Reload after five minutes to renew playback access.
4. Reject an empty caption/title, a non-video file, an empty file, a video over
   52,428,800 bytes, and a video over 60 seconds with plain-English errors.
   Test supported MOV/WebM recordings too, and a video whose metadata cannot be
   read. A valid video exactly 60 seconds long must pass; 60.1 must fail.
5. Turn off the network during upload and confirmation separately. Restore it:
   retry confirmation or discard the incomplete draft. Reload My stories after
   closing the upload tab mid-transfer; the incomplete draft must be clearly
   marked and discardable. No incomplete draft should offer playback.
6. Cross-user access: copy A's **story ID and object path**, not a signed URL.
   Sign in as Storyteller B in a separate browser profile. B's list must exclude
   A's story and `/studio/<A-story-id>` must be unavailable. Repeat as Learner
   and Teacher. Using their ordinary session client, direct table reads for
   A's draft must return no rows; direct Storage download, list of A's folder,
   `info`, `createSignedUrl`, and `createSignedUploadUrl` at A's path must fail
   or return no objects. Insert/delete/overwrite of A's path must fail too.
   B must still be able to upload and play their own story. Test an anonymous
   Storage request at A's path as well; a public object URL must not serve it.
7. With an ordinary storyteller session, try uploading an arbitrary unregistered
   path in your own folder: it must fail. Try an over-limit signed upload:
   Storage must reject it. In the SQL editor, confirm the duration constraint
   rejects 0, negative values and 61 (use a transaction and roll it back).
8. On the deployed preview at a 360px viewport and on a real target phone, check
   the file picker, wrapping filenames, readable captions, progress/error/success
   states, and video controls. Use keyboard Tab to check visible focus and labels.
   Confirm no horizontal scrolling and no information conveyed by sound alone.

Do not paste credentials, session tokens or signed URLs into test reports.
The authenticated upload, cross-user, phone, and deployed tests require your
configured project and are not claimed as completed by local lint/build.

## Milestone 4: tags, ownership, and publishing

`/studio/[storyId]/edit` is restricted to the owning storyteller. It edits title,
English caption, 0–5 draft sign tags (3–5 required to publish), consent, usage,
and credit. Tags use stored video duration, with a button to capture the current
playback time. Credit defaults to the storyteller's display name. The saved
visibility status is always shown. **Saving any edits makes the story a draft**;
review the saved content and publish again. Publish is disabled while there are
unsaved edits. Withdrawal discards unsaved form edits and atomically sets Draft,
Private usage, and unconfirmed consent. It does not delete tags or media.

The database validates publication atomically, including direct API changes to
published stories. Invalid direct changes are rejected; use the withdrawal RPC
to make a published story private. Child edits lock the story row to serialize
with publication. Sign IDs are retained on edits. Sign rows cannot move between
stories, and a composite foreign key binds an existing practice sign reference
to its story; no practice feature has been built.

Existing SELECT policies already enforce owner access OR published + confirmed
consent + nonprivate usage on stories, signs and ownership settings. They are
not duplicated. Ownership credit/consent/usage changes are logged atomically;
unchanged values do not add history. Old history rows have null `credit_line`
because the original credit was not captured. Standalone ownership deletion is
rejected; deleting a parent story can still cascade, including its history.
History remains owner-only. Download settings stay false; no download action is
provided. Playback cannot guarantee prevention of copying.

### Exact SQL and run order

No SQL was executed against your database. Review the diff first.

1. **Existing Milestone 3 database:** copy the entire contents of
   [`supabase/migrations/004_tags_ownership_publish.sql`](../supabase/migrations/004_tags_ownership_publish.sql)
   into the Supabase SQL editor and run it **once as a single block**, including
   `begin;` and `commit;`. This file is the exact complete SQL for Milestone 4;
   no additional SQL block or manual function creation is needed. It is
   idempotent. Do not run the full schema afterwards.
2. **Only if Milestone 3 has not been applied:** first apply the existing
   Milestone 2 role lock and then the entire
   `supabase/migrations/003_story_upload.sql`; then run `004` as above.
3. **For an empty project instead:** run the entire current
   `supabase/schema.sql` once. It includes Milestones 2–4, so do not separately
   apply the migrations afterwards.
4. Start/redeploy the reviewed app with its existing public environment
   configuration. No service-role key is needed for these editor operations.

The composite practice-sign foreign key validates existing rows. If old test
records contain cross-story sign references, the migration fails and rolls
back. Review those records with their owners before correcting them; this
migration does not silently rewrite them.

### Manual Milestone 4 acceptance tests

Use your own or explicitly permitted video and two separate browser profiles:
Storyteller A and another signed-in user B. Repeat B's checks as Learner,
Storyteller and Teacher. No learner story page is included in this milestone.

1. As A, upload a short story, open My stories, and use Edit story. Confirm name,
   credit, Draft status, and “Who can see this story” appear. The owner detail
   page must also show credit and usage terms. Opening A's edit/detail route as
   B must not expose A's draft; B cannot edit it even when published.
2. Save with fewer than 3 signs, nonprivate usage and confirmed consent. Publish
   must report “Add 3 to 5 signs before publishing.” Add three labelled signs
   with English meanings. Play/pause the video, capture current times, save,
   reload, and check persisted values. Edit and remove tags; at five tags the
   Add sign button must be disabled.
3. With three valid signs, test each publication blocker separately, saving
   between changes: empty caption; unconfirmed consent; Private usage. Each
   must produce its specific visible publication error. Empty or whitespace-only
   credit is rejected on save (also by the DB); it cannot become published.
   Negative times and times beyond stored duration are rejected on save and
   by the DB. Boundary times 0 and exactly the stored duration are accepted.
4. Restore a caption, credit, consent, nonprivate usage and 3–5 valid signs.
   Publish: status and visibility must change, and My stories must say Published.
   B's console check below must see the story, all tags, and ownership settings.
   Try publishing it as B; the RPC must reject it even though B can read it.
5. Edit published credit and save. The story becomes a draft; confirm a history
   row with the new credit. Republish, change consent and save, then change
   usage and save; each actual change adds one history row. Saving unchanged
   ownership values must not add history. The owner console query below can
   read it, while B's history query must return no rows.
6. Republish valid content. As B, verify shared rows are visible. As A, withdraw:
   Draft, Private usage and unconfirmed consent must appear immediately. Repeat
   B's hidden check for all three tables, not just the story. An already opened
   video link can last up to five minutes; new raw Storage reads/signing by B
   must still fail (Milestone 3 tests). Do not copy signed URLs into reports.
7. Test network loss during save, publish and withdrawal. Check a visible error,
   retry after restoring the network, and reload to establish the saved state
   if the response was lost. Expired playback must show an error and recover on
   reload. Incomplete uploads remain managed from My stories.
8. At 360px and 320px widths, then on a real phone, check no horizontal overflow,
   labelled fields, readable captions, video controls, tap targets, current-time
   capture and keyboard focus. All states must be understandable without sound.
   Repeat on the deployed preview; local build success is not phone validation.

#### Browser console: ordinary client and cross-user RLS

In A's browser, note only the story UUID. In B's separate signed-in browser,
open the app console and run this setup. Use the app's public URL and anon key,
**never a service-role key**. The SSR client uses the existing session cookies.
Do not print the client, auth result, session tokens, or signed URLs.

```js
const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.12.7');
const m4 = createBrowserClient('YOUR_PUBLIC_SUPABASE_URL', 'YOUR_PUBLIC_ANON_KEY');
const m4Auth = await m4.auth.getUser();
if (m4Auth.error || !m4Auth.data.user) throw new Error('Sign in first.');
const storyId4 = 'REPLACE_WITH_A_STORY_UUID';
async function checkStory4(expectVisible) {
  for (const [table, key] of [
    ['stories', 'id'], ['signs', 'story_id'], ['ownership_settings', 'story_id'],
  ]) {
    const { data, error } = await m4.from(table).select('*').eq(key, storyId4);
    if (error) throw new Error(`Request failed for ${table}: ${error.message}`);
    console.assert(expectVisible ? data.length > 0 : data.length === 0,
      `${table}: expected ${expectVisible ? 'visible' : 'hidden'}`);
  }
  const history = await m4.from('consent_log').select('id').eq('story_id', storyId4);
  console.assert(!history.error && history.data.length === 0, 'B must not read history');
}
// Run while A's story is a draft, private, or not consented:
await checkStory4(false);
// After A publishes valid content, run:
await checkStory4(true);
const forbiddenPublish4 = await m4.rpc('publish_story', { p_story_id: storyId4 });
console.assert(!!forbiddenPublish4.error, 'B must not publish A’s story');
// After A withdraws, run:
await checkStory4(false);
```

Only run each stage when A has set the indicated state. Also attempt direct B
updates of A's title, signs and credit with `.update(...).eq(...).select()`:
requests must fail or return zero rows, and A's data must remain unchanged.

In A's console, initialize the same client, then query history without printing
credentials or URLs:

```js
const history4 = await m4.from('consent_log')
  .select('usage,consent_confirmed,credit_line,changed_at,changed_by')
  .eq('story_id', storyId4).order('changed_at', { ascending: false });
console.table(history4.data); // Only your own ownership history.
```

For database validation beyond UI limits, use **a disposable draft owned by A**
and the same ordinary client. Add six tags with `.from('signs').insert(...)`
using valid label/meaning/start_seconds values, then invoke `publish_story`:
it must reject with “Add 3 to 5 signs before publishing.” Remove excess tags
before retrying. An out-of-range timestamp insert must itself fail. A direct
empty credit update and ownership deletion must fail too. A direct update that
would invalidate a published caption, tag count, duration, consent or usage must
fail and leave its previous state intact; withdraw first to save incomplete work.

Local validation completed: lint, production build, and 21 checks in an isolated
PGlite Postgres engine using the actual schema policies and migration. The
migration was applied twice to check idempotence. The checks cover validation,
valid publication, direct invalid published edits, withdrawal, credit/consent/usage
history, history privacy,
cross-user reads/publication, atomic saves, retained sign IDs and cross-story
practice references. This does not replace testing your hosted Supabase project,
concurrency across real connections, phone playback, or deployed preview.
Headless Chromium checks of the actual editor component with mocked server
operations passed at 320px and 360px: no horizontal overflow, add/remove limits,
labelled timestamps and visible keyboard focus. These fixture checks do not
exercise authenticated server rendering, network mutations or actual media.

No Milestone 5 browsing or learner detail page, practice recording, feedback,
AI, download UI, database execution, commit, or deployment was added/performed.

# Milestone 6: practice submission

Implemented only practice submission and the learner's own history/playback.
No SQL was run against Supabase. No commit or deployment was made.

## Validation performed

- `npm run lint` passed.
- `npm run build` passed.
- `node --test --test-isolation=none --test-reporter=spec tests/*.test.mjs`:
  13 checks passed (8 practice, 5 existing story playback).
- Headless Chromium at 390 × 844: all three protected practice routes redirect
  a signed-out user to sign-in, without horizontal overflow on the result.
- Authenticated database/RLS, end-to-end camera/upload, actual iPhone Safari and
  deployed-preview tests remain manual, after review and SQL application. The
  automated authorization tests use explicit session/storage doubles, not a live DB.

## SQL: what existed and what changed

Already present:

- `practice_attempts`, owner/story/sign references, `note`, and creation date;
  RLS was enabled.
- Reads allowed the learner, the story's storyteller, and teachers through
  `can_review_attempt`. That audience is preserved; no reviewer UI was added.
- The private `practice` bucket, 52,428,800-byte ceiling and MP4/WebM/MOV types.
- Own-folder storage insert/read/delete policies from migration 003.
- **Migration 004 already enforces same-story sign binding** with
  `practice_attempts_sign_story_fkey` and `signs_id_story_unique`. 005 does not
  duplicate either. Removing a sign can still clear the reference on old attempts.

New in `005_practice_submission.sql`, also appended verbatim to `schema.sql`:

- Required caption, non-whitespace and at most 2,000 characters. Existing rows
  use a nonblank old note (up to 2,000 characters), otherwise an explicit
  `[Caption unavailable for an older attempt.]` marker. No video description
  is invented. Old rows stay incomplete with status `failed` because they have
  no verified upload metadata. No rows or media are deleted by the migration.
- `uploading`, `failed`, `submitted` states; expected size/type; verified size;
  numeric duration. Submitted rows require duration > 0 and <= 60 and matching
  expected/stored size. Duration and size constraints apply whenever nonnull.
- Inserts require the learner role, session ownership, a readable story, and a
  sign belonging to it. Inserts start incomplete. Updates only finish/fail an
  owned pending upload. Upload identity, caption, path and expected metadata
  cannot be changed after creation. Only incomplete own rows can be discarded.
- Restrictive practice storage guards require the learner's own folder for all
  browser operations, a matching pending attempt for insert, and prohibit
  overwriting. Other learners, storytellers, teachers and signed-out users
  cannot directly read/list/sign another learner's objects in the browser.
  Session reads of one's own file remain available for Storage `info()` and cleanup.
- The private bucket settings are explicitly reconciled on rerun.

The migration is idempotent. It preserves newly submitted rows when rerun.

## Exactly what to run

For the existing M4/M5 database, open Supabase **SQL Editor**, paste the complete
contents of `supabase/migrations/005_practice_submission.sql`, and run it once.
The file contains its own `begin;` and `commit;`. No other SQL is needed when
003 and 004 have already been applied. Do not re-run the full schema for this upgrade.

If this database has not reached M4 yet, apply the complete files in this order:

1. `supabase/migrations/003_story_upload.sql`
2. `supabase/migrations/004_tags_ownership_publish.sql`
3. `supabase/migrations/005_practice_submission.sql`

These assume the foundation tables and role lock are already installed. For a
new empty Supabase project, run the complete current `supabase/schema.sql`
instead; it contains all three milestones, including 005. Do not additionally
run the migrations for a fresh schema installation.

Optional read-only checks after applying 005:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.practice_attempts'::regclass
order by conname;

select tablename, policyname, permissive, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'practice_attempts')
   or (schemaname = 'storage' and tablename = 'objects'
       and policyname like 'practice%')
order by tablename, policyname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'practice';
```

## Manual browser tests

Use only your own or explicitly permitted video. Use a published, consented,
nonprivate story with sign tags, Learners A and B in separate browser profiles,
and separate storyteller and teacher accounts. Run against the reviewed preview
with 005 applied. At 390px width check that nothing scrolls horizontally, buttons
remain easy to tap, and keyboard focus is visible.

1. Sign out. Open `/practice`, `/practice/ATTEMPT_ID`, and
   `/stories/STORY_ID/practice?sign=SIGN_ID`: each redirects to sign-in.
2. As A, open a story. Every sign has a labelled “Practise this sign” link.
   Open one: story title, storyteller name/credit, English caption, chosen label,
   meaning and start time are visible. “Play sign” seeks to that time.
3. Enter a caption and choose an MP4/MOV/WebM file, 1–60 seconds and <=50 MiB.
   On **an actual iPhone Safari**, use the file input's camera path as well as
   permitted existing media. Check visible progress, success and playback.
   `/practice` lists title, label, caption, South Africa date and Submitted.
   The detail page shows the same caption beside playback.
4. With recording supported, grant camera permission, record briefly, stop,
   preview, record again, then upload. No audio permission is requested.
   Leave recording running: it stops just before 60 seconds to allow the final
   frame; metadata must still pass the <=60 check. Watch the seconds counter.
   Upload and file replacement are disabled during recording.
5. Deny camera access: a visible explanation appears and the file input works.
   Repeat without MediaRecorder support. Check a WebM recording in Chromium
   (its initial metadata can report infinite duration); it must either derive
   valid duration or give the clear export-as-MP4 error, never skip validation.
6. Try a blank/whitespace caption, >2,000 characters, zero-duration/unreadable
   video, >60-second video, wrong MIME type, empty file, and >52,428,800 bytes.
   Each is rejected. If the file picker hides wrong types, select “All files”
   where available. Server validation is also exercised by the automated tests.
7. Replace `sign=` in the practice URL with a sign from a different story:
   unavailable page, no form. Try an unpublished/private/nonconsented story as A:
   unavailable page. Direct insert checks below verify that UI bypasses fail too.
8. Go offline during upload, then restore the connection. The caption and file
   remain available. Retry uploads again; discard removes the incomplete row.
   Reload `/practice` after an interrupted/abandoned upload: it is explicitly
   incomplete, never playable as a submitted attempt, and has a discard action.
   Use DevTools Network to fail an upload or confirmation request and repeat.
9. As a storyteller or teacher, visit a valid practice selection URL: see the
   short Learner-account note and no submission form. `/practice` also shows a note.
10. As B, open A's `/practice/ATTEMPT_ID`: unavailable page and no video URL.
    Run the console test below too. A's own playback works. Wait five minutes
    and reload to renew expired playback access. Do not share or log its URL.
11. Withdraw the source story after A submits: A can still play their own
    attempt, with its caption, while the source title/sign may show unavailable.
    Remove a sign in the storyteller editor: existing attempts survive with a
    missing sign label. Confirm no feedback UI appears anywhere.

### Cross-user console test

In A's app console, initialize the client below and select only an attempt's ID
and path (these are identifiers, not access capabilities). Copy those values
privately into B's console. Never copy/print tokens, sessions or signed URLs.
Use the app's **public anon key**, never its service key. The official SSR client
reads the currently signed-in browser's cookies. CDN imports require connectivity.

```js
const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.12.7');
const m6 = createBrowserClient('YOUR_PUBLIC_SUPABASE_URL', 'YOUR_PUBLIC_ANON_KEY');
const auth6 = await m6.auth.getUser();
if (auth6.error || !auth6.data.user) throw new Error('Sign in first.');
// In A only; do not run the rest of the checks in A's browser:
const own6 = await m6.from('practice_attempts')
  .select('id,video_path').eq('status', 'submitted').limit(1).single();
if (own6.error) throw new Error('Submit an attempt first.');
console.table(own6.data); // Identifiers only, no signed URLs.
```

In **B's separate signed-in browser**, initialize `m6` and `auth6` using the first
four lines above, then run:

```js
const attempt6 = 'A_ATTEMPT_UUID';
const path6 = 'A_USER_UUID/A_FILE_UUID.mp4'; // Actual path from A.
const hidden6 = await m6.from('practice_attempts').select('id').eq('id', attempt6);
console.assert(!hidden6.error && hidden6.data.length === 0, 'A attempt must be hidden');
const signed6 = await m6.storage.from('practice').createSignedUrl(path6, 300);
console.assert(!!signed6.error && !signed6.data?.signedUrl, 'B cannot sign A video');
const downloaded6 = await m6.storage.from('practice').download(path6);
console.assert(!!downloaded6.error, 'B cannot download A video');
const listed6 = await m6.storage.from('practice').list(path6.split('/')[0]);
console.assert(!!listed6.error || listed6.data.length === 0, 'B cannot list A folder');
const changed6 = await m6.from('practice_attempts').update({status:'failed'})
  .eq('id', attempt6).select('id');
console.assert(!!changed6.error || changed6.data.length === 0, 'B cannot change A attempt');
```

Repeat the direct storage checks as the owning storyteller and as a teacher:
objects stay hidden. They can read the attempt row under RLS, as required for a
future review flow, but no review page or signing endpoint for them was added.

Test cross-story and unreadable-story inserts as a learner:

```js
async function rejectedPractice6(storyId, signId) {
  const inserted = await m6.from('practice_attempts').insert({
    learner_id: auth6.data.user.id,
    story_id: storyId, sign_id: signId,
    video_path: `${auth6.data.user.id}/${crypto.randomUUID()}.mp4`,
    caption: 'My permitted test attempt.', status: 'uploading',
    expected_size_bytes: 100, expected_content_type: 'video/mp4',
  });
  console.assert(!!inserted.error, 'Invalid practice insert must be rejected');
}
await rejectedPractice6('READABLE_STORY_UUID', 'SIGN_FROM_DIFFERENT_STORY_UUID');
await rejectedPractice6('PRIVATE_OR_DRAFT_STORY_UUID', 'SIGN_FROM_THAT_STORY_UUID');
```

Use the same insert shape with a visible matching story/sign but another
learner's ID/path: it must fail. As storyteller and teacher, try their **own**
ID/path with a valid visible story/sign: role enforcement must reject it.

## Limits and intentionally excluded work

Duration is read from actual browser video metadata, validated again with Zod,
and constrained in Postgres. As agreed in PLAN.md, the server does not decode
video bytes to independently prove duration against a malicious client. Storage
confirms actual object existence, top-level size and declared content type; it
does not inspect codec contents. iPhone codecs and permissions need device tests.

Failed confirmation marks the attempt incomplete, and interrupted uploads remain
visibly incomplete even if the connection prevents marking them failed. Discard
claims the incomplete row before removing its file to avoid deleting a completed
upload during a race. If file cleanup fails, a visible message calls for manual
cleanup. There is no scheduled orphan cleanup; an issued upload capability can
outlive a discarded row and leave private orphan bytes. Signed playback expires
in five minutes; already issued access is valid until expiry.

No milestone 7: no review queue, feedback form, feedback reads or display. No AI,
translations, practice prompts, payments, account-role changes, real seed media,
SQL execution, commits, or deployment. Review the diff before applying SQL and
checking a preview.

## File manifest

Created:

- `app/(platform)/practice/[attemptId]/page.tsx`
- `app/(platform)/practice/error.tsx`
- `app/(platform)/practice/loading.tsx`
- `app/(platform)/practice/page.tsx`
- `app/(platform)/stories/[storyId]/practice/page.tsx`
- `app/actions/practice.ts`
- `components/practice/discard.tsx`
- `components/practice/form.tsx`
- `components/practice/playback.tsx`
- `components/practice/recorder.tsx`
- `docs/milestone-6.md`
- `lib/media/object.ts`
- `lib/practice/context.ts`
- `lib/practice/data.ts`
- `lib/practice/validation.ts`
- `supabase/migrations/005_practice_submission.sql`
- `tests/practice-submission.test.mjs`

Changed:

- `app/(platform)/stories/[storyId]/page.tsx`
- `app/actions/stories.ts`
- `app/layout.tsx`
- `components/stories/player.tsx`
- `lib/media/browser.ts`
- `lib/media/limits.ts`
- `supabase/schema.sql`

Moved: none.

# Milestone 7 review and manual checks

Only human feedback is implemented. Review the diff before applying SQL. Nothing here requires AI, translations, or practice prompts.

## Database: existing versus new

Already present in `supabase/schema.sql`:

- `feedback(id, attempt_id, reviewer_id, comment, rating, created_at)`. The existing author column is `reviewer_id`; there is no `author_id` column to rename or duplicate.
- Rating enum: `keep_practising`, `good`, `excellent` (UI: Keep practising, Good, Excellent).
- RLS enabled. INSERT already required `reviewer_id = auth.uid()` and `can_review_attempt(attempt_id)`.
- SELECT already restricted feedback to its author or the attempt's learner. That policy is unchanged. Broader reviewer visibility remains deferred.
- No feedback UPDATE/DELETE policies. Multiple feedback rows per attempt are already supported.
- Practice SELECT already uses `learner_id = auth.uid() OR can_review_attempt(id)`; the helper permits the story's storyteller and teachers. Queue visibility uses this existing RLS without an application ownership filter.

New in `supabase/migrations/006_feedback.sql` (also appended verbatim to the canonical schema):

- Replace the existing INSERT policy with the same checks plus an explicit storyteller/teacher role check and a submitted-attempt check.
- Add a database constraint requiring a non-whitespace comment of at most 2,000 characters. The server also trims and Zod-validates comments, ratings, and attempt IDs.
- Revoke UPDATE/DELETE privileges, including column-level UPDATE grants, from browser roles. Revoke anonymous/public INSERT and grant authenticated SELECT/INSERT. No new read policies or storage policies.

## Exact SQL and run order

Do not rerun the entire canonical schema as an upgrade. With migrations 003, 004, and 005 already applied:

1. In the Supabase SQL editor, run this preflight:

   ```sql
   select count(*) as comments_needing_attention
   from public.feedback
   where comment !~ '[^[:space:]]' or char_length(comment) > 2000;
   ```

   Expect zero. If it is nonzero, review those legacy rows with their authors before applying the new constraint. The migration deliberately does not rewrite or delete feedback.
2. Run the **entire exact contents** of [`006_feedback.sql`](../supabase/migrations/006_feedback.sql), from `begin;` through `commit;`. This is the only new migration. It is idempotent. No placeholder substitution is needed. The unchanged author/learner read policy must already exist from the original schema.
3. Run the manual tests below using ordinary accounts. Do not use a service-role key for these checks.

## Manual core loop

Use self-recorded or explicitly permitted demo media and separate browser profiles for accounts.

1. Storyteller A publishes a captioned story with credit, consent, learning usage and signs. Learner A submits a captioned attempt for one of those signs.
2. Storyteller A sees Reviews in the header and the submitted attempt in `/reviews`: story title, storyteller/credit, sign, learner name, caption, date, and “Your feedback: Not added yet”. Failed/incomplete uploads are absent.
3. Open the review. Play the learner video and read its visible caption. Expand the original story, choose “Play sign”, and confirm the sign's label, meaning, start time, story caption, credit and usage terms are present.
4. Submit a whitespace-only comment: it must fail with a written message. Submit a valid comment and one of the three ratings: it must appear below with author, role, date, rating and comment. Add a second review: both remain. There are no edit/delete controls. The queue says “Your feedback: Already added”.
5. Learner A sees “Feedback received” in `/practice` and all reviews on their attempt detail. There are no sound-only notifications.
6. Learner A visits `/reviews` and its detail route: plain-English role note, no review video/form. Learner B cannot open Learner A's attempt or read its feedback. Storyteller B cannot find or open an attempt on A's story.
7. A manually assigned teacher can review the same submitted attempt through the same pages. The teacher sees only their own comments; the storyteller sees only theirs; the learner sees both. The queue indicator intentionally describes only the current reviewer's feedback because broader reviewer reads are deferred.
8. Sign out and visit `/reviews`, its detail URL, `/practice`, and its detail URL: redirect to sign-in.
9. Check at 320px and 360px widths, keyboard navigation, visible focus, labels and large controls. Confirm caption, credit and terms remain readable. Wait over five minutes and reload to renew video access. Withdraw the story and confirm reviewers cannot obtain original-story playback unless the existing story RLS permits it. Practice review access continues to follow the existing practice RLS.
10. Use a disconnected connection or unavailable media to check visible error/retry states; reload with a slow connection for loading states. No submitted attempt should appear in an empty queue message after a failed fetch.

## Browser-console cross-user / direct API tests

Use your own demo accounts in a local browser console. In Network, find a Supabase authenticated request and copy its Authorization access token **locally** (without the `Bearer ` prefix). Do not send tokens to anyone or paste them into chat. The snippet keeps credentials inside a function and prints only check results. Use the public project URL and public anon key, never a service-role key. Close the console afterward.

Run this as Learner B, using Learner A's known submitted attempt ID:

```js
(async () => {
  const base = prompt('Supabase public project URL').replace(/\/$/, '');
  const key = prompt('Public anon key');
  const token = prompt('Current Learner B access token (local only)');
  const attemptId = prompt('Learner A submitted attempt UUID');
  const headers = { apikey: key, Authorization: `Bearer ${token}` };
  const userResponse = await fetch(`${base}/auth/v1/user`, { headers });
  if (!userResponse.ok) throw new Error('Use a valid signed-in test session.');
  const user = await userResponse.json();
  for (const [table, filter] of [
    ['practice_attempts', `id=eq.${attemptId}`],
    ['feedback', `attempt_id=eq.${attemptId}`],
  ]) {
    const response = await fetch(`${base}/rest/v1/${table}?select=id&${filter}`, { headers });
    const rows = await response.json();
    console.assert(response.ok && Array.isArray(rows) && rows.length === 0, `${table}: other learner rows hidden`);
  }
  const response = await fetch(`${base}/rest/v1/feedback`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ attempt_id: attemptId, reviewer_id: user.id, comment: 'Demo access test', rating: 'good' }),
  });
  const result = await response.json();
  console.assert(!response.ok && result.code === '42501', 'Learner feedback insert denied by database');
})();
```

Repeat as Storyteller B on Storyteller A's story: both reads must be empty and the insert denied. As Learner A, change the read assertions to expect their own attempt/reviews when using their **own** attempt ID; the INSERT must still be denied.

As Storyteller A or a teacher, repeat the direct POST with `reviewer_id` set to another user's UUID: expect RLS code `42501`. Use the current reviewer's UUID with a whitespace comment or a comment of 2,001 characters: expect check violation `23514`. Use an uploading/failed attempt ID: expect `42501`. These tests bypass the form and prove database enforcement.

For an existing own feedback ID, issue PATCH (a new comment) and DELETE against `/rest/v1/feedback?id=eq.FEEDBACK_UUID` with the same headers: expect permission denied (`42501`), and verify the comment remains unchanged. A teacher must get an empty SELECT when filtering for the storyteller's feedback ID, while the attempt's learner can read it.

For storage, copy the attempt's `video_path` only from an authorized session read. As a reviewer, directly POST to `/storage/v1/object/sign/practice/VIDEO_PATH` with `{ "expiresIn": 300 }`: browser signing must fail. Do not print its response body. The review page should still play the video through the server path after its RLS-checked read. A different learner must not be able to read the attempt row or obtain its path through the app.

## Verification and remaining checks

Completed locally: lint, production build, server tests; 16 isolated PostgreSQL checks using PGlite, including applying migration 006 twice, author spoofing, role/status restrictions, blank/long comments, immutable writes, author/learner read boundaries, teacher support, and anonymous INSERT denial. No remote database was used.

Phone checks passed at 320px and 360px. They use real components with a fixture action and actual signed-out route visits; they do not establish authenticated end-to-end playback. The live migration, deployed preview, real multi-account core loop, device codecs, and expired media URLs require the manual checks above after diff review.

Not done: milestones 8/9, AI calls, translations, prompts, feedback editing/deletion, broader feedback visibility, a separate teacher UI, database execution on your project, deployment, or commits.

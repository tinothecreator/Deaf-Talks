# Milestone 8: caption translations for review

Implemented only caption-text translations and storyteller approval. No SQL has been run against the project database. No commit or deployment was made. Live cross-user RLS checks and phone/preview checks remain manual after applying the migration.

## Existing SQL versus new SQL

Already present:

- `story_translations`: UUID primary key, story foreign key with cascade deletion, language, text, `ai_generated` default true, `approved_by_storyteller` default false, creation timestamp, story index, and unique `(story_id, language)`.
- RLS enabled. `view approved translations` allowed owners to read drafts and other users to read approved rows when `is_story_visible` allowed the story. `owners manage translations` permitted owner writes, without an explicit storyteller-role check.
- Story visibility already includes publication, consent, usage and owner access. This migration changes neither that policy nor its helper.

New in `supabase/migrations/007_translations.sql`, appended verbatim to `supabase/schema.sql`:

- Only `zu` and `af`; non-whitespace translation text, at most 12,000 characters. Existing uniqueness is reused.
- SELECT checks `stories` through its existing RLS, allowing the owner drafts and everyone else approved rows only. Replace owner-management policy with explicit storyteller-owner INSERT/UPDATE/DELETE policies.
- BEFORE translation INSERT/UPDATE trigger forces inserts to be drafts, invalidates approval on any text/provenance change, prevents identity reassignment, and keeps AI provenance true after human edits. Entirely human-written translations have `ai_generated = false`; editing AI text keeps it true.
- AFTER English-caption UPDATE trigger withdraws every translation approval and invalidates any generation's source marker, including direct browser-client writes that do not update `updated_at`.
- `translation_generations` table: owner-readable usage counts, per-language reservation token, timestamps and source marker. RLS stays on; browser roles have no write grants. Deleting a translation never resets usage.
- Two tightly scoped, authenticated RPCs reserve and finish generations. These use SECURITY DEFINER only to maintain the protected ledger and atomically store the owner's draft; they explicitly verify authenticated identity, ownership and storyteller role. Application calls use the session client, never the service role. No new storage policies.
- Total cap: **10 attempts per story across both languages**, including failed requests. Reservations lock the story row so separate tabs/instances cannot double-spend the count. An active language is blocked for 60 seconds; the SDK timeout is 20 seconds, with zero retries. Crashed requests recover after lease expiry. A result from a changed source or expired/replaced reservation is rejected.

Regeneration withdraws approval immediately, even when it fails or returns the same text. It retains old text on failure. New output is always saved with AI provenance and approval false. Source/text writes and generation completion serialize on the story row. Existing stories, signs, ownership, consent, practice and feedback policies are unchanged.

## Exact SQL to run, in order

For an existing database with migrations **003, 004, 005 and 006 already applied**:

1. Review the diff. Run the **entire exact contents of [007_translations.sql](../supabase/migrations/007_translations.sql)**, from `begin;` through `commit;`, in the Supabase SQL editor. There are no placeholders to replace. This is the only new SQL to apply. It can be rerun.
2. Run the ordinary-account checks below. Do not apply `schema.sql` on top of an existing installation; it is the canonical fresh-install schema and already contains 007.

The transaction deliberately fails if existing rows use another language or contain whitespace-only/overlong text. It does not delete or rewrite those rows. Resolve such legacy data with its owner before rerunning; do not weaken the constraints. On a fresh empty installation, run the complete canonical schema once instead of separately replaying migrations.

## Server configuration and privacy

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in the server environment, then restart/redeploy. `.env.example` already contains both names. Neither value is returned to the client; the editor gets a boolean for AI availability. The only added dependency is pinned `openai@6.32.0`.

The official SDK request uses the Responses API, fixed translation-only instructions, only English caption text as its input, `store: false`, a 20-second timeout, `maxRetries: 0`, SDK logging off and at most 4,096 output tokens. Incomplete or invalid responses are rejected. See [official OpenAI SDK documentation](https://developers.openai.com/api/reference/typescript). Errors log one fixed reason code, never content, keys or raw errors.

The helper never accepts video, sign records, story objects, names or account objects. The storyteller must check a box confirming the saved caption contains no personal information before generating. Local validation rejects obvious email addresses, web links and phone-number patterns; the action also rejects the storyteller's known display name/email in the reserved caption. Arbitrary personal names cannot be reliably detected from prose by these local checks: the storyteller's review of the caption is required. No external personal-data detection service is used. To retain personal details in a caption, write the translations manually instead of generating them.

## Automated checks (offline)

```sh
npm run lint
npm run build
node --test tests/*.test.mjs
# Detailed individual translation test results:
node tests/translations.test.mjs
```

The translation harness executes actual TypeScript helpers/actions using a mocked OpenAI SDK and session client. It covers success, prompt boundaries, timeout, rate limit, missing key/model, empty/oversized/incomplete output, private-contact input rejection, double submit, database reservation refusal, non-owner/learner/teacher rejection, failed/stale generation cleanup, edited AI provenance and approval/remove mutations. These mocks do not execute PostgreSQL RLS or triggers; the checks below exercise those on your test database.

## Manual storyteller and learner checks

Use separate browser profiles for Storyteller A, Storyteller B, a learner and a teacher. Use only permitted recordings and fictional captions without personal information.

1. Open A's existing draft at `/studio/[storyId]/edit`. Translations appears as step 2 after Caption. Generate both languages. Each saved row has an AI draft chip and an editable textarea. English captions, video, credit and consent keep working.
2. Click Generate twice rapidly and simultaneously from two tabs for the same language. There should be one AI call/one charged attempt. Generate different languages together; the total count remains at most 10. Try an eleventh attempt, including after removing a translation: no call, recoverable error; manual editing still works.
3. Save an edited translation: it is an unapproved draft and AI provenance remains true. Approve only the saved text; unsaved edits disable Approve. Approval states that learners will see it. Remove approval, approve again, and remove the row. Repeat in both languages, on draft and published stories.
4. Publish with isiZulu approved and Afrikaans unapproved. Learner and teacher see English at all times and only English/isiZulu in the switch. Select isiZulu: see “Translated with AI and approved by the storyteller.” No draft content should occur in HTML, RSC payloads or REST responses. Remove the only approval: nothing extra appears below English.
5. Edit English: the editor visibly warns that all approvals will reset and disables translation actions until saved. Save, then check both approval flags are false. Publish again without approving translations: learners see English only.
6. Regenerate approved text: the previous approval is withdrawn at reservation time, even if the new text is identical. Make the AI request fail: the old text is retained privately, the error remains visible and the story editor works. Retry or edit manually.
7. During generation, change and save the English caption from another tab. The old request must not save its output, including if the caption is changed back. Reload and generate from the saved caption. A server interruption must recover after one minute; no automatic AI retry occurs.
8. Withdraw/unpublish, set Private, or remove consent. Learner/teacher direct reads of translations become empty through story RLS. Owners still see their drafts. Restore valid publication and verify approved translations follow the existing visibility rules.
9. Temporarily omit the API key, then the model, and restart. Generate is hidden with a short explanation; manual translation save/approve/remove and the core story loop work. Simulate timeout/rate-limit and disconnected fetches: written errors, no raw output or credentials in logs. A failed optional translation load leaves playback/editor available with a reload message.
10. Check at 320px/360px and desktop: no horizontal overflow, readable text, large tap targets, keyboard focus, labelled controls and written loading/errors. Check a deployed preview after review. Home/list cards must be unchanged.

## Cross-user browser-console tests

Prepare A's published, consented, nonprivate story with **zu approved, af unapproved**. In the browser console for the learner, run this using the public URL/anon key and that learner's own temporary access token from an authenticated Supabase Network request. Paste values only into the local prompts. Never use a service-role key. The snippet prints check results only, not tokens or translation text.

```js
(async () => {
  const base = prompt('Supabase public project URL').replace(/\/$/, '');
  const key = prompt('Public anon key');
  const token = prompt('This account access token, without Bearer prefix');
  const storyId = prompt('Storyteller A story UUID');
  const headers = { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const me = await fetch(`${base}/auth/v1/user`, { headers });
  if (!me.ok) throw new Error('Use a valid signed-in session.');
  const root = `${base}/rest/v1/story_translations`;
  const scope = `story_id=eq.${encodeURIComponent(storyId)}`;
  const read = async suffix => {
    const response = await fetch(`${root}?${scope}&select=id,language,approved_by_storyteller${suffix}`, { headers });
    if (!response.ok) throw new Error('Translation read failed.');
    return response.json();
  };
  const visible = await read('');
  console.assert(visible.length === 1 && visible[0].language === 'zu', 'Only approved zu is readable');
  console.assert((await read('&approved_by_storyteller=eq.false')).length === 0, 'Draft reads are empty');
  console.assert((await read('&language=eq.af')).length === 0, 'Known draft language is hidden');
  for (const [method, body] of [
    ['PATCH', { text: 'Unauthorized test change', approved_by_storyteller: true }],
    ['DELETE', undefined],
  ]) {
    const response = await fetch(`${root}?${scope}`, {
      method, headers: { ...headers, Prefer: 'return=representation' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const rows = response.ok ? await response.json() : [];
    console.assert(!response.ok || rows.length === 0, `${method} cannot affect any translation`);
  }
  const insert = await fetch(root, {
    method: 'POST', headers,
    body: JSON.stringify({ story_id: storyId, language: 'af', text: 'Unauthorized insertion' }),
  });
  console.assert(insert.status === 401 || insert.status === 403, 'INSERT rejected by RLS');
  const reserve = await fetch(`${base}/rest/v1/rpc/reserve_translation`, {
    method: 'POST', headers, body: JSON.stringify({ p_story_id: storyId, p_language: 'af' }),
  });
  console.assert(!reserve.ok, 'Generation RPC rejects non-owner');
  console.info('Cross-user checks finished; verify there are no assertion failures.');
})();
```

Repeat as teacher and Storyteller B: identical results. Verify with A afterward that neither translation was changed/removed. With the story withdrawn/private/nonconsented, repeat the GETs: all must return `[]` (the first assertion's expected count becomes zero). These direct REST requests test the same RLS as the browser Supabase client, without relying on UI filtering.

As A, direct-client writes must also exercise database triggers. Use the same local header setup above and the following operations in order (on a disposable draft or a valid published test story):

1. PATCH the zu row with a different `text` and `approved_by_storyteller: true` in the **same request**. Read it back as A: approval must be false. A subsequent approval-only PATCH can set it true.
2. Approve both rows, then PATCH `stories?id=eq.<story UUID>` with a changed `caption_en` only, leaving `updated_at` out. Read the two translation flags: both must be false. Repeat with an unapproved draft and confirm learners still read nothing.
3. POST a new translation with `approved_by_storyteller: true`: it must be saved false. A duplicate story/language must be rejected. Language `xh`, whitespace-only text and 12,001 characters must be rejected. Try clearing `ai_generated` on an AI-origin row: it must remain true. Try changing its story/language identity: rejected.
4. Approve zu, call the reserve RPC as A, and read zu: approval false immediately. Finish with the returned token and exactly the old text: it remains an AI draft. Finish with null text to release a failed reservation. Only this owner's valid reservation can be finished.

## Files and exclusions

Created: `app/actions/translations.ts`, `lib/ai/translate.ts`, `lib/translations/validation.ts`, `lib/translations/data.ts`, `components/stories/translations-editor.tsx`, `components/stories/translation-switch.tsx`, `supabase/migrations/007_translations.sql`, `tests/translations.test.mjs`, and this review guide.

Changed: `app/(platform)/studio/[storyId]/edit/page.tsx`, `app/(platform)/stories/[storyId]/page.tsx`, `components/stories/editor.tsx`, `supabase/schema.sql`, `package.json`, `package-lock.json`. Moved: none.

Not done: milestone 9/practice prompts; sign-language AI; video/sign/profile transmission to AI; service-role translation access; home/list-card changes; database execution; live AI requests; commits; deployment; claims of live RLS/phone/preview verification.

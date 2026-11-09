# SignStories implementation plan

Planning only: no application code or schema changes are part of this task. Based on `SPEC.md`, `AGENTS.md`, and the existing root `schema.sql`.

## Understanding and scope

Build a mobile-first hackathon proof of concept for 9–11 November 2026. Deaf storytellers share short South African Sign Language (SASL) stories with English captions, tag key signs, and control consent, credit, and permitted use. Learners watch, practise a sign, and receive feedback from the storyteller or a manually assigned teacher.

The essential loop is: sign up → upload a story → caption and tag 3–5 signs → set credit and consent → publish → watch and practise → receive human feedback. Every story view, including list cards and review context, must show the storyteller's name and credit line. Ownership and usage terms remain visible on the story page.

Only the owner may view a story unless it is published, consent is confirmed, and usage is not private. All videos live in private buckets. Other users receive short-lived signed URLs only after server-side authorization. Practice recordings are restricted to the learner, the story's storyteller, and teachers.

AI is optional and text-only: draft caption translations into isiZulu and Afrikaans, then practice prompts if time permits. Every AI output starts with `ai_generated = true` and `approved_by_storyteller = false`; learners see it only after explicit storyteller approval. Never send signing videos to AI or recognize, generate, grade, or translate signing with AI.

No payments, financial information, employer training, unapproved video reuse, or audio-dependent flows. Collect only display name, email, and role. Use plain, respectful English, visible captions, high contrast, large tap targets, and visible keyboard focus.

## Deadline and daily scope

All times below use Africa/Johannesburg (SAST, UTC+02:00), the working timezone for this plan.

- **Final deadline: Wednesday 11 Nov 2026 at 23:59.**
- **Target submission: Wednesday 11 Nov at 18:00.** The remaining time is contingency for submission or deployment problems, not planned feature work.
- **Feature freeze: Wednesday 11 Nov at 12:00 (noon).** After noon, only demo-blocking fixes, validation, documentation, rehearsal, recording, and submission.
- **Day 1 — Monday 9 Nov:** SPEC's Day 1 done-when only: a storyteller uploads a video and sees it in a list on a deployed link, plus the role-lock fix and working test accounts for learner, storyteller, and teacher. Milestones 1–3 supply only the foundation and safeguards needed for that outcome. Use an owner-only draft list; public publishing, sign tagging, learner detail playback, practice, and feedback start on Tuesday.
- **Day 2 — Tuesday 10 Nov:** complete milestones 4–7 and demonstrate the core loop with separate accounts by evening. Use **18:00 Tuesday** as the core-loop gate for milestone 9. Translations are a should-have after the loop works.
- **Day 3 — Wednesday 11 Nov:** finish any retained optional feature before noon, then freeze and validate the deployed demo, prepare the three-minute recording and README, and submit by 18:00.

## Existing data model

The schema already supplies:

- `profiles`: one learner, storyteller, or teacher role per account; signup creates a profile and prevents selecting teacher at signup.
- `stories`, `signs`, and `story_translations`: story metadata, English caption, timed sign tags, and translation approval state.
- `ownership_settings` and `consent_log`: consent, permitted use, download preference, credit, and a trigger-created history of ownership changes.
- `practice_attempts` and `feedback`: learner submissions and human comments with a simple rating.
- RLS enabled on all application tables, authorization helper functions, and private `stories` and `practice` storage buckets with a 50 MiB limit and MP4, WebM, and MOV MIME types.

This is a starting point, not yet a complete enforcement of the project rules. Keep RLS on throughout implementation and verify access using ordinary authenticated accounts, not only the service role.

## Ambiguities, gaps, and proposed decisions

Priority means **must** for the demo or its safety rules, **should** if the core loop leaves time, and **later** for work in Deferred. “Decide by milestone” is the latest point to settle the approach; delivery follows the milestone schedule below. The choices requested for duration, uploads, captions, and session refresh are settled here.

| Area | Evidence or unresolved question | Proposed approach | priority | decide by milestone |
| --- | --- | --- | --- | --- |
| Schema location | The file is currently `schema.sql`; AGENTS.md names `supabase/schema.sql`. | Move to the canonical path during foundation work and retain one authoritative copy. No move during this planning task. | must | 1 |
| Role security | The profile update policy permits changing `role`, including self-promotion to teacher. | Lock role changes at database level. Self-service edits cover display name only; teacher assignment is administrative. Provision and test all three role accounts. | must | 2 |
| Authentication | Session refresh and deployed callbacks are required for working accounts. | Use email/password and Supabase session cookies. Add `@supabase/ssr` session refresh in milestone 1; configure confirmation and deployed callback URLs. Test renewed sessions. Full recovery UX is Deferred. Never bypass required verification. | must | 1 |
| Audience and roles | Browsing requires authentication; profiles have one role. | Keep signed-in browsing and one role per account; only learner accounts submit practice in MVP. Align server and database checks. | must | 2 |
| Publication validity | Caption, credit, duration, tags, and ownership need validation. | Keep incomplete stories as owner-only drafts. Validate publication atomically: nonempty caption and credit, duration, 3–5 valid signs, confirmed consent, and nonprivate usage. Enforce visibility and durable invariants in the database as well as server validation. | must | 4 |
| Media duration | Buckets cannot enforce duration; existing checks allow negative values. | Apply a client-side metadata check to story and practice videos: positive duration, at most 60 seconds. Require duration on completed records and add DB constraints `duration_seconds > 0 AND duration_seconds <= 60`. Validate submitted metadata on the server. This constrains recorded metadata; independent server inspection of the video bytes is Deferred. | must | 3 (stories); 6 (practice) |
| File size and compression | UI says 50 MB; the bucket uses 52,428,800 bytes (50 MiB). | Use one exact byte ceiling in UI/server/bucket checks and show it clearly. Check project limits during setup. Add upload guidance: “Keep your video to 60 seconds or less and no larger than 50 MiB. If it is too large, trim it or export at a lower resolution before uploading.” No built-in compression. | must | 3 |
| Captions | Whole-story captions exist; practice captions have no dedicated field. | Show English captions by default. Add a required, nonempty `caption` field on `practice_attempts`, enforced in the DB and server validation, and display it beside every practice playback. Timed subtitles are Deferred. | must | 3 (stories); 6 (practice) |
| Sign integrity | Timestamp bounds and cross-story sign references need checks. | Require valid ranges within stored story duration and enforce that a practice sign belongs to its story. | must | 4; confirm at 6 |
| Consent and history | Existing history omits credit changes; ownership deletion could bypass history. | Keep consent/usage/credit changes atomic and logged; reject ownership deletion that bypasses history. Keep history owner-only. Extra timestamp automation and audit tooling are Deferred. | must | 4 |
| Withdrawal | Issued signed URLs remain usable until expiry. | Use a short documented playback URL lifetime, authorize every issuance, hide withdrawn/private stories from others, and prevent raw storage access bypasses. Explain the expiry window. | must | 3 (private access); 4 (withdrawal) |
| Signed uploads and file ownership | Paths must bind to the authenticated uploader and intended record. | Server authorizes each upload and issues a signed upload URL for `{user_id}/{uuid}.{ext}` in a private bucket. Browser uploads directly with progress; server verifies path ownership, object existence, and submitted metadata before finalizing. Scheduled orphan cleanup is Deferred. | must | 3; reuse at 6 |
| AI translations and approval | Approval exists; source edits need invalidation. | Implement translations only after the core loop. Save private drafts; regeneration, text edits, or source-caption changes require approval again. Approval gates are mandatory for any AI feature that ships. | should | 8, after 7 |
| Practice prompts | No prompt model exists. | Milestone 9 is cut unless milestones 4–7 are complete on the deployed link by Tue 10 Nov at 18:00. If retained, include protected drafts and storyteller approval and finish before Wed noon. | later | 7, Tue 18:00 gate |
| Feedback | Editing and shared reviewer visibility are unspecified. | Use immutable comments and allow multiple reviews. Keep current author/learner feedback reads and authorized teacher access to attempts; broader collaboration is Deferred. | must | 7 |
| Downloads | Not needed for the demo. | No download action; keep `allow_download` false. Document that playback cannot guarantee prevention of copying. | later | 4 |
| Personal data | Optional profile fields and retention are unspecified. | Collect only display name, email, and role. Agree demo-media retention and manual deletion with owners before collecting recordings; self-service deletion and automated cleanup are Deferred. | must | 2 |
| Demo readiness | Infrastructure, permitted media, and tester availability need checking. | Use SignStories as working name; confirm access and permitted demo media on Monday. Arrange voluntary Deaf testing if available. Plan for Wed 12:00 freeze, 18:00 submission, and 23:59 final deadline. Never invent survey findings. | must | 1 (access); 7 (demo readiness); 10 (submission) |

## Proposed technology stack

Retain the stack required by AGENTS.md; no alternative framework or database is needed.

- **Application:** Next.js App Router, strict TypeScript, Tailwind CSS, and npm. Pin compatible package versions during scaffolding.
- **Rendering and mutations:** server components for data views; server actions for validated forms; route handlers for media authorization, upload finalization, and other HTTP endpoints. Use client components only for playback, recording, upload progress, and interactive forms.
- **Validation:** Zod at every server input boundary, supplemented by database constraints and RLS. Derive the acting user from the verified session, never submitted user IDs.
- **Backend:** Supabase Postgres, Auth, and private Storage using `@supabase/supabase-js` and `@supabase/ssr`. Use session-scoped clients for normal data operations; isolate service-role use to authorized storage signing and explicit administration.
- **AI:** OpenAI API through server-only helpers, receiving caption text only. Validate generated text structure, save drafts, and expose explicit approval actions. Select the model through `OPENAI_MODEL` during setup.
- **Media:** browser video playback and MediaRecorder where supported, with an upload fallback for unsupported devices. Upload directly to private Supabase Storage using server-issued signed upload URLs, with progress feedback and compression guidance; keep large files out of ordinary application form requests. Verify mobile recording formats and codecs on target devices.
- **Hosting:** Vercel previews and final deployment, with separate environment configuration and working Supabase authentication redirects.
- **Verification:** ESLint, TypeScript/build checks, database access tests across roles, a focused end-to-end core-loop check, and manual phone/keyboard testing. Add test tooling only where it verifies meaningful authorization or behavior.

Environment variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`. Commit an `.env.example` with empty values; ignore `.env.local`. Mark secret-bearing modules server-only and never expose keys in client bundles or logs.

## Proposed folder structure

```text
app/
  layout.tsx
  page.tsx                         # Entry page
  globals.css
  (auth)/
    sign-in/page.tsx
    sign-up/page.tsx
  auth/callback/route.ts
  (platform)/
    layout.tsx                     # Authenticated navigation
    stories/page.tsx               # Visible story list
    stories/[storyId]/page.tsx     # Captioned playback, credit, signs
    stories/[storyId]/practice/page.tsx
    studio/page.tsx                 # Storyteller's drafts and stories
    studio/new/page.tsx
    studio/[storyId]/edit/page.tsx # Caption, tags, ownership, AI approvals
    practice/page.tsx               # Learner submissions and feedback
    reviews/page.tsx                # Authorized review queue
    reviews/[attemptId]/page.tsx
  actions/                         # Small server action modules by feature
  api/media/                       # Validated upload/finalization/signing handlers
  # Add loading.tsx, error.tsx, and not-found.tsx at appropriate route boundaries.
components/
  ui/                              # Accessible shared controls and notices
  stories/                         # Credit, ownership, captions, playback, sign tags
  practice/                        # Recorder, upload progress, feedback forms
lib/
  supabase/
    browser.ts
    server.ts
    admin.ts                       # Server-only service-role client
  ai/                              # Server-only text drafting helpers
  auth/                            # Session and role checks
  validation/                      # Zod schemas
  data/                            # Session-scoped queries and mutations
  media/                           # Authorization, metadata checks, paths, limits
  types/                           # Generated database types and shared types
supabase/
  schema.sql                       # Authoritative schema, RLS, functions, buckets
  seed.sql                         # Fake metadata; permitted media provisioned separately
tests/
  authorization/                   # Database/storage access and approval boundaries
  e2e/                             # Core user journey
public/                            # Static UI assets; no private video files
.env.example
AGENTS.md
SPEC.md
PLAN.md
README.md
package.json
```

Keep modules small; introduce folders when their functionality is implemented. Version future schema changes with a documented migration process while keeping the authoritative schema current. Do not maintain conflicting root and nested schema files.

## Small milestones

Each milestone should be independently reviewable with a focused commit. Once application code exists, completion requires `npm run lint`, `npm run build`, a working Vercel preview, and a phone-sized viewport check. No commit or deployment is part of this planning task.

| Milestone | Deliverable | Completion evidence | Target |
| --- | --- | --- | --- |
| 1. Foundation and sessions | Scaffold the required stack, environment template, accessible shell, Supabase clients with session refresh, and blank preview. Put schema at its canonical path. | Build/lint pass; preview opens on a phone; secrets stay server-side; expired sessions refresh correctly on the deployed app. | Mon 9 Nov, first |
| 2. Role lock and test accounts | Protect roles at DB level; configure minimal signup and deployed auth callbacks. Create learner, storyteller, and manually assigned teacher test accounts. | Each account signs in; direct profile mutation cannot change role or grant teacher access; RLS remains enabled. | Mon 9 Nov |
| 3. Upload and owner list — Day 1 finish | Story upload through signed upload URLs, progress, format/size checks, client-side duration check and DB constraint (positive, <=60s), compression guidance, required caption/credit, private draft record, and owner-only list. | Storyteller uploads and sees the story in a list on a deployed link. Another account cannot read the draft or obtain its video URL; invalid uploads fail clearly. This is the SPEC Day 1 done-when; no publishing or learner loop required today. | Mon 9 Nov, end of day |
| 4. Tags, ownership, and publishing | Edit 3–5 sign tags, set consent and usage, maintain credit/consent history, and publish atomically. | Invalid publication fails; withdrawal hides stories from others; drafts and nonconsented/private stories remain private. | Tue 10 Nov |
| 5. Learner playback | Extend the owner list to authorized shared stories; add learner detail playback, visible captions, credit/terms, timestamp navigation, signed playback, and empty/error states. | Learner browses and watches on a phone; direct requests cannot expose private stories or AI drafts. | Tue 10 Nov |
| 6. Practice submission | Record or upload for a selected sign using signed upload URLs, duration checks/DB constraint, required `practice_attempts.caption`, progress and retry states. | Correct story/sign binding; blank captions and invalid duration fail; captions show on playback; unrelated users cannot read attempts or obtain video URLs. | Tue 10 Nov |
| 7. Human feedback and core-loop gate | Minimal storyteller/teacher review queue, private captioned playback, comment/rating, and learner feedback view. | Separate accounts complete upload → publish → watch → practise → review on the deployed link; unauthorized reviews fail. Record pass/fail at Tue 18:00. | Tue 10 Nov, by 18:00 |
| 8. AI translations — should | After milestone 7, add text-only isiZulu/Afrikaans drafts, editing, approval/invalidation, and recoverable errors. Cut if it threatens freeze or submission. | Learners cannot read drafts; approval reveals text; edits require renewed approval. AI failure does not block the loop. | Tue evening–Wed before 12:00 |
| 9. Optional prompts — CUT unless gate passes | Cut unless the core loop (milestones 4–7) is done on the deployed link by Tue 18:00. A pass only makes prompts eligible if time remains after higher priorities; add prompt model, text generation, and approval UI together. | Private drafts and approval verified; no video enters AI requests. Cut unfinished work at feature freeze. | Decide Tue 10 Nov 18:00; finish before Wed 11 Nov 12:00 |
| 10. Freeze, validate, and submit | Start testing as the loop lands; obtain Deaf feedback if available. Freeze features Wed noon. Fix demo blockers, check permitted content, finish README, rehearse and record the three-minute demo, and verify final deployment. | Phone core loop, access checks, lint/build, captions, credit, consent, and preview pass. Submit and verify receipt by Wed 18:00; contingency ends at the final deadline, Wed 23:59. | Wed 11 Nov: freeze 12:00; target 18:00; deadline 23:59 |

## Deferred

Move these outside the hackathon demo critical path; revisit after submission:

- Independent server-side video metadata inspection/transcoding. MVP checks duration in the client, validates submitted metadata on the server, and constrains stored duration in the DB; it does not prove the actual file duration against a tampered client.
- Scheduled cleanup of abandoned uploads and deleted-record files; use a documented manual cleanup process for demo media and agreed retention.
- Full account recovery UX, self-service account/content deletion, and automated retention tooling. Keep working demo login, session refresh, verification, and manual deletion available.
- Extra audit timestamp automation, audit reporting, and migration tooling beyond the schema changes needed for the demo. Keep the required ownership/credit change log and one authoritative schema.
- Timed subtitle tracks, built-in compression, wider device/codec coverage beyond target phone checks and upload fallback.
- Feedback editing and broader reviewer collaboration, optional profile fields, and download UI.
- Practice prompts (milestone 9) unless the Tuesday evening gate passes. Passing the gate never extends Wednesday's noon freeze.

Security, RLS, role locking, private storage authorization, consent, credit, captions, and approval of any shipped AI output remain required. These are not deferred hardening.

## Verification priorities and scope control

Test the boundaries that protect people: role escalation; owner versus learner versus teacher access; missing ownership settings; draft/private/nonconsented stories; consent withdrawal; storage signing and file-path ownership; cross-story sign references; and AI approval bypasses. Confirm ordinary authenticated API requests cannot evade UI rules. Check loading, upload failure/retry, permission-denied recording, unsupported formats, and expired signed URLs on the deployed preview.

Use only consented recordings or self-recorded demo media. Fake metadata must be labeled; never present invented community feedback as research. Test playback and recording on at least one target phone browser, with upload fallback available, and verify all meaning and status changes are visible without sound.

Follow the spec's cut order: practice prompts, download option, teacher-facing functionality, then translations. Keep the existing role model secure even if teacher UI is deferred; the storyteller still supplies human feedback. Never cut captions, consent, credit, private media authorization, learner practice, storyteller feedback, or approval gates for any AI feature that ships.

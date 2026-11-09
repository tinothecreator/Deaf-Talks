# SignStories implementation plan

Planning only: no application code or schema changes are part of this task. Based on `SPEC.md`, `AGENTS.md`, and the existing root `schema.sql`.

## Understanding and scope

Build a mobile-first hackathon proof of concept for 9–11 November 2026. Deaf storytellers share short South African Sign Language (SASL) stories with English captions, tag key signs, and control consent, credit, and permitted use. Learners watch, practise a sign, and receive feedback from the storyteller or a manually assigned teacher.

The essential loop is: sign up → upload a story → caption and tag 3–5 signs → set credit and consent → publish → watch and practise → receive human feedback. Every story view, including list cards and review context, must show the storyteller's name and credit line. Ownership and usage terms remain visible on the story page.

Only the owner may view a story unless it is published, consent is confirmed, and usage is not private. All videos live in private buckets. Other users receive short-lived signed URLs only after server-side authorization. Practice recordings are restricted to the learner, the story's storyteller, and teachers.

AI is optional and text-only: draft caption translations into isiZulu and Afrikaans, then practice prompts if time permits. Every AI output starts with `ai_generated = true` and `approved_by_storyteller = false`; learners see it only after explicit storyteller approval. Never send signing videos to AI or recognize, generate, grade, or translate signing with AI.

No payments, financial information, employer training, unapproved video reuse, or audio-dependent flows. Collect only display name, email, and role. Use plain, respectful English, visible captions, high contrast, large tap targets, and visible keyboard focus.

## Existing data model

The schema already supplies:

- `profiles`: one learner, storyteller, or teacher role per account; signup creates a profile and prevents selecting teacher at signup.
- `stories`, `signs`, and `story_translations`: story metadata, English caption, timed sign tags, and translation approval state.
- `ownership_settings` and `consent_log`: consent, permitted use, download preference, credit, and a trigger-created history of ownership changes.
- `practice_attempts` and `feedback`: learner submissions and human comments with a simple rating.
- RLS enabled on all application tables, authorization helper functions, and private `stories` and `practice` storage buckets with a 50 MiB limit and MP4, WebM, and MOV MIME types.

This is a starting point, not yet a complete enforcement of the project rules. Keep RLS on throughout implementation and verify access using ordinary authenticated accounts, not only the service role.

## Ambiguities, gaps, and proposed decisions

| Area | Evidence or unresolved question | Proposed approach |
| --- | --- | --- |
| Schema location | The file is currently `schema.sql`; AGENTS.md names `supabase/schema.sql` as the source of truth. | Move it to the specified location during foundation work, update references, and retain one authoritative copy. Do not move it during this planning task. |
| Role security | The profile update policy restricts rows but does not prevent changing `role`. This permits self-promotion to teacher despite the comment saying promotion is administrative. | Protect the role column at database level. Self-service profile edits cover display name only; teacher assignment uses a controlled administrative operation. |
| Authentication | Email/password versus email link, confirmation behavior, and account recovery are unspecified. | Start with email/password and Supabase session cookies; configure confirmation, recovery, and preview callback URLs before the demo. Never silently bypass required verification. |
| Audience and roles | Current policies require authentication to browse. Profiles support one role, and practice insertion does not enforce the learner role. | Keep browsing signed-in for MVP and document one role per account. Decide whether storytellers and teachers may also practise; align UI and database checks with that decision. |
| Publication validity | Captions and duration are nullable, credit can be empty, and there is no publication check for 3–5 signs, ownership, or timestamp bounds. | Save incomplete work as drafts. Publish through an atomic validated operation requiring a nonempty caption and credit, verified duration, 3–5 valid sign tags, and confirmed nonprivate ownership. Enforce invariants in the database as well as server validation. |
| Media validation | Storage enforces bytes and MIME allowlists, but cannot enforce the 60-second duration limit through bucket settings. Existing duration checks also allow negative values. | Validate size, allowed format, and duration in the UI and verify media on the server before publication or practice submission. Choose a media metadata inspection approach compatible with hosting during the upload milestone. Require positive duration at most 60 seconds; do not trust client metadata alone. |
| File size wording | UI instructions say 50 MB; bucket configuration uses 52,428,800 bytes (50 MiB). | Use the bucket's exact byte ceiling consistently and explain the limit clearly in the UI. Verify actual project limits during setup instead of relying on the schema's free-tier comment. |
| Captions | Only a whole-story English caption exists; timed subtitle cues and practice captions have no fields. “Every video has a caption” also applies to practice recordings. | Show the full English story caption by default beside playback; timed captions are a later enhancement unless testing shows they are necessary. Decide how to require a short written practice caption, potentially using a clearly defined required `note`, before building recording. |
| Sign integrity | Start/end timestamps are nullable; end can precede start or exceed the story duration. A practice `sign_id` can reference another story. | Require valid sign ranges within the verified duration and enforce that a selected practice sign belongs to its story. |
| Consent and history | The log captures usage, download permission, and consent, but omits credit changes and does not maintain `consent_at` or `updated_at` automatically. Owners can delete ownership rows under the current policy. | Define consent timestamp semantics, automate timestamps, capture credit changes in the audit history, and prevent deletion from bypassing the change log. Save ownership changes atomically. Keep history owner-only for MVP, matching existing RLS. |
| Withdrawal | Previously issued signed URLs remain usable until expiry, and file-owner storage reads can outlive story visibility. | Use a short documented URL lifetime, recheck authorization on every issuance, and exclude withdrawn/private stories from all other-user views. Prevent raw file access from bypassing story or practice access rules. Explain the expiry window when consent is withdrawn. |
| Storage integrity | Uploads are limited to the user's folder, but story and attempt rows do not bind video paths to validated owned objects. | Generate `{user_id}/{uuid}.{ext}` paths on the server, bind uploads to their intended record, and verify ownership and completed media validation before finalizing. Clean up abandoned uploads and deleted-record files. |
| AI approval | Translations have approval fields, but no practice-prompt table exists. Editing approved text or changing source captions has no defined invalidation behavior. | Implement translations first. Regeneration or content edits reset approval; source-caption changes invalidate affected AI drafts. Add a separately protected prompt model only if prompts remain in scope. Human approval is required for prompts too. |
| Feedback | Reviewer edits, multiple reviews, and the scope of teacher access are unspecified. Current feedback reads allow its author and the learner, while all teachers can access attempts. | Start with immutable submitted comments and allow multiple reviews. Keep teacher access to attempts as specified; decide whether other eligible reviewers should see existing feedback before building the review screen. |
| Downloads | A setting exists, but download behavior is not specified and the feature is in the cut order. | Omit a download action from MVP and leave `allow_download` false. Explain that a browser playback setting cannot guarantee prevention of copying or screen recording. |
| Personal data and deletion | Profiles include optional bio, province, and SASL variety; retention, account deletion, and storage cleanup are unspecified. | Do not collect optional profile fields for MVP. Decide a short demo-recording retention period and an account/content deletion process that also removes stored files. |
| Demo readiness | Project access, deployment credentials, permitted recordings, tester availability, final name, and exact submission time are not established in the files. | Use SignStories as the working name. Confirm infrastructure access and deadline early. Use clearly fake text or self-recorded/permitted videos only; arrange voluntary Deaf testing without inventing survey findings. |

## Proposed technology stack

Retain the stack required by AGENTS.md; no alternative framework or database is needed.

- **Application:** Next.js App Router, strict TypeScript, Tailwind CSS, and npm. Pin compatible package versions during scaffolding.
- **Rendering and mutations:** server components for data views; server actions for validated forms; route handlers for media authorization, upload finalization, and other HTTP endpoints. Use client components only for playback, recording, upload progress, and interactive forms.
- **Validation:** Zod at every server input boundary, supplemented by database constraints and RLS. Derive the acting user from the verified session, never submitted user IDs.
- **Backend:** Supabase Postgres, Auth, and private Storage using `@supabase/supabase-js` and `@supabase/ssr`. Use session-scoped clients for normal data operations; isolate service-role use to authorized storage signing and explicit administration.
- **AI:** OpenAI API through server-only helpers, receiving caption text only. Validate generated text structure, save drafts, and expose explicit approval actions. Select the model through `OPENAI_MODEL` during setup.
- **Media:** browser video playback and MediaRecorder where supported, with an upload fallback for unsupported devices. Upload directly to private Supabase Storage with scoped authorization and progress feedback; keep large files out of ordinary application form requests. Verify mobile recording formats and codecs on target devices.
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
| 1. Foundation | Scaffold the required stack, environment template, accessible shell, Supabase clients, and blank preview. Put schema at its canonical path. | Build/lint pass; preview opens on a phone; secrets stay server-side. | Day 1 |
| 2. Secure accounts and data | Apply reviewed schema changes, protect roles, configure signup/session/recovery, and manually provision a teacher. | Learner/storyteller signup works; direct profile mutation cannot grant teacher access; RLS remains enabled. | Day 1 |
| 3. Private story draft upload | Upload progress, format/size/duration validation, private storage paths, draft record, required caption and credit capture, and failure cleanup. | Owner can upload and play a draft; another account cannot read its record or obtain its video URL; invalid files fail clearly. | Day 1 |
| 4. Tags, ownership, and publishing | Edit 3–5 sign tags, set consent and usage, maintain change history, and publish atomically. | Invalid publication fails; published, consented, nonprivate stories appear with name, credit, captions, and terms; withdrawing consent hides them. | Day 2 |
| 5. Learner playback | Story list/detail, visible captions, timestamp navigation, authorized signed playback, and clear empty/error states. | A learner can browse and watch on a phone; private/draft stories and unapproved translations stay inaccessible through direct requests too. | Day 2 |
| 6. Practice submission | Record or upload an attempt for a selected sign, capture its written caption, show progress and retry states. | Attempt links to the correct story/sign; unrelated users cannot read it or obtain a playback URL. | Day 2 |
| 7. Human feedback | Storyteller/teacher review queue, private playback, comment and rating, learner feedback view. | Complete upload → publish → practise → review loop with separate accounts; unauthorized reviews fail. Core MVP is now complete. | Day 2 |
| 8. AI translations | Text-only isiZulu/Afrikaans drafts, editing, approval, invalidation, and recoverable generation errors. | Learners cannot read drafts; approval reveals text; regeneration/source edits require renewed approval. AI failure does not block the core loop. | Late Day 2 / Day 3 |
| 9. Optional prompts | Add a prompt table and approval policies, then text-only prompt generation and approval UI. | Prompts remain private drafts until approved; no video enters AI requests. Start only if the core loop is stable. | Day 3, optional |
| 10. Validate and submit | Deaf user testing if available, mobile/accessibility fixes, permission-checked demo content, README, final preview, and three-minute demo. | A new user completes the loop; access checks, lint, and build pass; deployed preview works; confirm submission before the organizer's exact deadline. | Day 3 |

## Verification priorities and scope control

Test the boundaries that protect people: role escalation; owner versus learner versus teacher access; missing ownership settings; draft/private/nonconsented stories; consent withdrawal; storage signing and file-path ownership; cross-story sign references; and AI approval bypasses. Confirm ordinary authenticated API requests cannot evade UI rules. Check loading, upload failure/retry, permission-denied recording, unsupported formats, and expired signed URLs on the deployed preview.

Use only consented recordings or self-recorded demo media. Fake metadata must be labeled; never present invented community feedback as research. Test playback and recording on at least one target phone browser, with upload fallback available, and verify all meaning and status changes are visible without sound.

Follow the spec's cut order: practice prompts, download option, teacher-facing functionality, then translations. Keep the existing role model secure even if teacher UI is deferred; the storyteller still supplies human feedback. Never cut captions, consent, credit, private media authorization, learner practice, storyteller feedback, or approval gates for any AI feature that ships.

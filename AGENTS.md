# AGENTS.md

Instructions for AI coding agents (Codex) working on this repo. Read `SPEC.md` first.

## Project
A platform where Deaf storytellers share SASL (South African Sign Language) stories and learners learn signs from them, with feedback from people and clear credit and ownership. Hackathon proof of concept, 9 to 11 Nov 2026. Speed matters, but so does respect for the community.

## Stack
- Next.js (App Router) with TypeScript (strict) and Tailwind CSS
- Supabase: Postgres, Auth, Storage (`@supabase/supabase-js`, `@supabase/ssr`)
- Vercel for hosting
- OpenAI API, called only from server code (route handlers or server actions)

## Commands
- `npm run dev`: local dev server
- `npm run build`: must pass before any commit to main
- `npm run lint`: must pass

## Structure
- `app/`: routes and pages
- `components/`: shared UI
- `lib/supabase/`: browser and server clients
- `lib/ai/`: OpenAI helpers
- `supabase/schema.sql`: database schema, policies, and storage buckets (source of truth)

## Environment variables (never commit values)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `OPENAI_API_KEY` (server only), `OPENAI_MODEL`. Keep `.env.local` out of git and provide `.env.example` with names only.

## Hard rules
1. **No sign language AI.** Never add features that recognise, generate, grade, or translate sign language from video. People judge signing. AI may only work on text (captions, translations, practice prompts).
2. **Consent first.** A story is never visible to others unless its `ownership_settings.consent_confirmed` is true and `usage` is not `private`. Never add, copy, or scrape video content without the owner's permission. Use clearly fake or self-recorded seed data.
3. **Credit always.** Every story view shows the storyteller's name and the `credit_line`. Never hide or drop it.
4. **Human approval for AI output.** AI translations and prompts are saved as drafts (`ai_generated = true`, `approved_by_storyteller = false`) and shown to learners only after approval.
5. **No audio dependence.** All information must be available visually. Every video has a caption. No audio-only cues, ever.
6. **Respectful language.** Use "Deaf" or "Deaf and hard of hearing". Never use "mute", "deaf-mute", or "hearing impaired" in UI copy.
7. **Secrets stay server-side.** Never expose the service role key or OpenAI key to the browser.
8. **Row Level Security stays on** for every table. Do not disable RLS to make something work. Fix the policy instead.
9. **No real payments or financial data.** Out of scope.
10. **Minimal personal data.** Collect only what the spec needs (display name, email, role). POPIA applies.

## Code conventions
- TypeScript strict, no `any` unless justified in a comment.
- Prefer server components and server actions; client components only for recording, playback, and interactive forms.
- Validate all inputs on the server (use `zod`).
- Small, focused commits with clear messages. Keep changes scoped to the task.
- Handle loading and error states on every data fetch and upload.

## UI conventions
- Mobile first, large tap targets, high contrast, visible focus states.
- Plain, short English. Avoid idioms. Icons paired with text labels.
- Show captions by default. Provide clear upload progress and file size feedback.
- Videos: accept mp4, webm, mov; max 60 seconds and 50 MB (enforced in UI and bucket settings).

## Storage conventions
- Buckets are private. Files are stored at `{user_id}/{uuid}.{ext}`.
- Serve videos with short-lived signed URLs generated on the server after checking story visibility.
- Practice recordings are visible only to the learner, the story's storyteller, and teachers, via server-generated signed URLs.

## Definition of done for a task
- Builds and lints cleanly
- Works on a phone-sized viewport
- Respects the hard rules above
- Deployed preview link works

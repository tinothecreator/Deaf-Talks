# SignStories (working name): Project Spec

**Hackathon:** OpenAI x Andela, African Storytelling brief
**Build window:** 9 Nov to 11 Nov 2026 (3 days)
**Tracks:** Voices & Languages (primary), Truth, Authorship & Ownership (supporting)

## One-sentence scope
Deaf storytellers share SASL stories; learners learn signs from them with teacher feedback and clear credit.

## Problem
SASL is an official language, but learning material is scarce and learners rarely get feedback from a Deaf person. Deaf storytellers have no platform built for them, so their stories are often uncaptioned, uncredited, and reused without their control.

## Users
- **Storyteller:** a Deaf person who uploads SASL stories, highlights key signs, and controls how each story is used.
- **Learner:** a hearing or Deaf person learning SASL who watches stories, practises signs, and gets feedback.
- **Teacher:** a fluent signer who can give feedback on learner attempts. Teacher accounts are assigned manually in the demo.

## The one loop to build
1. A storyteller signs up and uploads a short SASL video (60 seconds or less).
2. They write the English caption, tag 3 to 5 key signs (label, meaning, timestamp), and set ownership and consent.
3. AI drafts translations of the caption (isiZulu, Afrikaans) and the storyteller approves or edits them.
4. A learner opens the story, watches it with captions, and sees the key signs.
5. The learner records a practice attempt of a sign.
6. The storyteller or a teacher reviews it and leaves feedback.
7. Every story page shows who told it and how it may be used.

## Must have (MVP)
- Auth with roles (learner, storyteller, teacher)
- Story upload and playback with captions
- Sign tagging tied to a story
- Ownership and consent settings, with a visible credit line and a change log
- Practice recording and feedback
- Mobile-friendly, visual-first UI with no reliance on audio

## Should have
- AI caption translation with storyteller approval
- AI-generated practice prompts from the story text (text only)
- Video size limit and compression guidance for low-data users

## Won't do (say so in the pitch)
- No AI recognition, generation, or grading of sign language. People judge signing.
- No real payments, no employer or workplace training (roadmap item).
- No use of anyone's video without their permission.

## AI use
| Feature | What AI does | Human control |
|---|---|---|
| Caption translation | Drafts translations | Storyteller approves or edits before publishing |
| Practice prompts | Writes text prompts from the caption | Storyteller can edit or remove |

## Stack
Next.js (App Router, TypeScript) + Tailwind, Supabase (Postgres, Auth, Storage), Vercel, OpenAI API (key stays server-side).

## Day-by-day plan
**Day 1 (Mon 9 Nov): foundation**
- Create the repo, Next.js app, Supabase project, and Vercel project; deploy a blank page.
- Add `AGENTS.md`, run `schema.sql`, set env vars, test sign-up and role selection.
- Build story upload to Supabase Storage and a story list page.
- Done when: a storyteller can upload a video and see it on a deployed link.

**Day 2 (Tue 10 Nov): the loop**
- Sign tagging and the ownership panel.
- Learner story page, practice recording, feedback flow.
- AI translation with approval.
- Done when: the full loop works end to end with seed data.

**Day 3 (Wed 11 Nov): polish and submit**
- Test with one or two Deaf contacts and fix what confuses them.
- Seed demo stories (only with permission), rehearse a 3-minute demo, record the video.
- Write the README and submit with time to spare. Confirm the exact deadline time with the organisers.

## Cut order if time runs short
Practice prompts, then download option, then teacher role, then translations. Never cut the core loop or the ownership and credit view.

## Demo script (3 minutes)
1. The problem and what the community survey said (use real findings only).
2. Storyteller uploads, tags signs, sets ownership.
3. Learner watches, practises, and records an attempt.
4. Storyteller gives feedback.
5. Show credit, consent settings, and the roadmap.

## Success criteria
- A live link works on a phone.
- A stranger can complete the loop without help.
- A Deaf tester says the flow makes sense.
- Every story shows credit and usage terms.

## Risks
- **Scope:** two-sided platform. Mitigation: one loop, seed data for the rest.
- **Video size:** Supabase free-tier uploads are capped (check current limit). Keep videos short.
- **Consent:** seed only with permission, or use your own recordings.
- **Overclaiming:** state clearly what the AI does and does not do.

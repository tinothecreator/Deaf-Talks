# Judge-facing repository handoff

## GitHub About settings

Copy these into the repository's About settings (gear beside About):

```text
Description: SignStories: Deaf-led SASL stories with captions, human feedback, consent and clear credit. Built for the OpenAI x Andela hackathon.
Website: https://deaf-talks.vercel.app
Topics: sasl, sign-language, accessibility, nextjs, supabase, hackathon, openai
```

## Before submission

- Replace `[ADD DEMO ACCOUNTS HERE]` in README.md with deliberately provisioned demo accounts. Do not reuse personal passwords. Email confirmation is enabled, so sign-up needs a real email.
- Replace `[ADD TEAM NAMES]` with the team's credited names.
- Confirm hosted migrations and test all three roles on the live app. Lint, build and mocked tests do not establish deployed behavior.
- Confirm public-use permission for people appearing in the existing videos and older screenshots before sharing those media further. Selected README screenshots show no people.

## Asset and secret audit

The pre-cleanup recursive `ls -lhR` listing and `git ls-files` asset list are in [ASSET-AUDIT.txt](ASSET-AUDIT.txt). Many brag-output files match ignore patterns but are already tracked: ignore rules do not untrack them. This cleanup leaves the existing videos and composition artifacts in Git.

- `demo-assets/SignStoriesDemoVid.mp4`: 174,550,059 bytes (174.6 MB / 166.5 MiB). Already ignored and untracked. Never add it to ordinary Git; the README links to the supplied YouTube upload.
- No other demo-assets/brag-output file exceeds 50 MB. No blob in reachable Git history exceeds 50 MB. No Git LFS added.
- `brag-output/deaf-talks-demo.mp4`: about 17 MB, already tracked; README links directly to it. No walkthrough upload is required for the relative link to work.
- Removed six tracked Windows `*:Zone.Identifier` metadata files. Added an ignore rule for them and `.env*`, keeping `.env.example`. `.DS_Store` and `*.tsbuildinfo` were already ignored.
- Searched tracked text and 452 reachable historical text/blob candidates for OpenAI key formats, Supabase secret keys, JWTs, signed URLs and environment assignments. Only empty assignments in `.env.example` matched the initial broad assignment scan. No secret values found; exact matches against locally configured environment values also found none in reachable historical text. No `.env` value file in reachable history. This is a pattern-based text scan, not a forensic audit of every video frame, audio track or unreachable Git object.
- Existing source footage/contact sheets show email entry/autofill and masked password fields. Those are not demo credentials supplied for publication. Selected screenshots exclude these regions; no credential values are repeated here. No tokens, keys, signed URLs or Supabase project URLs are visible in the selected images.

Optional hosted walkthrough upgrade:

1. Confirm consent for all people in the walkthrough.
2. In YouTube Studio choose Create → Upload videos → `brag-output/deaf-talks-demo.mp4`.
3. Title it “SignStories — full walkthrough”; retain the music attribution from README.md in its description. Set visibility to Unlisted or Public and finish publishing.
4. Copy its watch URL. Replace both relative walkthrough links in README.md with that URL, then commit the documentation change.

Alternatively use GitHub → Releases → Draft a new release, choose a version tag and target commit, attach `brag-output/deaf-talks-demo.mp4`, and publish the release. Replace the README walkthrough links with the published asset URL. No new media was uploaded during this cleanup.

## Screenshot provenance

All nine final images were visually inspected. They are at most 1280px wide and under 400 KB. No signer was cropped, blurred or altered. Portrait gallery images render at 230px width, side by side.

| Image | Source | Selection |
| --- | --- | --- |
| 01-landing.png | demo-assets/homepage.jpeg | Full supplied landing screenshot. |
| 02-storyteller-signup.png | StorytellerSignup.mp4, 00:30 | Crop x=0, y=282, width=384, height=550; role choices only, below all email/password fields. |
| 03-private-upload.png | StorytellerSignup.mp4, 01:09 | Caption, file input and limits; no media preview/person. |
| 04-private-draft.png | StorytellerSignup.mp4, 01:46 | Owner-only draft confirmation and credit. |
| 05-captions-and-signs.png | learnerlogin.mp4, 00:49.2 | Scrolled below the video: English caption, expiry notice and sign buttons. |
| 06-credit-and-usage.png | learnerlogin.mp4, 00:53 | Practice page credit and usage panel, black video area. |
| 07-teacher-account.png | teacherbrowse.mp4, 00:18 | Demo display name and Teacher role; outdated coming-soon copy remains visible. |
| 08-my-practice.png | demo-assets/practisepage.jpeg | Submitted practice and feedback state; includes unavailable-story handling. |
| demo-thumbnail.png | SignStoriesDemoVid.mp4, 02:30 | UI-only caption scene, scaled to 1280px; small play overlay added outside the phone UI. |

Coverage gaps: the available recordings do not show the storyteller tag editor or consent/publish settings. Learner Stories list candidates and full playback candidates show people; they were excluded because public-use consent is not established by the repository. Caption/sign UI and credit are shown in separate UI-only views instead. Do not present the credit panel as the publish-settings editor.

Excluded images showing people include demo-assets/storiespage.jpeg and storiespage2.jpeg, learnerlogin.mp4 at 00:18, 00:21 and 00:48, teacherbrowse.mp4 at 00:40, and SignStoriesDemoVid.mp4 at 01:00, 02:00, 03:00 and 03:40. This is a list of inspected examples, not an exhaustive frame index. Existing brag notes also identify people in the media and leave public permission unverified.

## Scope reconciliation

The requested future-only labels for practice recording, teacher feedback and OpenAI caption work conflict with this checkout. PracticeRecorder, practice submission actions, the Reviews routes, feedback actions and the server-only OpenAI translation helper exist, with focused tests and SQL migrations. README.md describes their implementation without claiming live acceptance. Timed subtitles and AI practice prompts remain unbuilt. The preserved milestone record contains historical coming-soon statements, which remain unchanged.

## Current database setup

For a new empty Supabase project, use the current `supabase/schema.sql` once. For an existing project, follow the preserved [Milestones](MILESTONES.md) for foundation, role lock, `003_story_upload.sql` and `004_tags_ownership_publish.sql`, then apply missing migrations in order:

1. [`005_practice_submission.sql`](../supabase/migrations/005_practice_submission.sql)
2. [`006_feedback.sql`](../supabase/migrations/006_feedback.sql)
3. [`007_translations.sql`](../supabase/migrations/007_translations.sql)

Review the migration headers and existing database state first. Do not reapply the full schema to a populated project. This task runs no hosted SQL.

## Verification for this cleanup

- `npm run build`: passed, including TypeScript and production route generation.
- `npm run lint`: passed after excluding generated `brag-output/**` compositions in `eslint.config.mjs`. The initial run failed on bundled third-party GSAP (16 errors, 382 warnings). Application lint coverage is unchanged.
- `node --test tests/*.test.mjs`: all five test files passed.
- Script checked README relative links, heading fragments and all image paths. All resolve. The walkthrough is already tracked and under 100 MB.
- Image checks: nine PNGs, maximum width 1280px, sizes 64,769–319,230 bytes; all visually inspected.
- Public HTTP checks: live app, YouTube demo, repository, brag, Hyperframes and CC BY license returned 200. `https://ende.app/en` returned 403 to the automated client, so its content could not be verified; the credit uses the existing walkthrough attribution.
- `docs/MILESTONES.md` matches the original README byte for byte except for the single Markdown link adjusted from `supabase/...` to `../supabase/...`.
- Protected source paths (`app/`, `components/`, `lib/`, `supabase/`, `proxy.ts`, `tests/`) are unchanged. No push, deployment, database update or external upload was performed.
- The gallery uses real phone captures. No new authenticated live flow, real-device test or end-to-end acceptance is claimed.

## Publish the repository front page

```sh
git push -u origin judges-readme
```

Open `https://github.com/tinothecreator/Deaf-Talks/compare/main...judges-readme`, choose **Create pull request**, review the README preview and Files changed, then merge into `main` when ready. Alternatively merge locally into `main` and push it after review. GitHub shows the new front page when the default branch contains these changes. Connected Vercel automation may deploy when you push or merge; no push or deployment was run here.

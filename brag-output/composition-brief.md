# Hyperframes composition brief — Deaf-Talks

Create a 295-second walkthrough and a 70-second highlights cut from the supplied, cut demo footage. Render highlights FIRST. Tone: **warm, human, quietly proud** (`--tone` is brag creative direction, not a Hyperframes render flag). No voiceover. No Docker, transcription, generated music or other model installations.

LOOK: 1920×1080; 30 fps; #f7f7f2 paper ground; #203430 ink; #155e54 green; #52635e secondary copy; Inter 700 display 76–86 px; Inter 400 body 35–38 px; caption band 30 px; phone footage uses contain at natural speed; 196 px horizontal text margins. BANNED: zooming/cropping signing, mirror, speed ramps, signer overlays, fabricated UI interactions, generic SaaS promises, AI sign recognition/translation/grading.

Sources: README.md, SPEC.md, PLAN.md, AGENTS.md; app/globals.css, app/page.tsx; lib/stories/playback.ts, lib/media/limits.ts; supabase/schema.sql. Current user-defined feature scope overrides aspirational spec text and any extra features visible in recordings. User clarified that the accounts are demo accounts they made.

Use `plan.md` and the two `*-timeline.json` files as the creative contract. Footage: `clips/*.mp4`, copied into `composition/assets/footage/` so all renderer paths are local. Full provenance: `clip-manifest.json`.

The installed Hyperframes registry was searched for phone devices, and `browser-device-stage` was installed for reference. Its default screen stretches media and its notch can occlude footage, so this composition uses a simpler fixed bezel with separate explicitly timed `<video>` and `object-fit: contain`. The reference component remains editable in the project; it is not mounted. All scenes follow Hyperframes sub-composition templates and paused GSAP timeline registration. All source video is muted. Displayed English story captions are copied from the app rather than inferred from signing.

Entry: `composition/index.html` = highlights; `main-composition/index.html` = main (editable independent project). Music: bundled Vol. 12, locally copied, data-volume 0.18 with fades; credit on each end card. Audio-reactive extraction unavailable: numpy missing. Natural readable scene timings take precedence over the optional music beat locks.

Build and render locally using Hyperframes 0.9.34; `check --json` must audit actual DOM text and pass without errors before rendering. Use `--workers 1 --low-memory-mode --fps 30 --quality delivery`. Validate the decoded output separately with ffprobe and sampled frames. Preserve signing geometry exactly. No app-source modifications, commit, push, publishing or deployment.

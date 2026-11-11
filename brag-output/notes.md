# Production notes — Deaf-Talks

## Editorial scope and provenance
The user supplied four recordings and clarified: “those are demo accounts that i made.” All displayed account names are treated as demo personas; no claim is made that they are separate community participants or testers. The signed story shown is credited using the app's exact metadata: **Storyteller: gohan; Credit: Tinothecreator**. List thumbnails show **Tindo / Tindo** and **Kakashi / Kakashi**. The upload account is **Tino**, with **Tino** as the displayed credit. The teacher demo account is **piccalo**.

Before public sharing, verify that the people appearing in the supplied self/demo recordings authorized public hackathon use. Account ownership alone is not an independent release record. No additional people, testimonials or community research were introduced.

`clip-manifest.json` lists exact source in/out times for every cut. `main-timeline.json` and `highlights-timeline.json` map each cut to its final position. Main target is **295 s (4:55)**; highlights **70 s**. Source cuts are re-encoded into `clips/` and copied locally for Hyperframes. All signing runs at natural speed, uncropped, unmirrored and without visual treatments. The screen recordings themselves include camera framing, browser controls and AssistiveTouch; none was removed. The original camera can put a hand near its frame edge; the edit cannot restore pixels outside the supplied recording.

## What inspection confirmed or corrected
- **Introduction.mp4 (130.09 s, 1024×576):** an on-camera presenter gestures throughout; exact spoken content is unverified. There are no visible English captions or presenter name. It contains a substantial non-silent audio track (mean −22.3 dBFS). Excluded because exact spoken content, credit and a reliable transcript were unavailable in this tool session. The problem/idea is instead presented using repo-grounded written copy. No invented spoken captions or signing translations.
- **StorytellerSignup.mp4 (115.30 s, 384×832):** shows signup, role selection, title and caption entry, file selection, upload progress and private-draft confirmation. Does **not** show sign tagging, consent settings or publication. Audio is digital silence (max −91 dBFS). Kept UI clips are silent; bundled music replaces silence.
- **learnerlogin.mp4 (97.06 s, 384×832):** shows sign-in, Learner account, published story browsing, a story playing beside its English caption, key-sign buttons, then practice and existing feedback screens. Audio is silent until ~26.08 s, with non-silent bursts during playback. The selected signing is captioned using only the app's visible English caption. Practice and feedback flows are excluded. The source shows sign tags but does not clearly demonstrate a completed timestamp-seek interaction before switching to practice. The seek behaviour is explained from the implementation and labelled accordingly.
- **teacherbrowse.mp4 (114.80 s, 384×832):** goes beyond browsing: it shows a review queue, recording playback, written feedback, a submitted rating and return Home. The requested demo scope treats feedback as future work, so those actions are excluded. Only the short Teacher account view and final browsing/return-Home sequence are used. A review-list screen appears briefly during navigation, without a review or feedback action being demonstrated. Audio is mostly digital silence, with bursts ~33.18–50.90 s; the retained account/Home sections are silent.
- No original WhatsApp exports or Zone.Identifier files were present in this workspace.

Contact sheets at approximately 5-second intervals were extracted and viewed for all four recordings before editing. Denser sheets were inspected around credentials, sign lists and selected cuts. ffprobe metadata, audio level and silence-detection logs are saved in `audio-checks/`.

**Audio limitation:** waveform/level analysis cannot identify words or distinguish speech from incidental noise reliably. This session did not have a listening/transcription tool for reliable editorial transcription. Non-silent audio was omitted rather than assigned guessed captions. No local transcription, Whisper, Kokoro or MusicGen was installed or run. No narration was generated. Because no original speech is retained, no music ducking is required. The supplied introduction has not been transcribed.

## Caption and credit decisions
There are no invented translations of SASL. The featured story's English caption is copied from the app: “Hello, my name is T I N O T E N D A, I am learning sign language. It’s nice to meet you.” Formatting and punctuation are lightly normalized for readability. The upload caption is quoted as visible in the recording. There are **no [CAPTION NEEDED] placeholders in the final videos**: the uncaptioned introduction is excluded.

Storyteller and credit stay beside every featured story view, outside the phone frame. The caption band also sits beside rather than across the signer. The SRT follows the burned-in caption band at full-scene reading durations, adding the featured app's quoted English caption and displayed credit. It does not rapidly cycle through the simultaneous headline/body copy. It is a text companion for a music-and-text film, not an inferred speech transcript.

Two short account clips and the key-sign list hold their final frames for reading. The main on-screen copy identifies held views for the teacher account and sign list; no action is simulated. No zoom, speed-up or crop is applied to signing. Product feature explanations are labelled **repo-verified explanation**, distinct from recorded interactions. Practice buttons may appear incidentally in the actual app footage; captions explicitly place practice in roadmap scope.

## Privacy and access
- Storyteller source approximately **00:10–00:32** exposes email entry/autofill and masked-password fields. Selected source **00:26–00:34** has its credential region covered at original pixel coordinates x=18, y=32, w=350, h=250. This screen contains no signer. No literal credential values are recorded in this note.
- Learner source approximately **00:00–00:10.5** shows account/email/autofill UI. All those frames are excluded; the learner-account cut uses **00:10.5–00:12.5**, followed by a six-second hold.
- Teacher source approximately **00:00–00:17** shows example sign-in and masked-password UI. Excluded; the account cut uses **00:17.4–00:18.4**, followed by an eleven-second hold.
- No API keys, tokens, storage URLs or Supabase service URLs were found in sampled source frames. Only the intended public app URL is retained. This is visual inspection, not a formal forensic scan of every source frame.
- **Do not publish raw contact sheets/audio diagnostics.** They are private production evidence and include unredacted original login-screen images. Share the final MP4s, public poster and share copy only.
- Withdrawal prevents new access after visibility changes. An already issued playback URL can remain valid until its five-minute expiry. The film says this explicitly. “No download button” is not a promise that playback cannot be copied.

## Implementation and failures
- FFmpeg/ffprobe version preflight only; no doctor rerun.
- Initial `npx hyperframes --help` failed with `EAI_AGAIN registry.npmjs.org`; rerun with network permission succeeded. Local cached Hyperframes 0.9.34 is used directly for deterministic commands.
- Registry lookup initially failed with `EAI_AGAIN raw.githubusercontent.com`; network-authorized retry succeeded. `browser-device-stage` was installed as an editable reference. Its media-stretching/notch behaviour was not suitable for signing, so a simple contain-only frame is authored in the scenes.
- Optional audio-reactive extraction failed: `ModuleNotFoundError: No module named 'numpy'`. The optional visual effect was omitted; no model or scientific dependency installation was attempted.
- Initial check caught `multiple_root_compositions` and `subcomposition_root_styled_by_class`. Fixed by keeping one active root entry and using #root for scene styling. Main entry is stored outside the project root until activated.
- Chrome browser check inside the sandbox failed with `browser setup process exited without a result`; cache/history paths were unwritable there. Browser checks and renders use explicitly authorized execution outside the sandbox. All project outputs stay under brag-output; Hyperframes manages its own ordinary user cache.
- The initial cut list accidentally included learner login frames at 00:08–00:10.5. Contact-sheet inspection caught them before rendering; the cut was moved to 00:10.5.
- A premature attempt to parse an in-progress check report raised `ValueError: substring not found`; waiting for the command to finish resolved it. Completed browser checks passed.
- Main scene review caught short account excerpts ending on loading screens. They were trimmed to account-only frames with explicit still holds, then rechecked.
- WSL rendering uses software GPU. One worker and low-memory mode are enforced. No Docker was used. No running render was interrupted.
- Caption-track density is a lint warning only; the requested single caption host intentionally owns the full caption timeline.

## Music
“Happy Beats / Business Moves Vol. 12” by **Sascha Ende**, https://ende.app/en, **CC BY 4.0**, https://ende.app/en/standard-license. Bundled with brag. Main uses repeated excerpts with fades; highlights uses an excerpt with fades. Attribution is on both end cards. No external music or SFX were added.

## Verification
Final measured media properties and frame inspection results are recorded in `verification/results.json` and `verification/verification.md` after rendering. App source was only read. No build, commit, push, deploy, account action or database change was performed.

Verify before submitting: public use permission for the supplied people; spelling of demo credits; the intentionally conservative shipped-feature scope; the live deployment's current availability; and the final video in a full playback on your submission device.

Final result: main **295.000 seconds**, highlights **70.000 seconds**, both **1920×1080, 30 fps, H.264 + stereo AAC**. Decoded final-frame inspection: **24 main + 12 highlights**. No resolution fallback or render retry. Final measured report: `verification/verification.md`.

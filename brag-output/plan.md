# Deaf-Talks / SignStories — hackathon walkthrough

Tone: warm, human, quietly proud. Preset: polished. Voiceover: off.
Main: 295 seconds (4:55), hard limit 330. Highlights: 70 seconds. Both 1920×1080, 30 fps, local Chrome, one worker.

## Planning rubric
1. The app lets Deaf storytellers upload captioned SASL stories and lets learners explore published stories with timed sign tags, credit and consent controls.
2. Strongest claim: Deaf storytellers should lead; sharing does not mean surrendering credit or control.
3. Hook: “Deaf storytellers should lead.” Project cream, ink and green palette.
4. Show actual phone footage of role choice, English-caption entry, upload progress, draft confirmation, browsing and captioned playback.
5. The requested walkthrough needs approximately five minutes; the requested highlights needs 60–75 seconds. These explicitly override brag's short defaults.
6. Warm, human, quietly proud; readable holds, restrained entrances, no hype metrics.
7. Quiet bundled music bed. No generated voice or local transcription. Avoid SFX that could imply an interaction not actually shown.
8. Share line: Deaf-Talks puts Deaf storytellers, captions, credit and consent at the centre of learning SASL.
9. Flow: storyteller role → private captioned upload → consented publication (explained) → learner browsing and watching → timestamp navigation (explained).

## Visual identity
Background #f7f7f2; ink #203430; primary #155e54; secondary #52635e; line #81908a. Inter, matching app typography. Landscape canvas with complete portrait footage contained in a clean phone bezel. Narrative text and credits sit beside the phone. Nothing overlays a signer's hands, face or upper body. No source crop, mirroring or speed changes.

## Storyboard
The exact authored copy, scene times and selected footage are in `main-timeline.json` and `highlights-timeline.json`. The main arc is problem → idea and roles → storyteller upload → documented tagging/publication → learner account, browsing and watching → documented timestamp seeking → teacher account/browsing → ownership and access → stack, roadmap, URLs.

Each phone recording plays at 1×. Brief account and sign-list views hold their final frames for reading; those holds are identified on screen. Upload, caption entry and playback have 17–19 second holds. Graphic explanations are expressly labelled as repo-verified explanations, not recorded interactions. Every scene carries visible English narrative text and a high-contrast caption band. The main SRT contains the authored text, including displayed story captions and credit.

Teacher footage is restricted to the account view and Home. Practice recording, review submission, feedback and AI features are not presented as shipped. The learner recording contains practice buttons; the caption says practice is roadmap scope. No feedback action is featured.

## Music cue guidance
Bundled “Happy Beats / Business Moves Vol. 12” by Sascha Ende, ende.app, CC BY 4.0. About 109.96 BPM. Preset strong cues include 8.74, 17.47 and 22.93 seconds. Readability and natural-speed footage take precedence; the authored scene timings use natural reading holds rather than forced beat locks. Low-volume bed (0.18), with edge fades, looped at 116 seconds in the main. No original speech is retained, so ducking is unnecessary.

The optional audio-reactive helper failed with `ModuleNotFoundError: No module named 'numpy'`. No dependency installation or substitute audio model is needed; the optional effect is omitted.

## Production order
1. Probe, extract and view contact sheets at approximately five-second intervals.
2. Prepare and re-encode clips in `clips/`, hiding only credentials on the non-signer sign-up screen.
3. Check and preview the 70-second highlights composition, then render it first.
4. Check and render the main with one worker and low-memory mode.
5. If capture crashes or is killed, use 60–90-second chunks and concat; if chunked 1080p fails, use 720p and report the change.
6. Probe duration, dimensions, codecs and audio; inspect at least ten decoded final frames. Pick a settled poster and replace only frame zero.

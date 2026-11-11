# Final verification

Both final MP4s were probed **after** their selected poster was baked into frame zero. Complete ffprobe data and source timestamps are in `results.json` and the adjacent `*-ffprobe.json` files.

| Check | Main | Highlights |
| --- | --- | --- |
| Final duration | 295.000 s / 4:55 | 70.000 s / 1:10 |
| Duration constraint | Pass: ≤330 s | Pass: 60–75 s |
| Dimensions | 1920×1080 | 1920×1080 |
| Frame rate | 30/1 | 30/1 |
| Video | H.264, 8,850 frames | H.264, 2,100 frames |
| Audio | AAC, stereo, non-silent | AAC, stereo, non-silent |
| Music peak | −16.4 dBFS | −16.4 dBFS |
| Final size | 17,430,208 bytes | 5,053,754 bytes |
| Decoded frames inspected | 24 timestamps | 12 timestamps |

Visual inspection covered the opening, every main scene, signup redaction, both held account views, caption entry/upload, browsing, signed-story playback, sign list, trust cards, roadmap and end cards. Contact sheets and full-resolution decoded frames are saved in the named video subdirectories. Additional full-resolution review was performed at main 113 s and 185 s. Captions and credits are not clipped; portrait footage retains its source aspect ratio in a contained phone frame; no edit crop, speed change, mirror or overlay was applied to the signer. Original source framing and app controls remain visible.

No exposed email, literal password, token or key was observed in the selected final samples. Signup credentials are concealed; login-entry frames were excluded. This is sampled visual verification, not a claim of forensic OCR over every frame.

Hyperframes full checks: highlights 37/37 contrast checks, main 35/35; final targeted account/credit check 23/23. All passed with zero errors. The one lint warning is intentional caption-track density. Main and highlights caption files have contiguous, full-scene timing through 295 s and 70 s respectively, with 23 and 6 cues.

Highlights rendered first in 4m43.4s. Main rendered next in 18m17.0s. Both used local Chrome/software GPU with **one worker and low-memory mode**. No Docker, render interruption, render crash, retry, chunking or 720p fallback was needed. Poster source moments: main 185 s, highlights 40 s; only frame zero was replaced, and frame counts/durations were preserved.

The film is music and visible text, without generated voiceover. Non-silent original source audio was omitted because its words were not reliably verified; the uncaptained introduction was excluded. See `../notes.md` for the editorial limitations and the distinction between recorded actions and repo-verified explanations.

App source was not changed. No commit, push or deployment was performed.

// 50 MiB, matching the existing bucket limit. UI calls this 50 MB (52,428,800 bytes).
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
export const STORY_BUCKET = "stories";
export const PLAYBACK_URL_SECONDS = 300;
export const VIDEO_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
} as const;
export type VideoType = keyof typeof VIDEO_EXTENSIONS;

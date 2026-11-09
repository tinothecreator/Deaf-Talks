import { MAX_VIDEO_BYTES, VIDEO_EXTENSIONS } from "./limits";
import { durationSchema } from "./validation";

export async function readVideoDuration(file: File): Promise<number> {
  if (!(file.type in VIDEO_EXTENSIONS)) throw new Error("Choose an MP4, MOV or WebM video.");
  if (!file.size) throw new Error("Choose a video that is not empty.");
  if (file.size > MAX_VIDEO_BYTES) throw new Error("The video must be 50 MB or smaller. Trim it or export at a lower resolution.");
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const timer = window.setTimeout(() => finish(), 15000);
    function finish(duration?: number) {
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      const result = durationSchema.safeParse(duration);
      if (result.success) resolve(result.data);
      else reject(new Error(duration === undefined || !Number.isFinite(duration)
        ? "We could not read this video. Try exporting it as MP4, then choose it again."
        : result.error.issues[0].message));
    }
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish();
    video.src = url;
  });
}

export function uploadVideo(url: string, file: File, progress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.timeout = 10 * 60 * 1000;
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100));
    };
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve() : reject(new Error("Upload failed. Check the file type, size and your connection, then try again."));
    request.onerror = request.ontimeout = () => reject(new Error("Upload stopped. Check your connection and try again."));
    // Match Supabase uploadToSignedUrl's multipart body; no auth token or key is needed.
    const body = new FormData();
    body.append("cacheControl", "0");
    body.append("", file);
    request.send(body);
  });
}

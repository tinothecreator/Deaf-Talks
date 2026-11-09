import { z } from "zod";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from "./limits";

export const durationSchema = z.number().finite().positive("The video must be longer than 0 seconds.")
  .max(MAX_VIDEO_SECONDS, "Keep your video to 60 seconds or less.");
export const uploadSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(160, "Keep the title under 160 characters."),
  caption: z.string().trim().min(1, "Enter an English caption.").max(10000, "Keep the caption under 10,000 characters."),
  type: z.enum(["video/mp4", "video/webm", "video/quicktime"], { error: "Choose an MP4, MOV or WebM video." }),
  size: z.number().int().positive("Choose a video that is not empty.").max(MAX_VIDEO_BYTES, "The video must be 50 MB or smaller."),
  duration: durationSchema,
});
export const finishSchema = z.object({ storyId: z.uuid(), duration: durationSchema });

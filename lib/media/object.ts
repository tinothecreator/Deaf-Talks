import { MAX_VIDEO_BYTES, VIDEO_EXTENSIONS } from "./limits";

// Storage info() uses top-level fields; list() uses nested metadata.
export function checkVideoObject(object: { size?: number; contentType?: string }, expected?: { size: number; type: string }) {
  const { size, contentType: type } = object;
  if (size == null) return "CONFIRM_SIZE_MISSING";
  if (!Number.isSafeInteger(size) || size <= 0) return "CONFIRM_SIZE_INVALID";
  if (size > MAX_VIDEO_BYTES) return "CONFIRM_SIZE_LIMIT_EXCEEDED";
  if (expected && size !== expected.size) return "CONFIRM_SIZE_MISMATCH";
  if (!type) return "CONFIRM_TYPE_MISSING";
  if (!Object.hasOwn(VIDEO_EXTENSIONS, type) || (expected && type !== expected.type)) return "CONFIRM_TYPE_MISMATCH";
  return null;
}

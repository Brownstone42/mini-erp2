import { createHash, timingSafeEqual } from "node:crypto";

type Settings = Record<string, string | undefined>;
export type AccessResult = "allowed" | "unauthorized" | "unconfigured";

// Runtime-only configuration: never expose credentials through NEXT_PUBLIC_*.
export function checkStagingAccess(authorization: string | null, settings: Settings = process.env): AccessResult {
  const onRender = settings.RENDER === "true";
  if (!onRender && settings.STAGING_AUTH_MODE === "off") return "allowed";
  const required = onRender || settings.NODE_ENV === "production" || settings.STAGING_AUTH_MODE === "on"
    || Boolean(settings.STAGING_AUTH_USER || settings.STAGING_AUTH_PASSWORD);
  if (!required) return "allowed";

  const user = settings.STAGING_AUTH_USER;
  const password = settings.STAGING_AUTH_PASSWORD;
  if (!user || user.includes(":") || !password || password.length < 20) return "unconfigured";
  const match = authorization?.match(/^Basic ([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return "unauthorized";
  const received = Buffer.from(match[1], "base64");
  const expected = Buffer.from(`${user}:${password}`, "utf8");
  // Hash both values to equal-length buffers before constant-time comparison.
  const hash = (value: Buffer) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(received), hash(expected)) ? "allowed" : "unauthorized";
}

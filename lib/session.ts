export const SESSION_COOKIE = "study-table-access";
const encoder = new TextEncoder();
function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  );
}
export function developmentBypass() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_ACCESS_BYPASS === "true"
  );
}
export async function createSession(secret: string, now = Date.now()) {
  const expiry = String(now + 7 * 86400000);
  return `${expiry}.${await sign(expiry, secret)}`;
}
export async function validSession(
  value: string | undefined,
  secret: string | undefined,
  now = Date.now(),
) {
  if (!value || !secret || secret.length < 32) return false;
  const [expiry, signature, ...extra] = value.split(".");
  if (
    extra.length ||
    !/^\d+$/.test(expiry) ||
    Number(expiry) <= now ||
    Number(expiry) > now + 7 * 86400000
  )
    return false;
  const expected = await sign(expiry, secret);
  if (signature?.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++)
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}
export function safeReturn(value: unknown) {
  return typeof value === "string" &&
    /^\/(?!\/)/.test(value) &&
    !/[\\\r\n]/.test(value) &&
    !value.startsWith("/access")
    ? value
    : "/";
}

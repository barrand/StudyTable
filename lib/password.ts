import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !/^[a-f0-9]{64}$/.test(hash ?? ""))
    return false;
  const derived = (await scrypt(password, salt, 32)) as Buffer;
  return timingSafeEqual(derived, Buffer.from(hash, "hex"));
}

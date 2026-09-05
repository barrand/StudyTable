import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, validSession, developmentBypass } from "./session";
export async function authorized() {
  return (
    developmentBypass() ||
    (await validSession(
      (await cookies()).get(SESSION_COOKIE)?.value,
      process.env.SESSION_SECRET,
    ))
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  return !!origin && origin === expected;
}

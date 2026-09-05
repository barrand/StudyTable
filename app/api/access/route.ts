import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import { sameOrigin } from "@/lib/server-auth";
import { verifyPassword } from "@/lib/password";
import { reserveQuota, LimitError } from "@/lib/quota";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Request origin not allowed." },
      { status: 403 },
    );
  const hash = process.env.ACCESS_PASSWORD_HASH,
    secret = process.env.SESSION_SECRET;
  if (!hash || !secret || secret.length < 32)
    return NextResponse.json(
      { error: "Private access is not configured yet." },
      { status: 503 },
    );
  try {
    const text = await request.text();
    if (text.length > 2000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const { password } = JSON.parse(text);
    if (typeof password !== "string" || password.length > 256)
      return NextResponse.json(
        { error: "Enter the shared password." },
        { status: 400 },
      );
    await reserveQuota(request, "access");
    if (!(await verifyPassword(password, hash)))
      return NextResponse.json(
        { error: "That password was not accepted." },
        { status: 401 },
      );
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, await createSession(secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 86400,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof LimitError
            ? "Too many attempts. Please return tomorrow."
            : "Access is temporarily unavailable.",
      },
      { status: error instanceof LimitError ? 429 : 503 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Request origin not allowed." },
      { status: 403 },
    );
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

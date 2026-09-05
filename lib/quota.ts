import "server-only";
import { createHmac } from "node:crypto";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { quotaDecision, limitValue } from "./quota-policy";
export { LimitError } from "./quota-policy";
const memory = new Map<string, number>();
export async function reserveQuota(
  request: Request,
  kind: "study" | "access" = "study",
) {
  const secret = process.env.RATE_LIMIT_SECRET;
  const localMode =
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_QUOTA_MEMORY === "true";
  if (!secret && !localMode) throw new Error("Quota service is not configured");
  const now = new Date(),
    day = now.toISOString().slice(0, 10);
  // Google adds the client and load-balancer addresses at the right of X-Forwarded-For.
  // Only enable this trust mode behind the Firebase/Google managed proxy.
  const forwarded =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const ip =
    process.env.TRUST_GOOGLE_PROXY === "true" && forwarded.length >= 2
      ? forwarded.at(-2)!
      : "shared";
  const bucket = createHmac("sha256", secret ?? "local-only")
    .update(`${kind}:${ip}:${day}`)
    .digest("hex");
  const globalKey = createHmac("sha256", secret ?? "local-only")
    .update(`${kind}:global:${day}`)
    .digest("hex");
  const localLimit =
      kind === "study" ? limitValue(process.env.AI_DAILY_LIMIT, 10) : 20,
    globalLimit =
      kind === "study"
        ? limitValue(process.env.AI_GLOBAL_DAILY_LIMIT, 50)
        : 200;
  if (localMode) {
    const next = quotaDecision(
      memory.get(bucket) ?? 0,
      memory.get(globalKey) ?? 0,
      localLimit,
      globalLimit,
    );
    memory.set(bucket, next.local);
    memory.set(globalKey, next.global);
    return next.remaining;
  }
  if (!getApps().length)
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
  const db = getFirestore(),
    localRef = db.collection("quota").doc(bucket),
    globalRef = db.collection("quota").doc(globalKey);
  return db.runTransaction(async (transaction) => {
    const [local, global] = await Promise.all([
      transaction.get(localRef),
      transaction.get(globalRef),
    ]);
    const next = quotaDecision(
      local.data()?.count ?? 0,
      global.data()?.count ?? 0,
      localLimit,
      globalLimit,
    );
    const expireAt = Timestamp.fromMillis(
      Date.parse(`${day}T00:00:00Z`) + 2 * 86400000,
    );
    transaction.set(localRef, { count: next.local, expireAt });
    transaction.set(globalRef, { count: next.global, expireAt });
    return next.remaining;
  });
}

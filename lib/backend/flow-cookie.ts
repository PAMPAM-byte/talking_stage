import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

function secret() {
  const value = process.env.AUTH_FLOW_SECRET;
  if (!value || value.length < 32) throw new Error("Authentication flow secret is not configured");
  return value;
}
export async function setFlowCookie(purpose: "adult" | "recovery", subject: string) {
  const payload = Buffer.from(JSON.stringify({ subject, expires: Date.now() + 30 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(`${purpose}:${payload}`).digest("base64url");
  (await cookies()).set(`ts-${purpose}`, `${payload}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 1800 });
}
export async function validFlowCookie(purpose: "adult" | "recovery", subject: string) {
  try {
    const raw = (await cookies()).get(`ts-${purpose}`)?.value ?? "";
    const [payload, signature] = raw.split(".");
    const expected = createHmac("sha256", secret()).update(`${purpose}:${payload}`).digest();
    const received = Buffer.from(signature ?? "", "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.subject === subject && typeof data.expires === "number" && data.expires > Date.now();
  } catch { return false; }
}

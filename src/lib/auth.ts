import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const COOKIE = "selection_house_staff";
const EIGHT_HOURS = 60 * 60 * 8;

function secret() {
  if (process.env.NODE_ENV === "production" && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) throw new Error("SESSION_SECRET must be configured with at least 32 characters in production.");
  return process.env.SESSION_SECRET || "local-only-selection-house-session-secret-change-before-deploying";
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function staffCookie(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + EIGHT_HOURS * 1000 })).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${payload}.${signature(payload)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${EIGHT_HOURS}${secure}`;
}

export function clearStaffCookie() {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function isStaffRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return false;
  const [payload, received] = token.split(".");
  if (!payload || !received) return false;
  const expected = signature(payload);
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email: string; exp: number };
    return Boolean(session.email) && session.exp > Date.now();
  } catch {
    return false;
  }
}

export function verifyAdminCredentials(email: string, password: string) {
  if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) return false;
  const configuredEmail = process.env.ADMIN_EMAIL || "admin@selectionhouse.local";
  const configuredPassword = process.env.ADMIN_PASSWORD || "demo-selection-house-change-me";
  const emailMatch = email.trim().toLowerCase() === configuredEmail.trim().toLowerCase();
  const a = Buffer.from(password);
  const b = Buffer.from(configuredPassword);
  const passwordMatch = a.length === b.length && timingSafeEqual(a, b);
  return emailMatch && passwordMatch;
}

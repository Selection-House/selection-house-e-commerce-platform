import { NextResponse } from "next/server";
import { z } from "zod";
import { staffCookie, verifyAdminCredentials } from "@/lib/auth";

const schema = z.object({ email: z.string().trim().min(3), password: z.string().min(1).max(200) });
const failures = new Map<string, number[]>();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (failures.get(ip) || []).filter((time) => now - time < 15 * 60_000);
  if (recent.length >= 8) return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429 });
  if (!parsed.success || !verifyAdminCredentials(parsed.data.email, parsed.data.password)) {
    failures.set(ip, [...recent, now]);
    return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  }
  failures.delete(ip);
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": staffCookie(parsed.data.email) } });
}

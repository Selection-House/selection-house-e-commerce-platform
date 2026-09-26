import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashOtp, otpProvider } from "@/lib/otp";

const schema = z.object({ phone: z.string().trim().min(8).max(20) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (process.env.NODE_ENV === "production" && !process.env.OTP_WEBHOOK_URL) return NextResponse.json({ error: "OTP sending is not configured yet." }, { status: 503 });
  const recent = await db.otpChallenge.count({ where: { phone: parsed.data.phone, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } }).catch(() => 0);
  if (recent >= 5) return NextResponse.json({ error: "Too many codes requested. Try again in 15 minutes." }, { status: 429 });
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const challenge = await db.otpChallenge.create({ data: { phone: parsed.data.phone, codeHash: hashOtp(parsed.data.phone, code), expiresAt: new Date(Date.now() + 5 * 60_000) } }).catch(() => null);
  if (!challenge) return NextResponse.json({ error: "OTP service is unavailable. Check the database." }, { status: 503 });
  try {
    await otpProvider().send(parsed.data.phone, code);
    return NextResponse.json({ ok: true, expiresInSeconds: 300 });
  } catch {
    await db.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
    return NextResponse.json({ error: "The configured OTP service could not send a code." }, { status: 503 });
  }
}

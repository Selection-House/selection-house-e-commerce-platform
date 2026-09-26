import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashOtp } from "@/lib/otp";

const schema = z.object({ phone: z.string().trim().min(8).max(20), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the phone number and six-digit code." }, { status: 400 });
  const challenge = await db.otpChallenge.findFirst({ where: { phone: parsed.data.phone, consumed: false }, orderBy: { createdAt: "desc" } }).catch(() => null);
  if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= 5) return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  const submitted = Buffer.from(hashOtp(parsed.data.phone, parsed.data.code));
  const stored = Buffer.from(challenge.codeHash);
  const matches = submitted.length === stored.length && timingSafeEqual(submitted, stored);
  if (!matches) {
    const attempts = challenge.attempts + 1;
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts, ...(attempts >= 5 ? { consumed: true } : {}) } });
    return NextResponse.json({ error: attempts >= 5 ? "Too many incorrect tries. Request a new code." : "That code is not correct." }, { status: 400 });
  }
  await db.otpChallenge.update({ where: { id: challenge.id }, data: { consumed: true } });
  return NextResponse.json({ verified: true });
}

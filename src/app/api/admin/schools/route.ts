import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const schools = await db.school.findMany({ include: { _count: { select: { quotations: true, orders: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(schools);
}

const schema = z.object({ name: z.string().trim().min(2).max(180), contactPerson: z.string().trim().min(2).max(120), phone: z.string().trim().min(8).max(20), address: z.string().trim().max(500).default("") });

export async function POST(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the school details." }, { status: 400 });
  const school = await db.school.create({ data: parsed.data });
  return NextResponse.json(school, { status: 201 });
}

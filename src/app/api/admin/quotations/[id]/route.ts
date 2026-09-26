import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ status: z.enum(["DRAFT", "SENT"]) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid quotation status." }, { status: 400 });
  const existing = await db.quotation.findUnique({ where: { id } });
  if (!existing || existing.status === "CONVERTED") return NextResponse.json({ error: "Quotation not found or already converted." }, { status: 404 });
  const quote = await db.quotation.update({ where: { id }, data: { status: parsed.data.status, sentAt: parsed.data.status === "SENT" ? new Date() : null } });
  return NextResponse.json(quote);
}

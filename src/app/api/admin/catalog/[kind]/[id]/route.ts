import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeSlug } from "@/lib/money";

const schema = z.object({ name: z.string().trim().min(2).max(100) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ kind: string; id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { kind, id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !["brand", "category"].includes(kind)) return NextResponse.json({ error: "Invalid catalog update." }, { status: 400 });
  try {
    const item = kind === "brand" ? await db.brand.update({ where: { id }, data: { name: parsed.data.name } }) : await db.category.update({ where: { id }, data: { name: parsed.data.name, slug: safeSlug(parsed.data.name) } });
    return NextResponse.json(item);
  } catch { return NextResponse.json({ error: "The name is already used, or this catalog item was not found." }, { status: 409 }); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ kind: string; id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { kind, id } = await context.params;
  if (!new Set(["brand", "category"]).has(kind)) return NextResponse.json({ error: "Invalid catalog item." }, { status: 400 });
  try {
    if (kind === "brand") await db.brand.delete({ where: { id } }); else await db.category.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch { return NextResponse.json({ error: "Catalog item was not found." }, { status: 404 }); }
}

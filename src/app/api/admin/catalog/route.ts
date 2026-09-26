import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeSlug } from "@/lib/money";

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const [brands, categories] = await Promise.all([
    db.brand.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } }),
    db.category.findMany({ include: { _count: { select: { products: true, children: true } }, parent: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ brands, categories });
}

const schema = z.object({ kind: z.enum(["brand", "category"]), name: z.string().trim().min(2).max(100), parentId: z.string().optional() });

export async function POST(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name and catalog type." }, { status: 400 });
  try {
    const value = parsed.data.kind === "brand"
      ? await db.brand.create({ data: { name: parsed.data.name } })
      : await db.category.create({ data: { name: parsed.data.name, slug: safeSlug(parsed.data.name), parentId: parsed.data.parentId || null } });
    return NextResponse.json(value, { status: 201 });
  } catch { return NextResponse.json({ error: "That name already exists, or its parent category was not found." }, { status: 409 }); }
}

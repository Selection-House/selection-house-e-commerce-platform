import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

function quoteNumber() { return `Q-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; }

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const quotations = await db.quotation.findMany({ include: { school: true, items: true, order: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(quotations);
}

const schema = z.object({
  schoolId: z.string().optional(),
  school: z.object({ name: z.string().trim().min(2).max(180), contactPerson: z.string().trim().min(2).max(120), phone: z.string().trim().min(8).max(20), address: z.string().trim().max(500).default("") }).optional(),
  items: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(100_000), quotedPrice: z.number().min(0).max(10_000_000).optional() })).min(1).max(100),
});

export async function POST(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.schoolId && !parsed.data.school)) return NextResponse.json({ error: parsed.success ? "Choose or add a school." : parsed.error.issues[0]?.message }, { status: 400 });
  try {
    let schoolId = parsed.data.schoolId;
    if (parsed.data.school) {
      const existing = await db.school.findFirst({ where: { name: { equals: parsed.data.school.name, mode: "insensitive" }, phone: parsed.data.school.phone } });
      const school = existing ?? await db.school.create({ data: parsed.data.school });
      schoolId = school.id;
    }
    const variants = await db.productVariant.findMany({ where: { id: { in: parsed.data.items.map((item) => item.variantId) }, active: true, product: { active: true } }, include: { product: true } });
    if (variants.length !== new Set(parsed.data.items.map((item) => item.variantId)).size) return NextResponse.json({ error: "One or more selected varieties are no longer active." }, { status: 409 });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const quotation = await db.quotation.create({
      data: {
        quoteNumber: quoteNumber(),
        schoolId: schoolId!,
        items: { create: parsed.data.items.map((item) => {
          const variant = byId.get(item.variantId)!;
          return { variantId: variant.id, productName: variant.product.name, variantLabel: [variant.size, variant.color].filter(Boolean).join(" / ") || "Standard", sku: variant.sku, quantity: item.quantity, quotedPrice: item.quotedPrice ?? variant.price, gstRate: variant.gstRate };
        }) },
      },
      include: { school: true, items: true },
    });
    return NextResponse.json(quotation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Quotation could not be saved." }, { status: 400 });
  }
}

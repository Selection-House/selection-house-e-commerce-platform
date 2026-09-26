import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const activeSchema = z.object({ active: z.boolean() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { id } = await context.params;
  const parsed = activeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product status." }, { status: 400 });
  const product = await db.product.update({ where: { id }, data: { active: parsed.data.active } }).catch(() => null);
  return product ? NextResponse.json(product) : NextResponse.json({ error: "Product not found." }, { status: 404 });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { id } = await context.params;
  const product = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const variantIds = product.variants.map((variant) => variant.id);
  const [orders, quotes, adjustments] = await Promise.all([
    db.orderItem.count({ where: { variantId: { in: variantIds } } }),
    db.quotationItem.count({ where: { variantId: { in: variantIds } } }),
    db.inventoryAdjustment.count({ where: { variantId: { in: variantIds } } }),
  ]);
  if (orders || quotes || adjustments) {
    await db.product.update({ where: { id }, data: { active: false, variants: { updateMany: { where: {}, data: { active: false } } } } });
    return NextResponse.json({ deleted: false, message: "This product has transaction or stock history, so it was deactivated and kept for records." });
  }
  await db.product.delete({ where: { id } });
  return NextResponse.json({ deleted: true, message: "Product deleted." });
}

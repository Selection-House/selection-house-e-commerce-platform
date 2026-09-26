import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const inventory = await db.inventory.findMany({ include: { location: true, variant: { include: { product: true } } }, orderBy: [{ location: { name: "asc" } }, { variant: { product: { name: "asc" } } }] });
  return NextResponse.json(inventory);
}

const schema = z.object({
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  location: z.string().trim().min(1),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(2),
  reason: z.string().trim().min(2).max(240),
}).refine((value) => Boolean(value.sku || value.barcode), "Enter a SKU or barcode.");

export async function PATCH(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the stock update." }, { status: 400 });
  const variant = await db.productVariant.findFirst({ where: { OR: [parsed.data.sku ? { sku: parsed.data.sku } : undefined, parsed.data.barcode ? { barcode: parsed.data.barcode } : undefined].filter(Boolean) as Array<{ sku: string } | { barcode: string }> } });
  const location = await db.location.findUnique({ where: { name: parsed.data.location } });
  if (!variant || !location) return NextResponse.json({ error: "SKU/barcode or location was not found." }, { status: 404 });
  const saved = await db.$transaction(async (tx) => {
    const existing = await tx.inventory.findUnique({ where: { variantId_locationId: { variantId: variant.id, locationId: location.id } } });
    const delta = parsed.data.quantity - (existing?.quantity ?? 0);
    const inventory = await tx.inventory.upsert({
      where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
      update: { quantity: parsed.data.quantity, lowStockThreshold: parsed.data.lowStockThreshold },
      create: { variantId: variant.id, locationId: location.id, quantity: parsed.data.quantity, lowStockThreshold: parsed.data.lowStockThreshold },
    });
    if (delta) await tx.inventoryAdjustment.create({ data: { variantId: variant.id, locationId: location.id, delta, reason: parsed.data.reason } });
    return inventory;
  });
  return NextResponse.json(saved);
}

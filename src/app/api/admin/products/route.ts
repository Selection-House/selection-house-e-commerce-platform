import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultLocations } from "@/lib/inventory";
import { safeSlug } from "@/lib/money";

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1).max(80),
  barcode: z.string().trim().max(100).nullable().optional(),
  size: z.string().trim().max(60).nullable().optional(),
  color: z.string().trim().max(60).nullable().optional(),
  price: z.number().min(0).max(10_000_000),
  gstRate: z.number().min(0).max(100),
  stockShop: z.number().int().min(0),
  stockGodown: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(2),
  active: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().max(5000).default(""),
  brandName: z.string().trim().max(100).default(""),
  categoryName: z.string().trim().max(100).default(""),
  images: z.array(z.string().url().max(1000)).max(8).default([]),
  featured: z.boolean().default(false),
  variants: z.array(variantSchema).min(1).max(80),
});

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const products = await db.product.findMany({
    include: { brand: true, category: true, variants: { include: { inventories: { include: { location: true } } } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  }).catch(() => null);
  if (!products) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  return NextResponse.json(products);
}

async function uniqueSlug(name: string, currentId?: string) {
  const base = safeSlug(name) || "product";
  let slug = base;
  let index = 2;
  while (await db.product.findFirst({ where: { slug, ...(currentId ? { id: { not: currentId } } : {}) }, select: { id: true } })) slug = `${base}-${index++}`;
  return slug;
}

async function lookupIds(brandName: string, categoryName: string) {
  const [brand, category] = await Promise.all([
    brandName ? db.brand.upsert({ where: { name: brandName }, update: {}, create: { name: brandName } }) : null,
    categoryName ? db.category.upsert({ where: { slug: safeSlug(categoryName) }, update: { name: categoryName }, create: { name: categoryName, slug: safeSlug(categoryName) } }) : null,
  ]);
  return { brandId: brand?.id ?? null, categoryId: category?.id ?? null };
}

export async function POST(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the product details." }, { status: 400 });
  try {
    await ensureDefaultLocations();
    const { brandId, categoryId } = await lookupIds(parsed.data.brandName, parsed.data.categoryName);
    const product = await db.product.create({
      data: {
        name: parsed.data.name,
        slug: await uniqueSlug(parsed.data.name),
        description: parsed.data.description,
        images: parsed.data.images,
        featured: parsed.data.featured,
        brandId,
        categoryId,
        variants: {
          create: parsed.data.variants.map((variant) => ({
            sku: variant.sku,
            barcode: variant.barcode || null,
            size: variant.size || null,
            color: variant.color || null,
            price: variant.price,
            gstRate: variant.gstRate,
            active: variant.active,
            inventories: { create: [
              { location: { connect: { name: "Shop" } }, quantity: variant.stockShop, lowStockThreshold: variant.lowStockThreshold },
              { location: { connect: { name: "Godown" } }, quantity: variant.stockGodown, lowStockThreshold: variant.lowStockThreshold },
            ] },
          })),
        },
      },
      include: { variants: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "That SKU, barcode, or category already exists." : "The product could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const body = await request.json().catch(() => null) as ({ id?: string } & Record<string, unknown>) | null;
  if (!body?.id) return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the product details." }, { status: 400 });
  try {
    await ensureDefaultLocations();
    const current = await db.product.findUnique({ where: { id: body.id }, include: { variants: { include: { inventories: { include: { location: true } } } } } });
    if (!current) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const { brandId, categoryId } = await lookupIds(parsed.data.brandName, parsed.data.categoryName);
    const slug = await uniqueSlug(parsed.data.name, current.id);
    const saved = await db.$transaction(async (tx) => {
      const requestedIds = new Set(parsed.data.variants.map((variant) => variant.id).filter(Boolean));
      for (const existing of current.variants) {
        if (requestedIds.has(existing.id)) continue;
        const [orders, quotations, adjustments] = await Promise.all([
          tx.orderItem.count({ where: { variantId: existing.id } }),
          tx.quotationItem.count({ where: { variantId: existing.id } }),
          tx.inventoryAdjustment.count({ where: { variantId: existing.id } }),
        ]);
        if (orders || quotations || adjustments) await tx.productVariant.update({ where: { id: existing.id }, data: { active: false } });
        else await tx.productVariant.delete({ where: { id: existing.id } });
      }
      await tx.product.update({ where: { id: current.id }, data: { name: parsed.data.name, slug, description: parsed.data.description, images: parsed.data.images, featured: parsed.data.featured, brandId, categoryId } });
      for (const variant of parsed.data.variants) {
        let variantId = variant.id;
        if (variantId && !current.variants.some((item) => item.id === variantId)) throw new Error("Variant does not belong to this product.");
        if (variantId) {
          await tx.productVariant.update({ where: { id: variantId }, data: { sku: variant.sku, barcode: variant.barcode || null, size: variant.size || null, color: variant.color || null, price: variant.price, gstRate: variant.gstRate, active: variant.active } });
        } else {
          const created = await tx.productVariant.create({ data: { productId: current.id, sku: variant.sku, barcode: variant.barcode || null, size: variant.size || null, color: variant.color || null, price: variant.price, gstRate: variant.gstRate, active: variant.active } });
          variantId = created.id;
        }
        for (const [locationName, desired] of [["Shop", variant.stockShop], ["Godown", variant.stockGodown]] as const) {
          const location = await tx.location.findUniqueOrThrow({ where: { name: locationName } });
          const before = await tx.inventory.findUnique({ where: { variantId_locationId: { variantId, locationId: location.id } } });
          const delta = desired - (before?.quantity ?? 0);
          await tx.inventory.upsert({
            where: { variantId_locationId: { variantId, locationId: location.id } },
            update: { quantity: desired, lowStockThreshold: variant.lowStockThreshold },
            create: { variantId, locationId: location.id, quantity: desired, lowStockThreshold: variant.lowStockThreshold },
          });
          if (delta) await tx.inventoryAdjustment.create({ data: { variantId, locationId: location.id, delta, reason: "Admin stock count adjustment" } });
        }
      }
      return tx.product.findUniqueOrThrow({ where: { id: current.id }, include: { brand: true, category: true, variants: { include: { inventories: { include: { location: true } } } } } });
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "That SKU or barcode is already used by another variety." : error instanceof Error && error.message.includes("belong to") ? error.message : "The product could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

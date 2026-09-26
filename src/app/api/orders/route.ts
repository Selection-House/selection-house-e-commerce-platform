import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { allocateStock } from "@/lib/inventory";
import { fromPaise, lineTotalPaise, priceWithTax } from "@/lib/money";

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().max(160).optional(),
  paymentMethod: z.enum(["BOB_TRANSFER", "PAY_AT_PICKUP"]),
  deliveryType: z.enum(["PICKUP", "MANUAL_DELIVERY"]),
  address: z.string().trim().max(500).optional(),
  items: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
}).refine((value) => value.deliveryType !== "MANUAL_DELIVERY" || Boolean(value.address?.trim()), { path: ["address"], message: "Add a delivery address." });

function orderNumber() {
  return `SH-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the order details." }, { status: 400 });
  try {
    const order = await db.$transaction(async (tx) => {
      const cart = await Promise.all(parsed.data.items.map(async (line) => {
        const variant = await tx.productVariant.findFirst({ where: { id: line.variantId, active: true, product: { active: true } }, include: { product: true } });
        if (!variant) throw new Error("PRODUCT_UNAVAILABLE");
        return { line, variant };
      }));
      const snapshots = [];
      for (const { line, variant } of cart) {
        const allocation = await allocateStock(tx, variant.id, line.quantity);
        const price = Number(variant.price);
        const gstRate = Number(variant.gstRate);
        const tax = priceWithTax(price, gstRate).tax;
        snapshots.push({
          variantId: variant.id,
          productName: variant.product.name,
          variantLabel: [variant.size, variant.color].filter(Boolean).join(" / ") || "Standard",
          sku: variant.sku,
          quantity: line.quantity,
          unitPrice: price,
          gstRate,
          lineTotal: fromPaise(lineTotalPaise(price, line.quantity)),
          ...allocation,
          taxLine: fromPaise(priceWithTax(price, gstRate).taxPaise * line.quantity),
        });
      }
      const taxPaise = snapshots.reduce((sum, line) => sum + Math.round(line.taxLine * 100), 0);
      const totalPaise = snapshots.reduce((sum, line) => sum + Math.round(line.lineTotal * 100), 0);
      const subtotal = fromPaise(totalPaise - taxPaise);
      const taxTotal = fromPaise(taxPaise);
      const totalAmount = fromPaise(totalPaise);
      return tx.order.create({
        data: {
          orderNumber: orderNumber(),
          customerName: parsed.data.customerName,
          phone: parsed.data.phone,
          email: parsed.data.email || null,
          paymentMethod: parsed.data.paymentMethod,
          deliveryType: parsed.data.deliveryType,
          address: parsed.data.address || null,
          subtotal,
          taxTotal,
          totalAmount,
          items: { create: snapshots.map((line) => ({
            variantId: line.variantId,
            productName: line.productName,
            variantLabel: line.variantLabel,
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            gstRate: line.gstRate,
            lineTotal: line.lineTotal,
            shopQuantity: line.shopQuantity,
            godownQuantity: line.godownQuantity,
          })) },
        },
        include: { items: true },
      });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ orderNumber: order.orderNumber, totalAmount: order.totalAmount, status: order.status }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order could not be placed.";
    const status = message === "INSUFFICIENT_STOCK" ? 409 : message === "PRODUCT_UNAVAILABLE" ? 409 : 503;
    const errorMessage = message === "INSUFFICIENT_STOCK" ? "One or more items no longer have enough stock. Review your cart." : message === "PRODUCT_UNAVAILABLE" ? "A product in your cart is no longer available." : "Order could not be saved. Check that PostgreSQL is running and the database is up to date.";
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

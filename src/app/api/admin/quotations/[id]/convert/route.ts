import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocateStock } from "@/lib/inventory";
import { fromPaise, lineTotalPaise, priceWithTax } from "@/lib/money";

const schema = z.object({ paymentDueDays: z.number().int().min(10).max(15).default(15) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Payment due date must be 10–15 days." }, { status: 400 });
  try {
    const order = await db.$transaction(async (tx) => {
      const quote = await tx.quotation.findUnique({ where: { id }, include: { school: true, items: true } });
      if (!quote || quote.status === "CONVERTED" || !quote.items.length) throw new Error("QUOTATION_UNAVAILABLE");
      const items = [];
      for (const item of quote.items) {
        if (!item.variantId) throw new Error("VARIANT_UNAVAILABLE");
        const allocation = await allocateStock(tx, item.variantId, item.quantity);
        const lineTotal = fromPaise(lineTotalPaise(Number(item.quotedPrice), item.quantity));
        const taxLine = fromPaise(priceWithTax(Number(item.quotedPrice), Number(item.gstRate)).taxPaise * item.quantity);
        items.push({ productName: item.productName, variantLabel: item.variantLabel, sku: item.sku, quantity: item.quantity, unitPrice: item.quotedPrice, gstRate: item.gstRate, lineTotal, taxLine, ...allocation });
      }
      const taxPaise = items.reduce((sum, item) => sum + Math.round(item.taxLine * 100), 0);
      const totalPaise = items.reduce((sum, item) => sum + Math.round(item.lineTotal * 100), 0);
      const taxTotal = fromPaise(taxPaise);
      const totalAmount = fromPaise(totalPaise);
      const due = new Date(); due.setDate(due.getDate() + parsed.data.paymentDueDays);
      const invoice = await tx.institutionalOrder.create({
        data: {
          schoolId: quote.schoolId,
          quotationId: quote.id,
          invoiceNumber: `SHI-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          totalAmount,
          taxTotal,
          paymentDueDate: due,
          items: { create: items.map((item) => ({
            productName: item.productName,
            variantLabel: item.variantLabel,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstRate: item.gstRate,
            lineTotal: item.lineTotal,
            shopQuantity: item.shopQuantity,
            godownQuantity: item.godownQuantity,
          })) },
        },
        include: { school: true, items: true },
      });
      await tx.quotation.update({ where: { id: quote.id }, data: { status: "CONVERTED" } });
      return invoice;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice could not be created.";
    const status = message === "INSUFFICIENT_STOCK" ? 409 : 400;
    const errorText = message === "INSUFFICIENT_STOCK" ? "Not enough stock to convert this quotation. Stock has not been changed." : message === "QUOTATION_UNAVAILABLE" ? "This quotation is already converted or has no items." : "Invoice could not be created.";
    return NextResponse.json({ error: errorText }, { status });
  }
}

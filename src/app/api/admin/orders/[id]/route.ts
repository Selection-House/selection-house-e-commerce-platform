import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { restoreStock } from "@/lib/inventory";

const schema = z.object({ status: z.enum(["PLACED", "CONFIRMED", "PACKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(), paymentStatus: z.literal("PAID").optional(), paymentMethod: z.enum(["BOB_TRANSFER", "PAY_AT_PICKUP", "CASH_COUNTER"]).optional(), reference: z.string().trim().max(120).optional() }).refine((value) => value.status || value.paymentStatus, "Choose an order status or payment update.");

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order update." }, { status: 400 });
  try {
    const updated = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true, payments: true } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (parsed.data.status === "CANCELLED" && parsed.data.paymentStatus === "PAID") throw new Error("CANCEL_AND_PAY");
      if (parsed.data.status === "CANCELLED" && order.status === "DELIVERED") throw new Error("DELIVERED_ORDER_CANCEL");
      if (order.status === "CANCELLED" && (parsed.data.status !== "CANCELLED" || parsed.data.paymentStatus === "PAID")) throw new Error("ORDER_CANCELLED");
      if (parsed.data.status === "CANCELLED" && order.status !== "CANCELLED") {
        if (order.paymentStatus === "PAID") throw new Error("PAID_ORDER_CANCEL");
        for (const item of order.items) if (item.variantId) await restoreStock(tx, item.variantId, item.shopQuantity, item.godownQuantity);
      }
      const paid = parsed.data.paymentStatus === "PAID" && order.paymentStatus !== "PAID";
      if (paid) {
        const marked = await tx.order.updateMany({ where: { id, paymentStatus: "UNPAID", status: { not: "CANCELLED" } }, data: { paymentStatus: "PAID" } });
        if (marked.count !== 1) throw new Error("PAYMENT_ALREADY_RECORDED");
        await tx.payment.create({ data: { orderId: id, method: parsed.data.paymentMethod ?? order.paymentMethod, amount: order.totalAmount, reference: parsed.data.reference || null } });
      }
      return tx.order.update({ where: { id }, data: { ...(parsed.data.status ? { status: parsed.data.status } : {}), ...(parsed.data.paymentStatus ? { paymentStatus: parsed.data.paymentStatus } : {}) }, include: { items: true } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order could not be updated.";
    const messages: Record<string, string> = { ORDER_NOT_FOUND: "Order not found.", ORDER_CANCELLED: "Cancelled orders cannot be reopened or marked paid.", PAID_ORDER_CANCEL: "This order is paid; record a refund outside the app before changing inventory.", PAYMENT_ALREADY_RECORDED: "Payment was already recorded for this order.", CANCEL_AND_PAY: "An order cannot be cancelled and marked paid in the same update.", DELIVERED_ORDER_CANCEL: "Delivered orders cannot be cancelled or restocked." };
    return NextResponse.json({ error: messages[message] ?? "Order could not be updated." }, { status: message === "ORDER_NOT_FOUND" ? 404 : 409 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ method: z.enum(["BOB_TRANSFER", "CASH_COUNTER"]), reference: z.string().trim().max(120).optional() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose BOB transfer or cash and try again." }, { status: 400 });
  try {
    const order = await db.$transaction(async (tx) => {
      const invoice = await tx.institutionalOrder.findUnique({ where: { id } });
      if (!invoice || invoice.paymentStatus === "PAID") throw new Error("ALREADY_PAID");
      const paidAt = new Date();
      const changed = await tx.institutionalOrder.updateMany({ where: { id, paymentStatus: "UNPAID" }, data: { paymentStatus: "PAID", paidAt } });
      if (changed.count !== 1) throw new Error("ALREADY_PAID");
      await tx.institutionalPayment.create({ data: { institutionalOrderId: id, method: parsed.data.method, amount: invoice.totalAmount, reference: parsed.data.reference || null } });
      return tx.institutionalOrder.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "ALREADY_PAID" ? "Invoice is already paid or was not found." : "Payment could not be saved." }, { status: 409 });
  }
}

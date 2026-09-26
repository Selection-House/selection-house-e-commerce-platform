import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const orders = await db.institutionalOrder.findMany({ include: { school: true, quotation: true, items: true, payments: true }, orderBy: [{ paymentStatus: "desc" }, { paymentDueDate: "asc" }] });
  const now = Date.now();
  return NextResponse.json(orders.map((order) => ({ ...order, daysOverdue: order.paymentStatus === "UNPAID" ? Math.max(0, Math.floor((now - new Date(order.paymentDueDate).getTime()) / 86_400_000)) : 0 })));
}

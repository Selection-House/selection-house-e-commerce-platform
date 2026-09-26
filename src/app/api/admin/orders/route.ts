import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const orders = await db.order.findMany({ include: { items: true, payments: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(orders);
}

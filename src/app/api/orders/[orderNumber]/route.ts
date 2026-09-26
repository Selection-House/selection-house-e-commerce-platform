import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  const phone = new URL(request.url).searchParams.get("phone")?.trim();
  if (!phone || phone.length < 8) return NextResponse.json({ error: "Enter the phone number used at checkout." }, { status: 400 });
  const order = await db.order.findFirst({ where: { orderNumber, phone }, include: { items: true } }).catch(() => null);
  if (!order) return NextResponse.json({ error: "We could not find that order and phone number." }, { status: 404 });
  return NextResponse.json(order);
}

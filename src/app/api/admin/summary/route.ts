import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  try {
    const [products, orders, schools, overdue, inventory] = await Promise.all([
      db.product.count({ where: { active: true } }),
      db.order.count({ where: { status: { not: "CANCELLED" } } }),
      db.school.count(),
      db.institutionalOrder.findMany({ where: { paymentStatus: "UNPAID", paymentDueDate: { lt: new Date() } }, include: { school: true }, orderBy: { paymentDueDate: "asc" }, take: 8 }),
      db.inventory.findMany({ include: { variant: { include: { product: true } }, location: true } }),
    ]);
    const lowStock = inventory.filter((item) => item.quantity <= item.lowStockThreshold).slice(0, 12);
    return NextResponse.json({ products, orders, schools, overdue, lowStock });
  } catch {
    return NextResponse.json({ error: "Database unavailable. Start PostgreSQL, migrate, and seed the database." }, { status: 503 });
  }
}

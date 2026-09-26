import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const [brands, categories] = await Promise.all([db.brand.findMany({ orderBy: { name: "asc" } }), db.category.findMany({ orderBy: { name: "asc" } })]);
  return NextResponse.json({ brands, categories });
}

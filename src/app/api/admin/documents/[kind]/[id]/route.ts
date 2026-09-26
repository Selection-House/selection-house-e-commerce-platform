import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: Promise<{ kind: string; id: string }> }) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const { kind, id } = await context.params;
  if (kind === "quotation") {
    const document = await db.quotation.findUnique({ where: { id }, include: { school: true, items: true } });
    if (!document) return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    return NextResponse.json({ kind, document, store: { legalName: process.env.STORE_LEGAL_NAME || "Selection House", address: process.env.STORE_ADDRESS || "Pilibhit, Uttar Pradesh, India", phone: process.env.STORE_PHONE || "", gstin: process.env.STORE_GSTIN || "" } });
  }
  if (kind === "invoice") {
    const document = await db.institutionalOrder.findUnique({ where: { id }, include: { school: true, quotation: true, items: true, payments: true } });
    if (!document) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    return NextResponse.json({ kind, document, store: { legalName: process.env.STORE_LEGAL_NAME || "Selection House", address: process.env.STORE_ADDRESS || "Pilibhit, Uttar Pradesh, India", phone: process.env.STORE_PHONE || "", gstin: process.env.STORE_GSTIN || "" } });
  }
  return NextResponse.json({ error: "Unknown document." }, { status: 404 });
}

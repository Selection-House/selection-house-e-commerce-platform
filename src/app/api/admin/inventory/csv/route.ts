import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
import { db } from "@/lib/db";

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
      row = []; cell = "";
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

export async function GET(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const records = await db.inventory.findMany({ include: { location: true, variant: { include: { product: true } } }, orderBy: [{ location: { name: "asc" } }, { variant: { sku: "asc" } }] });
  const header = ["sku", "barcode", "product", "variety", "location", "quantity", "lowStockThreshold"];
  const lines = [header, ...records.map((record) => [record.variant.sku, record.variant.barcode ?? "", record.variant.product.name, [record.variant.size, record.variant.color].filter(Boolean).join(" / "), record.location.name, record.quantity, record.lowStockThreshold])];
  return new Response(lines.map((line) => line.map(csvCell).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=selection-house-stock.csv" } });
}

export async function POST(request: NextRequest) {
  if (!isStaffRequest(request)) return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "CSV file must be smaller than 2 MB." }, { status: 413 });
  const rows = parseCsv(raw.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return NextResponse.json({ error: "CSV must include a header and at least one stock row." }, { status: 400 });
  const header = rows[0].map((value) => value.toLowerCase().replace(/\s+/g, ""));
  const column = (key: string) => header.indexOf(key.toLowerCase());
  const skuAt = column("sku");
  const barcodeAt = column("barcode");
  const locationAt = column("location");
  const quantityAt = column("quantity");
  const thresholdAt = column("lowstockthreshold");
  if ((skuAt < 0 && barcodeAt < 0) || locationAt < 0 || quantityAt < 0) return NextResponse.json({ error: "Required columns: sku or barcode, location, quantity. Optional: lowStockThreshold." }, { status: 400 });
  const results: Array<{ row: number; status: string; message?: string }> = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row.some(Boolean)) continue;
    const sku = skuAt >= 0 ? row[skuAt] : "";
    const barcode = barcodeAt >= 0 ? row[barcodeAt] : "";
    const locationName = row[locationAt];
    const quantity = Number(row[quantityAt]);
    const threshold = thresholdAt >= 0 && row[thresholdAt] ? Number(row[thresholdAt]) : 2;
    if ((!sku && !barcode) || !locationName || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(threshold) || threshold < 0) { results.push({ row: index + 1, status: "error", message: "Missing SKU/barcode, location, or valid non-negative stock." }); continue; }
    const variant = await db.productVariant.findFirst({ where: { OR: [sku ? { sku } : undefined, barcode ? { barcode } : undefined].filter(Boolean) as Array<{ sku: string } | { barcode: string }> } });
    const location = await db.location.findUnique({ where: { name: locationName } });
    if (!variant || !location) { results.push({ row: index + 1, status: "error", message: "SKU/barcode or location not found." }); continue; }
    await db.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({ where: { variantId_locationId: { variantId: variant.id, locationId: location.id } } });
      const delta = quantity - (existing?.quantity ?? 0);
      await tx.inventory.upsert({
        where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
        update: { quantity, lowStockThreshold: threshold },
        create: { variantId: variant.id, locationId: location.id, quantity, lowStockThreshold: threshold },
      });
      if (delta) await tx.inventoryAdjustment.create({ data: { variantId: variant.id, locationId: location.id, delta, reason: "CSV stock import" } });
    });
    results.push({ row: index + 1, status: "updated" });
  }
  return NextResponse.json({ updated: results.filter((row) => row.status === "updated").length, errors: results.filter((row) => row.status === "error") });
}

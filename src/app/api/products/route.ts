import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("q")?.trim();
    const products = await db.product.findMany({
      where: {
        active: true,
        ...(category ? { category: { slug: category } } : {}),
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }, { brand: { name: { contains: search, mode: "insensitive" } } }] } : {}),
      },
      include: { brand: true, category: true, variants: { where: { active: true }, include: { inventories: true } } },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        stock: variant.inventories.reduce((total, inventory) => total + inventory.quantity, 0),
        inventories: undefined,
      })),
    })));
  } catch {
    return NextResponse.json({ error: "The catalog is unavailable. Start PostgreSQL and run the database migration and seed." }, { status: 503 });
  }
}

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient;

export async function allocateStock(tx: Tx, variantId: string, quantity: number) {
  const locations = await tx.location.findMany({
    where: { name: { in: ["Shop", "Godown"] } },
    include: { inventories: { where: { variantId } } },
    orderBy: { name: "asc" },
  });
  const shop = locations.find((location) => location.name === "Shop");
  const godown = locations.find((location) => location.name === "Godown");
  const shopStock = shop?.inventories[0]?.quantity ?? 0;
  const godownStock = godown?.inventories[0]?.quantity ?? 0;
  if (shopStock + godownStock < quantity) throw new Error("INSUFFICIENT_STOCK");

  let remaining = quantity;
  const fromShop = Math.min(shopStock, remaining);
  remaining -= fromShop;
  const fromGodown = remaining;

  for (const [location, take] of [[shop, fromShop], [godown, fromGodown]] as const) {
    if (!location || !take) continue;
    const changed = await tx.inventory.updateMany({
      where: { variantId, locationId: location.id, quantity: { gte: take } },
      data: { quantity: { decrement: take } },
    });
    if (changed.count !== 1) throw new Error("STOCK_CHANGED_RETRY");
  }
  return { shopQuantity: fromShop, godownQuantity: fromGodown };
}

export async function restoreStock(tx: Tx, variantId: string, shopQuantity: number, godownQuantity: number) {
  for (const [name, quantity] of [["Shop", shopQuantity], ["Godown", godownQuantity]] as const) {
    if (!quantity) continue;
    const location = await tx.location.findUnique({ where: { name } });
    if (!location) continue;
    await tx.inventory.upsert({
      where: { variantId_locationId: { variantId, locationId: location.id } },
      update: { quantity: { increment: quantity } },
      create: { variantId, locationId: location.id, quantity },
    });
  }
}

export async function ensureDefaultLocations() {
  await db.location.createMany({ data: [{ name: "Shop" }, { name: "Godown" }], skipDuplicates: true });
}

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const brands = ["Cosco", "Nivia", "Yonex"];
const categories = [
  { name: "Cricket", slug: "cricket" },
  { name: "Football", slug: "football" },
  { name: "Badminton", slug: "badminton" },
];

const demoProducts = [
  {
    name: "Demo Cosco Cricket Tennis Ball",
    slug: "demo-cosco-cricket-tennis-ball",
    brand: "Cosco",
    category: "cricket",
    description: "Sample stock record for trying product and inventory management.",
    featured: true,
    variants: [{ sku: "DEMO-COS-CRB-01", barcode: "8907000000011", size: "Standard", color: "Red", price: 120, gstRate: 18, shop: 18, godown: 48 }],
  },
  {
    name: "Demo Nivia Street Football",
    slug: "demo-nivia-street-football",
    brand: "Nivia",
    category: "football",
    description: "Sample football record with a standard size and barcode.",
    featured: true,
    variants: [{ sku: "DEMO-NIV-FB-05", barcode: "8907000000028", size: "5", color: "Blue", price: 899, gstRate: 18, shop: 8, godown: 24 }],
  },
  {
    name: "Demo Yonex Training Racket",
    slug: "demo-yonex-training-racket",
    brand: "Yonex",
    category: "badminton",
    description: "Sample racket record with two varieties to test variant editing.",
    featured: false,
    variants: [
      { sku: "DEMO-YON-RK-4U", barcode: "8907000000035", size: "4U", color: "Black", price: 1499, gstRate: 18, shop: 5, godown: 12 },
      { sku: "DEMO-YON-RK-5U", barcode: "8907000000042", size: "5U", color: "Blue", price: 1299, gstRate: 18, shop: 4, godown: 10 },
    ],
  },
];

async function main() {
  const locationByName = new Map<string, string>();
  for (const name of ["Shop", "Godown"]) {
    const location = await db.location.upsert({ where: { name }, update: {}, create: { name } });
    locationByName.set(name, location.id);
  }
  const categoryBySlug = new Map<string, string>();
  for (const category of categories) {
    const record = await db.category.upsert({ where: { slug: category.slug }, update: { name: category.name }, create: category });
    categoryBySlug.set(category.slug, record.id);
  }
  const brandByName = new Map<string, string>();
  for (const name of brands) {
    const brand = await db.brand.upsert({ where: { name }, update: {}, create: { name } });
    brandByName.set(name, brand.id);
  }
  for (const demo of demoProducts) {
    const existingProduct = await db.product.upsert({
      where: { slug: demo.slug },
      update: { name: demo.name, description: demo.description, featured: demo.featured, demo: true, active: true },
      create: {
        name: demo.name,
        slug: demo.slug,
        description: demo.description,
        featured: demo.featured,
        demo: true,
        brandId: brandByName.get(demo.brand),
        categoryId: categoryBySlug.get(demo.category),
      },
    });
    for (const item of demo.variants) {
      const variant = await db.productVariant.upsert({
        where: { sku: item.sku },
        update: { price: item.price, gstRate: item.gstRate, size: item.size, color: item.color, active: true },
        create: {
          productId: existingProduct.id,
          sku: item.sku,
          barcode: item.barcode,
          size: item.size,
          color: item.color,
          price: item.price,
          gstRate: item.gstRate,
        },
      });
      for (const [name, quantity] of [["Shop", item.shop], ["Godown", item.godown]] as const) {
        await db.inventory.upsert({
          where: { variantId_locationId: { variantId: variant.id, locationId: locationByName.get(name)! } },
          update: {},
          create: { variantId: variant.id, locationId: locationByName.get(name)!, quantity, lowStockThreshold: 2 },
        });
      }
    }
  }
}

main()
  .then(() => console.log("Seeded three clearly marked Selection House demo products."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

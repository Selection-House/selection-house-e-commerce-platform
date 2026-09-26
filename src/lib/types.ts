export type CatalogVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  price: string | number;
  gstRate: string | number;
  stock: number;
  active: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  featured: boolean;
  demo: boolean;
  active: boolean;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string; slug: string } | null;
  variants: CatalogVariant[];
};

export type CartLine = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  price: number;
  gstRate: number;
  quantity: number;
  stock: number;
};

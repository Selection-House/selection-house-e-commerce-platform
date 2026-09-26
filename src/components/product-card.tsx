import Link from "next/link";
import { CircleDot, Dumbbell, Trophy, Volleyball } from "lucide-react";
import { money } from "@/lib/money";
import type { CatalogProduct } from "@/lib/types";
export function SportIcon({ category, size = 35 }: { category?: string | null; size?: number }) {
  const name = category?.toLowerCase() ?? "";
  if (name.includes("badminton") || name.includes("tennis")) return <Trophy size={size}/>;
  if (name.includes("gym") || name.includes("fitness")) return <Dumbbell size={size}/>;
  if (name.includes("football")) return <Volleyball size={size}/>;
  return <CircleDot size={size}/>;
}
export function ProductCard({ product }: { product: CatalogProduct }) {
  const variants = product.variants.filter((variant) => variant.active);
  const lowest = variants.reduce<number | null>((current, variant) => current === null || Number(variant.price) < current ? Number(variant.price) : current, null);
  const imageStyle = product.images?.[0] ? { backgroundImage: `url("${product.images[0].replaceAll('"', "%22")}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  return <Link className="product-card" href={`/products/${product.slug}`}><div className="product-art" style={imageStyle}>{product.demo && <span className="demo-tag">Demo item</span>}{!product.images?.[0] && <div className="sport-art"><SportIcon category={product.category?.name}/></div>}</div><div className="product-info"><div className="product-brand">{product.brand?.name || product.category?.name || "Sports goods"}</div><h3>{product.name}</h3><div className="product-price"><span>{lowest === null ? "Ask in store" : money(lowest)}</span><span aria-hidden="true">↗</span></div><div className="stock-note">{variants.reduce((sum, variant) => sum + variant.stock, 0) > 0 ? "In stock · GST included" : "Currently unavailable"}</div></div></Link>;
}

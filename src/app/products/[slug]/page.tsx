"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { SportIcon } from "@/components/product-card";
import { money } from "@/lib/money";
import type { CatalogProduct } from "@/lib/types";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  useEffect(() => { fetch("/api/products").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "The product could not be loaded."); return data; }).then((data: CatalogProduct[]) => setProducts(data)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The product could not be loaded.")); }, []);
  const product = products.find((item) => item.slug === slug);
  const variants = useMemo(() => product?.variants.filter((variant) => variant.active) ?? [], [product]);
  const selectedVariantId = variantId || variants[0]?.id || "";
  const variant = variants.find((item) => item.id === selectedVariantId);
  const imageStyle = product?.images?.[0] ? { backgroundImage: `url("${product.images[0].replaceAll('"', "%22")}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  if (!product && !error && !products.length) return <main className="container loading">Loading product…</main>;
  if (!product) return <main className="container page-top"><Link href="/" className="small-button"><ArrowLeft size={14}/> Back to collection</Link><div className="empty-state" style={{ marginTop: 20 }}>{error || "This product is unavailable."}</div></main>;
  const addToCart = () => {
    if (!variant || variant.stock < 1) return;
    add({ variantId: variant.id, productId: product.id, productName: product.name, variantLabel: [variant.size, variant.color].filter(Boolean).join(" / ") || "Standard", sku: variant.sku, price: Number(variant.price), gstRate: Number(variant.gstRate), quantity, stock: variant.stock });
    setAdded(true); window.setTimeout(() => setAdded(false), 2200);
  };
  return <main className="container"><div className="page-top"><Link href="/" className="small-button"><ArrowLeft size={14}/> Back to collection</Link></div><div className="detail-layout"><div className="detail-art" style={imageStyle}>{product.demo && <span className="demo-tag">Example product</span>}{!product.images?.[0] && <div className="sport-art"><SportIcon category={product.category?.name} size={72}/></div>}</div><section className="detail-copy"><div className="product-brand">{product.brand?.name || product.category?.name || "Selection House"}</div><h1>{product.name}</h1><div className="detail-price">{variant ? money(variant.price) : "Ask in store"}</div><div className="tax-hint">GST included · rate {variant?.gstRate ?? "—"}%</div><p>{product.description || "Quality sports gear for practice and play."}</p>
    {variants.length > 0 && <label className="field"><span>Choose size or variety</span><select className="select" value={selectedVariantId} onChange={(event) => { setVariantId(event.target.value); setQuantity(1); }} aria-label="Choose product variety">{variants.map((item) => <option value={item.id} key={item.id}>{[item.size, item.color].filter(Boolean).join(" / ") || "Standard"} · {money(item.price)} · {item.stock} in stock</option>)}</select></label>}
    <div className="divider"/><div style={{ display: "flex", gap: 12, alignItems: "end" }}><label className="field" style={{ width: 105 }}><span>Quantity</span><input className="input" type="number" min={1} max={variant?.stock || 1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value) || 1, variant?.stock || 1)))}/></label><button className="button" onClick={addToCart} disabled={!variant || variant.stock < 1}>{added ? <Check size={17}/> : <ShoppingBag size={17}/>} {added ? "Added to bag" : variant?.stock ? "Add to bag" : "Out of stock"}</button></div><div className="notice">Available stock is shared between web orders, school orders and stock at the counter. Your order is confirmed after staff verifies it.</div></section></div></main>;
}

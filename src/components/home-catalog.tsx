"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, BadgeCheck, Boxes, Search, Truck, Volleyball } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { CatalogProduct } from "@/lib/types";

const categories = [{ name: "Cricket", slug: "cricket", line: "Bats, balls & kits" }, { name: "Football", slug: "football", line: "Match & practice" }, { name: "Badminton", slug: "badminton", line: "Rackets & shuttlecocks" }, { name: "All sports", slug: "", line: "Explore the collection" }];

export default function HomeCatalog({ initialCategory, initialQuery }: { initialCategory: string; initialQuery: string }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const category = initialCategory;
  useEffect(() => {
    fetch(`/api/products${category ? `?category=${encodeURIComponent(category)}` : ""}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The catalog could not be loaded.");
      setProducts(data);
      setError("");
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The catalog could not be loaded.")).finally(() => setLoading(false));
  }, [category]);
  const visibleProducts = useMemo(() => products.filter((product) => `${product.name} ${product.brand?.name || ""} ${product.category?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  return <main>
    <section className="hero"><div className="hero-copy"><div className="eyebrow">Selection House · Pilibhit</div><h1>Gear up.<br/>Get out there.</h1><p>Sports essentials for the local game, daily practice and every big school season. Find trusted gear from the brands you know.</p><Link className="button button-light" href="#shop">Explore the collection <ArrowRight size={15}/></Link></div><div className="hero-orbit"><div className="hero-ball"/><div className="hero-stamp">READY<br/>FOR<br/>GAME DAY</div></div></section>
    <div className="container stat-strip"><div className="stat"><BadgeCheck size={19}/>Trusted sports brands</div><div className="stat"><Boxes size={19}/>Shop &amp; godown stock</div><div className="stat"><Truck size={19}/>Pickup &amp; local delivery</div></div>
    <section className="container"><div className="section-head"><div><div className="eyebrow" style={{ color: "#64836b" }}>Find your sport</div><h2>Pick your playing field</h2></div><Link href="#shop" className="small-button">All products <ArrowDownRight size={14}/></Link></div><div className="category-grid">{categories.map((item) => <Link key={item.name} className="category-tile" href={item.slug ? `/?category=${item.slug}` : "/"}><Volleyball size={27}/><span>{item.name}</span><small>{item.line}</small></Link>)}</div></section>
    <section className="container" id="shop"><div className="section-head"><div><div className="eyebrow" style={{ color: "#64836b" }}>The selection</div><h2>{category ? `${category[0].toUpperCase()}${category.slice(1)} gear` : "Good gear. Good game."}</h2><p>Every price includes GST. Stock is confirmed again when you place your order.</p></div></div><form className="search-row" onSubmit={(event) => event.preventDefault()}><label className="field" style={{ flex: 1 }}><span>Search equipment</span><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try cricket, Cosco or racket"/></label><button className="button" type="submit"><Search size={15}/>Find gear</button>{category && <Link className="button button-outline" href="/">Clear filter</Link>}</form>
      <div style={{ height: 22 }}/>{error && <div className="notice error">{error} Set up the database using the README instructions to load the demo products.</div>}{loading ? <div className="loading">Loading the collection…</div> : !visibleProducts.length ? <div className="empty-state">No products match that search. Try another sport or search term.</div> : <div className="product-grid">{visibleProducts.map((product) => <ProductCard product={product} key={product.id}/>)}</div>}</section>
    <section className="container feature-row"><div><div className="eyebrow" style={{ color: "#64836b" }}>For schools &amp; institutions</div><h2>One less thing to keep track of.</h2><p>Ask our team for a school quotation. We’ll keep the item list, invoice and payment due date together, so follow-ups are easy during the busy season.</p><Link className="button" href="/admin">Staff quotation desk <ArrowRight size={15}/></Link></div><div className="feature-number">50<span style={{ color: "#ff824c" }}>+</span></div></section>
  </main>;
}

"use client";
import Link from "next/link";
import { CircleUserRound, ShoppingBag, ShieldCheck, Volleyball } from "lucide-react";
import { useCart } from "@/components/cart-provider";
export function SiteHeader() {
  const { count } = useCart();
  return <><div className="topline">Pilibhit sports essentials · Shop pickup &amp; manual delivery</div><header className="site-header"><Link href="/" className="brand-mark"><span className="brand-icon"><Volleyball size={19}/></span><span>SELECTION<br/>HOUSE</span></Link><nav className="nav-links"><Link href="/?category=cricket">Cricket</Link><Link href="/?category=football">Football</Link><Link href="/?category=badminton">Badminton</Link><Link href="/orders">Track order</Link></nav><div className="nav-actions"><Link className="icon-button" href="/admin" aria-label="Staff panel"><ShieldCheck size={15}/><span>Staff</span></Link><Link className="icon-button" href="/cart" aria-label="Cart"><ShoppingBag size={15}/><span>Bag{count ? ` (${count})` : ""}</span></Link></div></header></>;
}
export function SiteFooter() { return <footer className="site-footer"><div className="container footer-inner"><div className="brand-mark"><span className="brand-icon"><CircleUserRound size={18}/></span><span>SELECTION HOUSE</span></div><p>Sports goods · Retail &amp; wholesale · Pilibhit, Uttar Pradesh</p><Link href="/admin">Store team</Link></div></footer>; }

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { money } from "@/lib/money";
type PlacedOrder = { orderNumber: string; totalAmount: string | number; phone: string; customerName: string };
export default function ConfirmationPage() {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  useEffect(() => { queueMicrotask(() => { try { setOrder(JSON.parse(localStorage.getItem("selection-house-last-order") || "null")); } catch { setOrder(null); } }); }, []);
  return <main className="container" style={{ maxWidth: 760, padding: "60px 0 80px" }}><div className="tracking-card" style={{ padding: 30 }}><CheckCircle2 size={35} color="#1d563a"/><div className="eyebrow" style={{ color: "#64836b", marginTop: 16 }}>Order received</div><h1 style={{ fontSize: 40, letterSpacing: "-.05em", margin: "10px 0" }}>Thanks, {order?.customerName || "we have it"}.</h1><p style={{ color: "#64716a", lineHeight: 1.7 }}>Our store team will verify your items and contact you about pickup or local delivery and payment.</p>{order && <div className="notice"><strong>Order {order.orderNumber}</strong><br/>Total {money(order.totalAmount)} · Payment pending</div>}<div className="divider"/><p style={{ fontSize: 13, color: "#64716a" }}><PackageCheck size={15} style={{ verticalAlign: "middle", marginRight: 6 }}/>We’ve reserved the available stock for your order.</p><Link className="button" href="/orders">Track this order</Link> <Link className="button button-outline" href="/">Continue shopping</Link></div></main>;
}

import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Selection House | Sports Goods, Pilibhit", description: "Shop sports goods and equipment at Selection House in Pilibhit, Uttar Pradesh." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><CartProvider><div className="site-shell"><SiteHeader/>{children}<SiteFooter/></div></CartProvider></body></html>;
}

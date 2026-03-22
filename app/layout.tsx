import type { Metadata } from "next";
import Link from "next/link";

import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pantry Pilot",
  description: "AI 驱动的饮食管理原型",
};

const navigation = [
  { href: "/", label: "库存看板" },
  { href: "/recipe/gap", label: "食谱比对" },
  { href: "/expiry", label: "保质期提醒" },
  { href: "/shopping", label: "采购清单" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <div className="page-shell">
            <div className="page-shell__glow page-shell__glow--one" />
            <div className="page-shell__glow page-shell__glow--two" />
            <header className="site-header">
              <div className="site-header__brand">
                <div className="site-header__mark">PP</div>
                <div>
                  <p className="site-header__eyebrow">Kitchen Intelligence</p>
                  <Link className="site-header__title" href="/">
                    Pantry Pilot
                  </Link>
                </div>
              </div>
              <nav className="site-header__nav">
                {navigation.map((item) => (
                  <Link key={item.href} className="site-header__link" href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </header>
            <main className="page-content">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}


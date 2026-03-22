"use client";

import Link from "next/link";

import { ShoppingPanel } from "@/components/shopping-panel";
import { useKitchen } from "@/components/kitchen-store";

export function ShoppingScreen() {
  const { state } = useKitchen();

  return (
    <div className="screen-stack">
      <section className="hero-panel hero-panel--compact">
        <div className="hero-panel__copy">
          <p className="section-kicker">Shopping Loop</p>
          <h1>采购之后，直接把清单回写库存。</h1>
          <p>这里会收纳食谱差值和手动补货需求，购买完成后直接同步到库存。</p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <span>待采购项</span>
            <strong>{state.shoppingList.length}</strong>
          </article>
        </div>
      </section>
      <ShoppingPanel />
      <div className="inline-actions">
        <Link className="button button--ghost" href="/">
          返回首页
        </Link>
        <Link className="button button--secondary" href="/?tab=recipes&composer=1">
          去生成差值清单
        </Link>
      </div>
    </div>
  );
}


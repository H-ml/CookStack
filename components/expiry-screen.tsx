"use client";

import Link from "next/link";
import { BellRing, PackageCheck } from "lucide-react";

import { useKitchen } from "@/components/kitchen-store";
import { formatDateLabel, formatQuantity, getExpiryLabel, getItemUrgency, sortInventory } from "@/components/kitchen-utils";

export function ExpiryScreen() {
  const { state } = useKitchen();
  const inventory = sortInventory(state.inventory).filter((item) => item.status === "in-stock");

  const warningItems = inventory.filter((item) => getItemUrgency(item) !== "normal");
  const stableItems = inventory.filter((item) => getItemUrgency(item) === "normal");

  return (
    <div className="screen-stack">
      <section className="hero-panel hero-panel--compact">
        <div className="hero-panel__copy">
          <p className="section-kicker">Expiry Radar</p>
          <h1>把快过期的食材，提前拉到眼前。</h1>
          <p>红色和橙色卡片建议优先安排进这两天的菜单，减少浪费。</p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <span>高优先级</span>
            <strong>{warningItems.length}</strong>
          </article>
          <article className="metric-card">
            <span>状态稳定</span>
            <strong>{stableItems.length}</strong>
          </article>
        </div>
      </section>

      {warningItems.length === 0 ? (
        <article className="empty-card empty-card--large">
          <PackageCheck size={28} />
          <div>
            <h2>暂时没有临近过期食材</h2>
            <p>当前库存状态稳定，可以继续从首页录入新食材或分析食谱。</p>
          </div>
          <Link className="button button--primary" href="/">
            返回首页
          </Link>
        </article>
      ) : (
        <section className="inventory-grid">
          {warningItems.map((item) => (
            <article className={`inventory-card inventory-card--${getItemUrgency(item)}`} key={item.id}>
              <div className="inventory-card__head">
                <span className="pill">{item.category}</span>
                <BellRing size={16} />
              </div>
              <h3>{item.name}</h3>
              <p className="inventory-card__quantity">
                {formatQuantity(item.quantity)}
                {item.unit}
              </p>
              <p className="inventory-card__date">保质期至 {formatDateLabel(item.expiryDate)}</p>
              <strong className="inventory-card__alert">{getExpiryLabel(item.expiryDate)}</strong>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

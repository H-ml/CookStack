"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCheck, ShoppingBasket, Trash2 } from "lucide-react";

import { useKitchen } from "@/components/kitchen-store";
import { formatQuantity } from "@/components/kitchen-utils";

interface ShoppingPanelProps {
  compact?: boolean;
  onClose?: () => void;
}

export function ShoppingPanel({ compact = false, onClose }: ShoppingPanelProps) {
  const { state, purchaseShoppingItem, removeShoppingItem } = useKitchen();
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, string>>({});

  if (state.shoppingList.length === 0) {
    return (
      <section className={clsx("shopping-panel", compact && "shopping-panel--compact")}>
        <div className="empty-card">
          <ShoppingBasket size={26} />
          <div>
            <h3>暂无采购计划</h3>
            <p>可以先去食谱比对页生成差值清单，再回到这里一键入库。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={clsx("shopping-panel", compact && "shopping-panel--compact")}>
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Shopping Loop</p>
          <h2>动态采购清单</h2>
        </div>
        {onClose ? (
          <button className="button button--ghost" onClick={onClose} type="button">
            收起
          </button>
        ) : null}
      </div>

      <div className="shopping-list">
        {state.shoppingList.map((item) => (
          <article className="shopping-row" key={item.id}>
            <div>
              <h3>{item.name}</h3>
              <p>
                建议采购 {formatQuantity(item.quantity)}
                {item.unit}
              </p>
            </div>
            <div className="shopping-row__actions">
              <input
                className="field field--tiny"
                inputMode="decimal"
                onChange={(event) =>
                  setQuantityOverrides((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                placeholder={formatQuantity(item.quantity)}
                value={quantityOverrides[item.id] ?? ""}
              />
              <button
                className="button button--primary"
                onClick={() => {
                  const override = quantityOverrides[item.id];
                  purchaseShoppingItem(item.id, override ? Number.parseFloat(override) : undefined);
                }}
                type="button"
              >
                <CheckCheck size={16} />
                已买入库
              </button>
              <button
                aria-label={`移除 ${item.name}`}
                className="icon-button"
                onClick={() => removeShoppingItem(item.id)}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

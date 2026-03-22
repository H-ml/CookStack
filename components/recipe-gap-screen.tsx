"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clipboard, RefreshCcw, ShoppingBasket, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useKitchen } from "@/components/kitchen-store";
import { formatQuantity } from "@/components/kitchen-utils";

export function RecipeGapScreen() {
  const router = useRouter();
  const { state, addShoppingItems } = useKitchen();
  const analysis = state.recipeAnalysis;

  if (!analysis) {
    return (
      <section className="single-panel">
        <article className="empty-card empty-card--large">
          <Sparkles size={28} />
          <div>
            <h2>还没有食谱分析结果</h2>
            <p>先回首页导入一段食谱文本，我们会自动提取食材并计算采购差值。</p>
          </div>
          <Link className="button button--primary" href="/?tab=recipes&composer=1">
            回首页分析
          </Link>
        </article>
      </section>
    );
  }

  const missingItems = analysis.gaps.filter((item) => item.gapQuantity > 0);
  const enoughItems = analysis.gaps.length - missingItems.length;

  return (
    <div className="screen-stack">
      <section className="hero-panel hero-panel--compact">
        <div className="hero-panel__copy">
          <p className="section-kicker">Recipe Gap Analysis</p>
          <h1>食材齐不齐，一眼就看出来。</h1>
          <p>左边是原始食谱，右边是解析后的需求清单和库存差值。</p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <span>解析食材</span>
            <strong>{analysis.ingredients.length}</strong>
          </article>
          <article className="metric-card">
            <span>库存充足</span>
            <strong>{enoughItems}</strong>
          </article>
          <article className="metric-card">
            <span>需要采购</span>
            <strong>{missingItems.length}</strong>
          </article>
        </div>
      </section>

      <section className="two-column">
        <article className="glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Original Recipe</p>
              <h2>原始食谱文本</h2>
            </div>
          </div>
          <pre className="recipe-text">{analysis.originalText}</pre>
        </article>

        <article className="glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Ingredient Diff</p>
              <h2>食材需求清单</h2>
            </div>
          </div>
          <div className="gap-table">
            {analysis.gaps.map((item) => (
              <div className={`gap-row ${item.enoughInStock ? "gap-row--ok" : "gap-row--warn"}`} key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    需求 {formatQuantity(item.quantity)}
                    {item.unit}
                  </p>
                </div>
                <div>
                  <p>
                    现有 {formatQuantity(item.currentQuantity)}
                    {item.unit}
                  </p>
                  <strong>
                    {item.enoughInStock
                      ? "库存充足"
                      : `还差 ${formatQuantity(item.gapQuantity)}${item.unit}`}
                  </strong>
                </div>
              </div>
            ))}
          </div>
          <div className="inline-actions">
            <button
              className="button button--secondary"
              onClick={async () => {
                const text = missingItems
                  .map((item) => `${item.name}×${formatQuantity(item.gapQuantity)}${item.unit}`)
                  .join("、");

                try {
                  await navigator.clipboard.writeText(text);
                  toast.success("差值清单已复制");
                } catch {
                  toast.error("复制失败，请稍后重试");
                }
              }}
              type="button"
            >
              <Clipboard size={16} />
              一键复制清单
            </button>
            <button
              className="button button--primary"
              onClick={() => {
                addShoppingItems(missingItems);
                toast.success("已加入采购清单");
                router.push("/shopping");
              }}
              type="button"
            >
              <ShoppingBasket size={16} />
              开始采购
            </button>
            <Link className="button button--ghost" href="/?tab=recipes&composer=1">
              <RefreshCcw size={16} />
              重新分析
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}


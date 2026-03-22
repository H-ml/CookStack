"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChefHat, Plus, SendHorizonal, Trash2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

import { useKitchen } from "@/components/kitchen-store";
import type { RecipeRecord } from "@/components/kitchen-types";
import { compareRecipeInventory, formatQuantity } from "@/components/kitchen-utils";

interface RecipeManagerTabProps {
  openComposerSignal: number;
  onPlanRecipe: (recipeId: string) => void;
}

export function RecipeManagerTab({ openComposerSignal, onPlanRecipe }: RecipeManagerTabProps) {
  const { state, addRecipe, deleteRecipe } = useKitchen();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipeText, setRecipeText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(state.recipes[0]?.id ?? null);

  const selectedRecipe = useMemo(
    () => state.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? state.recipes[0] ?? null,
    [selectedRecipeId, state.recipes],
  );

  useEffect(() => {
    if (openComposerSignal <= 0) {
      return;
    }

    setDialogOpen(true);
  }, [openComposerSignal]);

  useEffect(() => {
    if (!selectedRecipe && state.recipes[0]) {
      setSelectedRecipeId(state.recipes[0].id);
    }
  }, [selectedRecipe, state.recipes]);

  async function handleParseRecipe() {
    if (!recipeText.trim()) {
      return;
    }

    setIsParsing(true);

    try {
      const response = await fetch("/api/recipes/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: recipeText }),
      });

      if (!response.ok) {
        throw new Error("解析失败");
      }

      const payload = (await response.json()) as { recipe: RecipeRecord; source: "siliconflow" | "llm" | "fallback" };
      addRecipe(payload.recipe);
      setSelectedRecipeId(payload.recipe.id);
      setDialogOpen(false);
      setRecipeText("");
      toast.success(
        payload.source === "fallback"
          ? "已导入食谱，当前使用本地解析兜底"
          : payload.source === "siliconflow"
            ? "食谱已通过硅基流动导入"
            : "食谱已通过 LLM 导入",
      );
    } catch {
      toast.error("食谱解析失败，请稍后再试");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div className="screen-stack">
      <section className="hero-panel hero-panel--compact">
        <div className="hero-panel__copy">
          <p className="section-kicker">Recipe Library</p>
          <h1>食谱先结构化，计划和采购才会自动长出来。</h1>
          <p>粘贴任意食谱文本，我们会把它转成 recipes 表结构，并实时对照当前库存找出缺项。</p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <span>食谱总数</span>
            <strong>{state.recipes.length}</strong>
          </article>
          <article className="metric-card">
            <span>库存不足的食谱</span>
            <strong>
              {
                state.recipes.filter((recipe) =>
                  compareRecipeInventory(recipe, state.inventory).some((entry) => entry.missing || entry.shortage),
                ).length
              }
            </strong>
          </article>
        </div>
      </section>

      <div className="two-column two-column--recipes">
        <section className="glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Recipes</p>
              <h2>食谱管理</h2>
            </div>
            <button className="button button--primary" onClick={() => setDialogOpen(true)} type="button">
              <Plus size={16} />
              粘贴食谱
            </button>
          </div>

          <div className="recipe-list">
            {state.recipes.length === 0 ? (
              <article className="empty-card empty-card--large">
                <ChefHat size={28} />
                <div>
                  <h3>还没有食谱</h3>
                  <p>先粘贴一段菜谱文本，我们会为你生成可计划、可计算差值的结构化记录。</p>
                </div>
              </article>
            ) : (
              state.recipes.map((recipe) => {
                const comparison = compareRecipeInventory(recipe, state.inventory);
                const missingCount = comparison.filter((entry) => entry.missing).length;
                const shortageCount = comparison.filter((entry) => entry.shortage).length;

                return (
                  <article
                    className={`recipe-card ${selectedRecipe?.id === recipe.id ? "recipe-card--selected" : ""} ${missingCount > 0 ? "recipe-card--warning" : ""}`}
                    key={recipe.id}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    <div className="recipe-card__header">
                      <div>
                        <h3>{recipe.title}</h3>
                        <p>{recipe.summary}</p>
                      </div>
                      <button
                        className="icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteRecipe(recipe.id);
                          toast.success("已删除食谱");
                        }}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="ingredient-tags">
                      {comparison.map(({ ingredient, missing, shortage }) => (
                        <span
                          className={`ingredient-pill ${missing ? "ingredient-pill--missing" : shortage ? "ingredient-pill--shortage" : ""}`}
                          key={ingredient.id}
                        >
                          {ingredient.name} × {formatQuantity(ingredient.quantity)}
                          {ingredient.unit}
                        </span>
                      ))}
                    </div>
                    {(missingCount > 0 || shortageCount > 0) ? (
                      <div className="recipe-warning">
                        <TriangleAlert size={14} />
                        <span>
                          {missingCount > 0 ? `${missingCount} 种食材完全缺货` : `${shortageCount} 种食材库存不足`}
                        </span>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="glass-panel">
          {selectedRecipe ? (
            <>
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Recipe Detail</p>
                  <h2>{selectedRecipe.title}</h2>
                </div>
                <button className="button button--secondary" onClick={() => onPlanRecipe(selectedRecipe.id)} type="button">
                  <BookOpen size={16} />
                  加入周计划
                </button>
              </div>

              <p className="recipe-summary">{selectedRecipe.summary}</p>
              <div className="draft-list">
                {compareRecipeInventory(selectedRecipe, state.inventory).map(({ ingredient, currentQuantity, missing, shortage }) => (
                  <article className={`draft-row ${missing ? "draft-row--warning" : shortage ? "draft-row--soft-warning" : ""}`} key={ingredient.id}>
                    <div>
                      <h3>{ingredient.name}</h3>
                      <p>
                        需求 {formatQuantity(ingredient.quantity)}
                        {ingredient.unit} · 当前库存 {formatQuantity(currentQuantity)}
                        {ingredient.unit}
                      </p>
                    </div>
                    <strong className={missing ? "status-badge status-badge--warning" : shortage ? "status-badge status-badge--soft-warning" : "status-badge status-badge--success"}>
                      {missing ? "缺货" : shortage ? "不足" : "充足"}
                    </strong>
                  </article>
                ))}
              </div>

              <div className="recipe-raw-block">
                <p className="section-kicker">Original Text</p>
                <pre className="recipe-text">{selectedRecipe.originalText}</pre>
              </div>
            </>
          ) : (
            <article className="empty-card empty-card--large">
              <BookOpen size={28} />
              <div>
                <h3>选中一份食谱查看详情</h3>
                <p>右侧会显示结构化食材和库存对比结果。</p>
              </div>
            </article>
          )}
        </section>
      </div>

      {dialogOpen ? (
        <div className="modal">
          <div className="modal__backdrop" />
          <div className="modal__panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Paste Recipe</p>
                <h2>粘贴食谱文本</h2>
              </div>
              <button className="icon-button" onClick={() => setDialogOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
            <textarea
              className="field field--textarea field--grow"
              onChange={(event) => setRecipeText(event.target.value)}
              placeholder="比如：番茄牛肉面：2个番茄、200克牛肉、半斤面条、2根小葱……"
              value={recipeText}
            />
            <div className="inline-actions">
              <button className="button button--ghost" onClick={() => setDialogOpen(false)} type="button">
                取消
              </button>
              <button className="button button--primary" disabled={isParsing || !recipeText.trim()} onClick={handleParseRecipe} type="button">
                <SendHorizonal size={16} />
                {isParsing ? "解析中..." : "调用硅基流动导入"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

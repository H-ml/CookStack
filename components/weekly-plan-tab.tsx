"use client";

import { useMemo, useState } from "react";
import { ChefHat, Grip, ShoppingBasket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useKitchen } from "@/components/kitchen-store";
import { MEAL_SLOTS, WEEK_DAYS } from "@/components/kitchen-types";
import type { RecipeGapItem, WeekDay } from "@/components/kitchen-types";
import {
  aggregateWeeklyPlanIngredients,
  computeGapItemsFromIngredients,
  formatMealLabel,
  formatQuantity,
} from "@/components/kitchen-utils";

interface WeeklyPlanTabProps {
  selectedRecipeId: string | null;
  onSelectRecipe: (recipeId: string | null) => void;
}

export function WeeklyPlanTab({ selectedRecipeId, onSelectRecipe }: WeeklyPlanTabProps) {
  const { state, addShoppingItems, markPlanCooked, removePlanEntry, scheduleRecipe } = useKitchen();
  const [draggingRecipeId, setDraggingRecipeId] = useState<string | null>(null);

  const selectedRecipe = useMemo(
    () => state.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [selectedRecipeId, state.recipes],
  );

  const activePlanIngredients = useMemo(
    () => aggregateWeeklyPlanIngredients(state.weeklyPlan, state.recipes),
    [state.weeklyPlan, state.recipes],
  );

  const planGaps = useMemo(
    () => computeGapItemsFromIngredients(activePlanIngredients, state.inventory).filter((item) => item.gapQuantity > 0),
    [activePlanIngredients, state.inventory],
  );

  function getPlanEntry(day: WeekDay, meal: (typeof MEAL_SLOTS)[number]) {
    return state.weeklyPlan.find((entry) => entry.day === day && entry.meal === meal) ?? null;
  }

  function assignRecipe(day: WeekDay, meal: (typeof MEAL_SLOTS)[number], recipeId: string | null) {
    if (!recipeId) {
      toast.error("请先从左侧选中一份食谱");
      return;
    }

    scheduleRecipe(recipeId, day, meal);
    toast.success(`已安排到 ${day}${meal}`);
  }

  return (
    <div className="screen-stack">
      <section className="hero-panel hero-panel--compact">
        <div className="hero-panel__copy">
          <p className="section-kicker">Weekly Planner</p>
          <h1>把一周要做的菜先排上，差值清单会自己浮出来。</h1>
          <p>支持点击选中或拖拽食谱到具体日期和餐次，计划一更新，右侧采购差值就同步变化。</p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <span>已排餐次</span>
            <strong>{state.weeklyPlan.length}</strong>
          </article>
          <article className="metric-card">
            <span>待采购食材</span>
            <strong>{planGaps.length}</strong>
          </article>
        </div>
      </section>

      <div className="planner-layout">
        <section className="glass-panel planner-library">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Recipe Pool</p>
              <h2>左侧食谱库</h2>
            </div>
          </div>
          <div className="recipe-list recipe-list--compact">
            {state.recipes.map((recipe) => (
              <button
                className={`planner-recipe-card ${selectedRecipeId === recipe.id ? "planner-recipe-card--selected" : ""}`}
                draggable
                key={recipe.id}
                onClick={() => onSelectRecipe(selectedRecipeId === recipe.id ? null : recipe.id)}
                onDragEnd={() => setDraggingRecipeId(null)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", recipe.id);
                  setDraggingRecipeId(recipe.id);
                  onSelectRecipe(recipe.id);
                }}
                type="button"
              >
                <div>
                  <h3>{recipe.title}</h3>
                  <p>{recipe.summary}</p>
                </div>
                <Grip size={16} />
              </button>
            ))}
          </div>
          {selectedRecipe ? (
            <div className="selected-recipe-note">
              <ChefHat size={16} />
              <span>当前选中：{selectedRecipe.title}，点击任一餐次即可安排。</span>
            </div>
          ) : null}
        </section>

        <section className="glass-panel planner-board">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Week Board</p>
              <h2>周计划</h2>
            </div>
          </div>
          <div className="week-grid">
            {WEEK_DAYS.map((day) => (
              <article className="day-card" key={day}>
                <h3>{day}</h3>
                <div className="meal-slot-list">
                  {MEAL_SLOTS.map((meal) => {
                    const entry = getPlanEntry(day, meal);
                    const recipe = entry ? state.recipes.find((item) => item.id === entry.recipeId) ?? null : null;

                    return (
                      <div
                        className={`meal-slot ${entry ? "meal-slot--filled" : ""} ${draggingRecipeId ? "meal-slot--ready" : ""}`}
                        key={`${day}-${meal}`}
                        onClick={() => assignRecipe(day, meal, selectedRecipeId)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const recipeId = event.dataTransfer.getData("text/plain");
                          assignRecipe(day, meal, recipeId || selectedRecipeId);
                        }}
                      >
                        <div className="meal-slot__header">
                          <span>{formatMealLabel(meal)}</span>
                          {entry?.cookedAt ? <strong className="status-badge status-badge--success">已烹饪</strong> : null}
                        </div>
                        {recipe ? (
                          <div className="meal-slot__content">
                            <h4>{recipe.title}</h4>
                            <p>{recipe.ingredients.length} 种食材</p>
                            <div className="inline-actions inline-actions--tight">
                              <button
                                className="button button--secondary"
                                disabled={Boolean(entry?.cookedAt)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!entry) {
                                    return;
                                  }

                                  markPlanCooked(entry.id);
                                  toast.success(`已扣减 ${recipe.title} 的库存用量`);
                                }}
                                type="button"
                              >
                                已烹饪
                              </button>
                              <button
                                className="icon-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!entry) {
                                    return;
                                  }

                                  removePlanEntry(entry.id);
                                }}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="meal-slot__placeholder">点击或拖拽食谱到这里</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel planner-gaps">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Gap List</p>
              <h2>本周差值清单</h2>
            </div>
            {planGaps.length > 0 ? (
              <button className="button button--primary" onClick={() => addShoppingItems(planGaps as RecipeGapItem[])} type="button">
                <ShoppingBasket size={16} />
                同步采购清单
              </button>
            ) : null}
          </div>
          <div className="draft-list">
            {planGaps.length === 0 ? (
              <article className="empty-card empty-card--large">
                <ShoppingBasket size={28} />
                <div>
                  <h3>当前库存足够支撑未烹饪计划</h3>
                  <p>继续往周计划里排菜，右侧会实时重新计算差值。</p>
                </div>
              </article>
            ) : (
              planGaps.map((gap) => (
                <article className="draft-row draft-row--warning" key={gap.id}>
                  <div>
                    <h3>{gap.name}</h3>
                    <p>
                      本周需求 {formatQuantity(gap.quantity)}{gap.unit} · 当前库存 {formatQuantity(gap.currentQuantity)}{gap.unit}
                    </p>
                  </div>
                  <strong className="status-badge status-badge--warning">
                    还差 {formatQuantity(gap.gapQuantity)}{gap.unit}
                  </strong>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

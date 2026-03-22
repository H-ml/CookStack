"use client";

import { useEffect, useState } from "react";
import { BookOpenText, CalendarRange, Package2 } from "lucide-react";

import { InventoryTab } from "@/components/inventory-tab";
import { RecipeManagerTab } from "@/components/recipe-manager-tab";
import { useKitchen } from "@/components/kitchen-store";
import { WeeklyPlanTab } from "@/components/weekly-plan-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DashboardTab = "inventory" | "recipes" | "plan";

export function HomeScreen() {
  const { state } = useKitchen();
  const [activeTab, setActiveTab] = useState<DashboardTab>("inventory");
  const [openRecipeComposerSignal, setOpenRecipeComposerSignal] = useState(0);
  const [plannerSelectedRecipeId, setPlannerSelectedRecipeId] = useState<string | null>(state.recipes[0]?.id ?? null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const composer = params.get("composer");

    if (tab === "recipes" || tab === "plan" || tab === "inventory") {
      setActiveTab(tab);
    }

    if (tab === "recipes" && composer === "1") {
      setOpenRecipeComposerSignal((current) => current + 1);
    }

    if (params.toString()) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  return (
    <div className="screen-stack">
      <section className="glass-panel workspace-header">
        <div>
          <p className="section-kicker">Kitchen Workspace</p>
          <h1 className="workspace-header__title">库存、食谱、计划在一个工作台里闭环。</h1>
          <p className="workspace-header__summary">
            库存负责真实余量，食谱负责结构化知识，周计划负责形成采购与消耗动作。
          </p>
        </div>
        <div className="workspace-header__stats">
          <article className="metric-card">
            <span>库存项</span>
            <strong>{state.inventory.filter((item) => item.status === "in-stock").length}</strong>
          </article>
          <article className="metric-card">
            <span>食谱库</span>
            <strong>{state.recipes.length}</strong>
          </article>
          <article className="metric-card">
            <span>本周计划</span>
            <strong>{state.weeklyPlan.length}</strong>
          </article>
        </div>
      </section>

      <Tabs className="dashboard-tabs" defaultValue="inventory" onValueChange={(value) => setActiveTab(value as DashboardTab)} value={activeTab}>
        <TabsList>
          <TabsTrigger value="inventory">
            <Package2 size={16} />
            库存
          </TabsTrigger>
          <TabsTrigger value="recipes">
            <BookOpenText size={16} />
            食谱
          </TabsTrigger>
          <TabsTrigger value="plan">
            <CalendarRange size={16} />
            计划
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryTab
            onOpenRecipeManager={() => {
              setActiveTab("recipes");
              setOpenRecipeComposerSignal((current) => current + 1);
            }}
          />
        </TabsContent>

        <TabsContent value="recipes">
          <RecipeManagerTab
            onPlanRecipe={(recipeId) => {
              setPlannerSelectedRecipeId(recipeId);
              setActiveTab("plan");
            }}
            openComposerSignal={openRecipeComposerSignal}
          />
        </TabsContent>

        <TabsContent value="plan">
          <WeeklyPlanTab onSelectRecipe={setPlannerSelectedRecipeId} selectedRecipeId={plannerSelectedRecipeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

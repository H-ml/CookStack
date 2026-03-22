import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IngredientDraft,
  InventoryItem,
  KitchenState,
  RecipeAnalysis,
  RecipeRecord,
  ShoppingListItem,
  WeeklyPlanEntry,
} from "@/components/kitchen-types";
import { coerceKitchenState } from "@/lib/kitchen-state";

const META_ROW_ID = "default";
const DELETE_ALL_FILTER_ID = "__keep-none__";

interface InventoryRow {
  id: string;
  name: string;
  quantity: number | string;
  unit: InventoryItem["unit"];
  category: InventoryItem["category"];
  expiry_date: string;
  status: InventoryItem["status"];
  created_at: string;
  updated_at: string;
}

interface ShoppingListRow {
  id: string;
  name: string;
  quantity: number | string;
  unit: ShoppingListItem["unit"];
  category: ShoppingListItem["category"];
  created_at: string;
}

interface RecipeRow {
  id: string;
  title: string;
  summary: string | null;
  original_text: string;
  ingredients: IngredientDraft[] | null;
  created_at: string;
}

interface WeeklyPlanRow {
  id: string;
  recipe_id: string;
  day: WeeklyPlanEntry["day"];
  meal: WeeklyPlanEntry["meal"];
  cooked_at: string | null;
  created_at: string;
}

interface KitchenMetaRow {
  id: string;
  recipe_analysis: RecipeAnalysis | null;
  dismissed_expiring_ids: string[] | null;
  updated_at: string;
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function asIngredientDraftArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as IngredientDraft[];
  }

  return value.filter(
    (item): item is IngredientDraft =>
      Boolean(
        item &&
          typeof item === "object" &&
          "id" in item &&
          "name" in item &&
          "quantity" in item &&
          "unit" in item &&
          "category" in item,
      ),
  );
}

function asRecipeAnalysis(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (!("originalText" in value) || !("ingredients" in value) || !("gaps" in value) || !("createdAt" in value)) {
    return null;
  }

  return value as RecipeAnalysis;
}

function mapInventoryRows(rows: InventoryRow[]): InventoryItem[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    category: row.category,
    expiryDate: row.expiry_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function mapShoppingRows(rows: ShoppingListRow[]): ShoppingListItem[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    category: row.category,
    createdAt: row.created_at,
  }));
}

function mapRecipeRows(rows: RecipeRow[]): RecipeRecord[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary ?? undefined,
    originalText: row.original_text,
    createdAt: row.created_at,
    ingredients: asIngredientDraftArray(row.ingredients),
  }));
}

function mapWeeklyPlanRows(rows: WeeklyPlanRow[]): WeeklyPlanEntry[] {
  return rows.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id,
    day: row.day,
    meal: row.meal,
    cookedAt: row.cooked_at,
    createdAt: row.created_at,
  }));
}

function toInventoryRows(items: InventoryItem[]): InventoryRow[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiry_date: item.expiryDate,
    status: item.status,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }));
}

function toShoppingRows(items: ShoppingListItem[]): ShoppingListRow[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    created_at: item.createdAt,
  }));
}

function toRecipeRows(recipes: RecipeRecord[]): RecipeRow[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    summary: recipe.summary ?? null,
    original_text: recipe.originalText,
    ingredients: recipe.ingredients,
    created_at: recipe.createdAt,
  }));
}

function toWeeklyPlanRows(entries: WeeklyPlanEntry[]): WeeklyPlanRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    recipe_id: entry.recipeId,
    day: entry.day,
    meal: entry.meal,
    cooked_at: entry.cookedAt,
    created_at: entry.createdAt,
  }));
}

function toMetaRow(state: KitchenState): KitchenMetaRow {
  return {
    id: META_ROW_ID,
    recipe_analysis: state.recipeAnalysis,
    dismissed_expiring_ids: state.dismissedExpiringIds,
    updated_at: new Date().toISOString(),
  };
}

function hasRemoteKitchenData({
  inventory,
  shoppingList,
  recipes,
  weeklyPlan,
  meta,
}: {
  inventory: InventoryRow[];
  shoppingList: ShoppingListRow[];
  recipes: RecipeRow[];
  weeklyPlan: WeeklyPlanRow[];
  meta: KitchenMetaRow | null;
}) {
  return Boolean(
    inventory.length ||
      shoppingList.length ||
      recipes.length ||
      weeklyPlan.length ||
      meta?.recipe_analysis ||
      meta?.dismissed_expiring_ids?.length,
  );
}

async function deleteAllRows(client: SupabaseClient, table: string) {
  const { error } = await client.from(table).delete().neq("id", DELETE_ALL_FILTER_ID);

  if (error) {
    throw error;
  }
}

export async function loadKitchenState(client: SupabaseClient): Promise<KitchenState | null> {
  const [inventoryResult, shoppingResult, recipesResult, weeklyPlanResult, metaResult] = await Promise.all([
    client.from("inventory_items").select("*").order("created_at", { ascending: false }),
    client.from("shopping_list_items").select("*").order("created_at", { ascending: false }),
    client.from("recipes").select("*").order("created_at", { ascending: false }),
    client.from("weekly_plan_entries").select("*").order("created_at", { ascending: true }),
    client.from("kitchen_meta").select("*").eq("id", META_ROW_ID).maybeSingle(),
  ]);

  const firstError =
    inventoryResult.error ||
    shoppingResult.error ||
    recipesResult.error ||
    weeklyPlanResult.error ||
    metaResult.error;

  if (firstError) {
    throw firstError;
  }

  const rawInventory = (inventoryResult.data ?? []) as InventoryRow[];
  const rawShopping = (shoppingResult.data ?? []) as ShoppingListRow[];
  const rawRecipes = (recipesResult.data ?? []) as RecipeRow[];
  const rawWeeklyPlan = (weeklyPlanResult.data ?? []) as WeeklyPlanRow[];
  const rawMeta = (metaResult.data ?? null) as KitchenMetaRow | null;

  if (
    !hasRemoteKitchenData({
      inventory: rawInventory,
      shoppingList: rawShopping,
      recipes: rawRecipes,
      weeklyPlan: rawWeeklyPlan,
      meta: rawMeta,
    })
  ) {
    return null;
  }

  return coerceKitchenState({
    inventory: mapInventoryRows(rawInventory),
    shoppingList: mapShoppingRows(rawShopping),
    recipeAnalysis: asRecipeAnalysis(rawMeta?.recipe_analysis),
    recipes: mapRecipeRows(rawRecipes),
    weeklyPlan: mapWeeklyPlanRows(rawWeeklyPlan),
    dismissedExpiringIds: rawMeta?.dismissed_expiring_ids ?? [],
  });
}

export async function saveKitchenState(client: SupabaseClient, state: KitchenState) {
  await deleteAllRows(client, "weekly_plan_entries");
  await deleteAllRows(client, "recipes");
  await deleteAllRows(client, "inventory_items");
  await deleteAllRows(client, "shopping_list_items");

  if (state.inventory.length > 0) {
    const { error } = await client.from("inventory_items").insert(toInventoryRows(state.inventory));

    if (error) {
      throw error;
    }
  }

  if (state.shoppingList.length > 0) {
    const { error } = await client.from("shopping_list_items").insert(toShoppingRows(state.shoppingList));

    if (error) {
      throw error;
    }
  }

  if (state.recipes.length > 0) {
    const { error } = await client.from("recipes").insert(toRecipeRows(state.recipes));

    if (error) {
      throw error;
    }
  }

  if (state.weeklyPlan.length > 0) {
    const { error } = await client.from("weekly_plan_entries").insert(toWeeklyPlanRows(state.weeklyPlan));

    if (error) {
      throw error;
    }
  }

  const { error: metaError } = await client.from("kitchen_meta").upsert(toMetaRow(state), {
    onConflict: "id",
  });

  if (metaError) {
    throw metaError;
  }
}

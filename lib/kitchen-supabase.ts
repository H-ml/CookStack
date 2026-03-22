import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IngredientDraft,
  InventoryItem,
  KitchenState,
  RecipeAnalysis,
  RecipeGapItem,
  RecipeRecord,
  ShoppingListItem,
  WeeklyPlanEntry,
} from "@/components/kitchen-types";
import {
  buildInventoryItem,
  consumeIngredientsFromInventory,
  createId,
  dateDaysFromNow,
  roundQuantity,
  upsertInventoryItem,
} from "@/components/kitchen-utils";
import { coerceKitchenState } from "@/lib/kitchen-state";
import type { RemoteKitchenAction } from "@/lib/kitchen-remote-actions";

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

function toInventoryRow(item: InventoryItem): InventoryRow {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiry_date: item.expiryDate,
    status: item.status,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function toInventoryRows(items: InventoryItem[]): InventoryRow[] {
  return items.map(toInventoryRow);
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

function toRecipeRow(recipe: RecipeRecord): RecipeRow {
  return {
    id: recipe.id,
    title: recipe.title,
    summary: recipe.summary ?? null,
    original_text: recipe.originalText,
    ingredients: recipe.ingredients,
    created_at: recipe.createdAt,
  };
}

function toRecipeRows(recipes: RecipeRecord[]): RecipeRow[] {
  return recipes.map(toRecipeRow);
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

function mergeShoppingItems(currentList: ShoppingListItem[], incomingItems: RecipeGapItem[]) {
  return incomingItems.reduce<ShoppingListItem[]>((collection, item) => {
    if (item.gapQuantity <= 0) {
      return collection;
    }

    const existing = collection.find(
      (entry) => entry.name === item.name && entry.unit === item.unit && entry.category === item.category,
    );

    if (!existing) {
      collection.unshift({
        id: createId("shop"),
        name: item.name,
        quantity: item.gapQuantity,
        unit: item.unit,
        category: item.category,
        createdAt: new Date().toISOString(),
      });
      return collection;
    }

    existing.quantity = roundQuantity(existing.quantity + item.gapQuantity);
    return collection;
  }, [...currentList]);
}

async function deleteAllRows(client: SupabaseClient, table: string) {
  const { error } = await client.from(table).delete().neq("id", DELETE_ALL_FILTER_ID);

  if (error) {
    throw error;
  }
}

async function loadInventoryItems(client: SupabaseClient) {
  const result = await client.from("inventory_items").select("*").order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return mapInventoryRows((result.data ?? []) as InventoryRow[]);
}

async function loadShoppingListItems(client: SupabaseClient) {
  const result = await client.from("shopping_list_items").select("*").order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return mapShoppingRows((result.data ?? []) as ShoppingListRow[]);
}

async function loadRecipes(client: SupabaseClient) {
  const result = await client.from("recipes").select("*").order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return mapRecipeRows((result.data ?? []) as RecipeRow[]);
}

async function loadWeeklyPlan(client: SupabaseClient) {
  const result = await client.from("weekly_plan_entries").select("*").order("created_at", { ascending: true });

  if (result.error) {
    throw result.error;
  }

  return mapWeeklyPlanRows((result.data ?? []) as WeeklyPlanRow[]);
}

async function loadKitchenMeta(client: SupabaseClient) {
  const result = await client.from("kitchen_meta").select("*").eq("id", META_ROW_ID).maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? null) as KitchenMetaRow | null;
}

async function replaceInventoryItems(client: SupabaseClient, items: InventoryItem[]) {
  await deleteAllRows(client, "inventory_items");

  if (items.length <= 0) {
    return;
  }

  const { error } = await client.from("inventory_items").insert(toInventoryRows(items));

  if (error) {
    throw error;
  }
}

async function replaceShoppingListItems(client: SupabaseClient, items: ShoppingListItem[]) {
  await deleteAllRows(client, "shopping_list_items");

  if (items.length <= 0) {
    return;
  }

  const { error } = await client.from("shopping_list_items").insert(toShoppingRows(items));

  if (error) {
    throw error;
  }
}

async function replaceWeeklyPlanEntries(client: SupabaseClient, entries: WeeklyPlanEntry[]) {
  await deleteAllRows(client, "weekly_plan_entries");

  if (entries.length <= 0) {
    return;
  }

  const { error } = await client.from("weekly_plan_entries").insert(toWeeklyPlanRows(entries));

  if (error) {
    throw error;
  }
}

async function upsertKitchenMeta(client: SupabaseClient, updates: Partial<Pick<KitchenState, "recipeAnalysis" | "dismissedExpiringIds">>) {
  const currentMeta = await loadKitchenMeta(client);

  const nextMeta: KitchenMetaRow = {
    id: META_ROW_ID,
    recipe_analysis: updates.recipeAnalysis !== undefined ? updates.recipeAnalysis : currentMeta?.recipe_analysis ?? null,
    dismissed_expiring_ids:
      updates.dismissedExpiringIds !== undefined
        ? updates.dismissedExpiringIds
        : currentMeta?.dismissed_expiring_ids ?? [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("kitchen_meta").upsert(nextMeta, {
    onConflict: "id",
  });

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

export async function applyKitchenRemoteAction(client: SupabaseClient, action: RemoteKitchenAction) {
  switch (action.type) {
    case "seed-state": {
      await saveKitchenState(client, action.state);
      break;
    }
    case "add-inventory": {
      const currentInventory = await loadInventoryItems(client);
      const nextInventory = action.items.reduce((collection, item) => {
        return upsertInventoryItem(collection, buildInventoryItem(item));
      }, currentInventory);

      await replaceInventoryItems(client, nextInventory);
      break;
    }
    case "update-inventory": {
      const nextItem = {
        ...action.item,
        updatedAt: new Date().toISOString(),
      };

      const { error } = await client.from("inventory_items").update(toInventoryRow(nextItem)).eq("id", action.item.id);

      if (error) {
        throw error;
      }
      break;
    }
    case "delete-inventory": {
      const { error } = await client.from("inventory_items").delete().eq("id", action.id);

      if (error) {
        throw error;
      }
      break;
    }
    case "consume-inventory": {
      const currentInventory = await loadInventoryItems(client);
      const nextInventory: InventoryItem[] = currentInventory.map((item) => {
        if (item.id !== action.id) {
          return item;
        }

        let nextQuantity = item.quantity;

        if (action.mode === "all") {
          nextQuantity = 0;
        }

        if (action.mode === "half") {
          nextQuantity = item.quantity / 2;
        }

        if (action.mode === "custom") {
          nextQuantity = item.quantity - (action.amount ?? 0);
        }

        const safeQuantity = roundQuantity(Math.max(nextQuantity, 0));

        return {
          ...item,
          quantity: safeQuantity,
          status: safeQuantity <= 0 ? "consumed" : "in-stock",
          updatedAt: new Date().toISOString(),
        };
      });

      await replaceInventoryItems(client, nextInventory);
      break;
    }
    case "add-shopping": {
      const currentShopping = await loadShoppingListItems(client);
      const nextShopping = mergeShoppingItems(currentShopping, action.items);

      await replaceShoppingListItems(client, nextShopping);
      break;
    }
    case "purchase-shopping": {
      const [currentShopping, currentInventory] = await Promise.all([
        loadShoppingListItems(client),
        loadInventoryItems(client),
      ]);
      const targetItem = currentShopping.find((item) => item.id === action.id);

      if (!targetItem) {
        break;
      }

      const purchasedQuantity = roundQuantity(action.quantity ?? targetItem.quantity);
      const inventoryItem = buildInventoryItem({
        id: createId("inv"),
        name: targetItem.name,
        quantity: purchasedQuantity,
        unit: targetItem.unit,
        category: targetItem.category,
      });

      const nextInventory = upsertInventoryItem(currentInventory, {
        ...inventoryItem,
        expiryDate: dateDaysFromNow(5),
      });
      const nextShopping = currentShopping.filter((item) => item.id !== action.id);

      await Promise.all([
        replaceInventoryItems(client, nextInventory),
        replaceShoppingListItems(client, nextShopping),
      ]);
      break;
    }
    case "remove-shopping": {
      const { error } = await client.from("shopping_list_items").delete().eq("id", action.id);

      if (error) {
        throw error;
      }
      break;
    }
    case "set-analysis": {
      await upsertKitchenMeta(client, {
        recipeAnalysis: action.analysis,
      });
      break;
    }
    case "add-recipe": {
      const { error } = await client.from("recipes").insert(toRecipeRow(action.recipe));

      if (error) {
        throw error;
      }
      break;
    }
    case "delete-recipe": {
      const { error } = await client.from("recipes").delete().eq("id", action.id);

      if (error) {
        throw error;
      }
      break;
    }
    case "schedule-recipe": {
      const currentPlan = await loadWeeklyPlan(client);
      const existingEntry = currentPlan.find((entry) => entry.day === action.day && entry.meal === action.meal);

      if (existingEntry) {
        const { error } = await client
          .from("weekly_plan_entries")
          .update({
            recipe_id: action.recipeId,
            cooked_at: null,
          })
          .eq("id", existingEntry.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await client.from("weekly_plan_entries").insert({
          id: action.entryId ?? createId("plan"),
          recipe_id: action.recipeId,
          day: action.day,
          meal: action.meal,
          cooked_at: null,
          created_at: new Date().toISOString(),
        });

        if (error) {
          throw error;
        }
      }
      break;
    }
    case "remove-plan-entry": {
      const { error } = await client.from("weekly_plan_entries").delete().eq("id", action.id);

      if (error) {
        throw error;
      }
      break;
    }
    case "mark-plan-cooked": {
      const [currentPlan, recipes, currentInventory] = await Promise.all([
        loadWeeklyPlan(client),
        loadRecipes(client),
        loadInventoryItems(client),
      ]);
      const planEntry = currentPlan.find((entry) => entry.id === action.id);

      if (!planEntry || planEntry.cookedAt) {
        break;
      }

      const recipe = recipes.find((item) => item.id === planEntry.recipeId);

      if (!recipe) {
        break;
      }

      const nextInventory = consumeIngredientsFromInventory(currentInventory, recipe.ingredients);

      await Promise.all([
        replaceInventoryItems(client, nextInventory),
        client.from("weekly_plan_entries").update({ cooked_at: new Date().toISOString() }).eq("id", action.id),
      ]);
      break;
    }
    case "dismiss-expiring": {
      const currentMeta = await loadKitchenMeta(client);
      const nextIds = Array.from(new Set([...(currentMeta?.dismissed_expiring_ids ?? []), ...action.ids]));

      await upsertKitchenMeta(client, {
        dismissedExpiringIds: nextIds,
      });
      break;
    }
    default:
      break;
  }

  return await loadKitchenState(client);
}


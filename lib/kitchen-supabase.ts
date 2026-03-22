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

const DELETE_ALL_FILTER_ID = "__keep-none__";

interface InventoryRow {
  id: string;
  user_id: string | null;
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
  user_id: string | null;
  name: string;
  quantity: number | string;
  unit: ShoppingListItem["unit"];
  category: ShoppingListItem["category"];
  created_at: string;
}

interface RecipeRow {
  id: string;
  user_id: string | null;
  title: string;
  summary: string | null;
  original_text: string;
  ingredients: IngredientDraft[] | null;
  created_at: string;
}

interface WeeklyPlanRow {
  id: string;
  user_id: string | null;
  recipe_id: string;
  day: WeeklyPlanEntry["day"];
  meal: WeeklyPlanEntry["meal"];
  cooked_at: string | null;
  created_at: string;
}

interface KitchenMetaRow {
  id: string;
  user_id: string | null;
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

function toInventoryRow(userId: string, item: InventoryItem): InventoryRow {
  return {
    id: item.id,
    user_id: userId,
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

function toInventoryRows(userId: string, items: InventoryItem[]): InventoryRow[] {
  return items.map((item) => toInventoryRow(userId, item));
}

function toShoppingRows(userId: string, items: ShoppingListItem[]): ShoppingListRow[] {
  return items.map((item) => ({
    id: item.id,
    user_id: userId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    created_at: item.createdAt,
  }));
}

function toRecipeRow(userId: string, recipe: RecipeRecord): RecipeRow {
  return {
    id: recipe.id,
    user_id: userId,
    title: recipe.title,
    summary: recipe.summary ?? null,
    original_text: recipe.originalText,
    ingredients: recipe.ingredients,
    created_at: recipe.createdAt,
  };
}

function toRecipeRows(userId: string, recipes: RecipeRecord[]): RecipeRow[] {
  return recipes.map((recipe) => toRecipeRow(userId, recipe));
}

function toWeeklyPlanRows(userId: string, entries: WeeklyPlanEntry[]): WeeklyPlanRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    user_id: userId,
    recipe_id: entry.recipeId,
    day: entry.day,
    meal: entry.meal,
    cooked_at: entry.cookedAt,
    created_at: entry.createdAt,
  }));
}

function toMetaRow(userId: string, state: KitchenState): KitchenMetaRow {
  return {
    id: userId,
    user_id: userId,
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

async function deleteUserRows(client: SupabaseClient, table: string, userId: string) {
  const { error } = await client.from(table).delete().eq("user_id", userId).neq("id", DELETE_ALL_FILTER_ID);

  if (error) {
    throw error;
  }
}

async function loadInventoryItems(client: SupabaseClient, userId: string) {
  const result = await client.from("inventory_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return mapInventoryRows((result.data ?? []) as InventoryRow[]);
}

async function loadShoppingListItems(client: SupabaseClient, userId: string) {
  const result = await client.from("shopping_list_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return mapShoppingRows((result.data ?? []) as ShoppingListRow[]);
}

async function loadRecipes(client: SupabaseClient, userId: string) {
  const result = await client.from("recipes").select("*").eq("user_id", userId).order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return mapRecipeRows((result.data ?? []) as RecipeRow[]);
}

async function loadWeeklyPlan(client: SupabaseClient, userId: string) {
  const result = await client.from("weekly_plan_entries").select("*").eq("user_id", userId).order("created_at", { ascending: true });

  if (result.error) {
    throw result.error;
  }

  return mapWeeklyPlanRows((result.data ?? []) as WeeklyPlanRow[]);
}

async function loadKitchenMeta(client: SupabaseClient, userId: string) {
  const result = await client.from("kitchen_meta").select("*").eq("user_id", userId).maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? null) as KitchenMetaRow | null;
}

async function replaceInventoryItems(client: SupabaseClient, userId: string, items: InventoryItem[]) {
  await deleteUserRows(client, "inventory_items", userId);

  if (items.length <= 0) {
    return;
  }

  const { error } = await client.from("inventory_items").insert(toInventoryRows(userId, items));

  if (error) {
    throw error;
  }
}

async function replaceShoppingListItems(client: SupabaseClient, userId: string, items: ShoppingListItem[]) {
  await deleteUserRows(client, "shopping_list_items", userId);

  if (items.length <= 0) {
    return;
  }

  const { error } = await client.from("shopping_list_items").insert(toShoppingRows(userId, items));

  if (error) {
    throw error;
  }
}

async function replaceWeeklyPlanEntries(client: SupabaseClient, userId: string, entries: WeeklyPlanEntry[]) {
  await deleteUserRows(client, "weekly_plan_entries", userId);

  if (entries.length <= 0) {
    return;
  }

  const { error } = await client.from("weekly_plan_entries").insert(toWeeklyPlanRows(userId, entries));

  if (error) {
    throw error;
  }
}

async function upsertKitchenMeta(
  client: SupabaseClient,
  userId: string,
  updates: Partial<Pick<KitchenState, "recipeAnalysis" | "dismissedExpiringIds">>,
) {
  const currentMeta = await loadKitchenMeta(client, userId);

  const nextMeta: KitchenMetaRow = {
    id: userId,
    user_id: userId,
    recipe_analysis: updates.recipeAnalysis !== undefined ? updates.recipeAnalysis : currentMeta?.recipe_analysis ?? null,
    dismissed_expiring_ids:
      updates.dismissedExpiringIds !== undefined
        ? updates.dismissedExpiringIds
        : currentMeta?.dismissed_expiring_ids ?? [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("kitchen_meta").upsert(nextMeta, {
    onConflict: "user_id",
  });

  if (error) {
    throw error;
  }
}

export async function loadKitchenState(client: SupabaseClient, userId: string): Promise<KitchenState | null> {
  const [inventoryResult, shoppingResult, recipesResult, weeklyPlanResult, metaResult] = await Promise.all([
    client.from("inventory_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("shopping_list_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("recipes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("weekly_plan_entries").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("kitchen_meta").select("*").eq("user_id", userId).maybeSingle(),
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

export async function saveKitchenState(client: SupabaseClient, userId: string, state: KitchenState) {
  await deleteUserRows(client, "weekly_plan_entries", userId);
  await deleteUserRows(client, "recipes", userId);
  await deleteUserRows(client, "inventory_items", userId);
  await deleteUserRows(client, "shopping_list_items", userId);

  if (state.inventory.length > 0) {
    const { error } = await client.from("inventory_items").insert(toInventoryRows(userId, state.inventory));

    if (error) {
      throw error;
    }
  }

  if (state.shoppingList.length > 0) {
    const { error } = await client.from("shopping_list_items").insert(toShoppingRows(userId, state.shoppingList));

    if (error) {
      throw error;
    }
  }

  if (state.recipes.length > 0) {
    const { error } = await client.from("recipes").insert(toRecipeRows(userId, state.recipes));

    if (error) {
      throw error;
    }
  }

  if (state.weeklyPlan.length > 0) {
    const { error } = await client.from("weekly_plan_entries").insert(toWeeklyPlanRows(userId, state.weeklyPlan));

    if (error) {
      throw error;
    }
  }

  const { error: metaError } = await client.from("kitchen_meta").upsert(toMetaRow(userId, state), {
    onConflict: "user_id",
  });

  if (metaError) {
    throw metaError;
  }
}

export async function applyKitchenRemoteAction(client: SupabaseClient, userId: string, action: RemoteKitchenAction) {
  switch (action.type) {
    case "seed-state": {
      await saveKitchenState(client, userId, action.state);
      break;
    }
    case "add-inventory": {
      const currentInventory = await loadInventoryItems(client, userId);
      const nextInventory = action.items.reduce((collection, item) => {
        return upsertInventoryItem(collection, buildInventoryItem(item));
      }, currentInventory);

      await replaceInventoryItems(client, userId, nextInventory);
      break;
    }
    case "update-inventory": {
      const nextItem = {
        ...action.item,
        updatedAt: new Date().toISOString(),
      };

      const { error } = await client
        .from("inventory_items")
        .update(toInventoryRow(userId, nextItem))
        .eq("id", action.item.id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
      break;
    }
    case "delete-inventory": {
      const { error } = await client.from("inventory_items").delete().eq("id", action.id).eq("user_id", userId);

      if (error) {
        throw error;
      }
      break;
    }
    case "consume-inventory": {
      const currentInventory = await loadInventoryItems(client, userId);
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

      await replaceInventoryItems(client, userId, nextInventory);
      break;
    }
    case "add-shopping": {
      const currentShopping = await loadShoppingListItems(client, userId);
      const nextShopping = mergeShoppingItems(currentShopping, action.items);

      await replaceShoppingListItems(client, userId, nextShopping);
      break;
    }
    case "purchase-shopping": {
      const [currentShopping, currentInventory] = await Promise.all([
        loadShoppingListItems(client, userId),
        loadInventoryItems(client, userId),
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
        replaceInventoryItems(client, userId, nextInventory),
        replaceShoppingListItems(client, userId, nextShopping),
      ]);
      break;
    }
    case "remove-shopping": {
      const { error } = await client
        .from("shopping_list_items")
        .delete()
        .eq("id", action.id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
      break;
    }
    case "set-analysis": {
      await upsertKitchenMeta(client, userId, {
        recipeAnalysis: action.analysis,
      });
      break;
    }
    case "add-recipe": {
      const { error } = await client.from("recipes").insert(toRecipeRow(userId, action.recipe));

      if (error) {
        throw error;
      }
      break;
    }
    case "delete-recipe": {
      const { error } = await client.from("recipes").delete().eq("id", action.id).eq("user_id", userId);

      if (error) {
        throw error;
      }
      break;
    }
    case "schedule-recipe": {
      const currentPlan = await loadWeeklyPlan(client, userId);
      const existingEntry = currentPlan.find((entry) => entry.day === action.day && entry.meal === action.meal);

      if (existingEntry) {
        const { error } = await client
          .from("weekly_plan_entries")
          .update({
            recipe_id: action.recipeId,
            cooked_at: null,
          })
          .eq("id", existingEntry.id)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await client.from("weekly_plan_entries").insert({
          id: action.entryId ?? createId("plan"),
          user_id: userId,
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
      const { error } = await client.from("weekly_plan_entries").delete().eq("id", action.id).eq("user_id", userId);

      if (error) {
        throw error;
      }
      break;
    }
    case "mark-plan-cooked": {
      const [currentPlan, recipes, currentInventory] = await Promise.all([
        loadWeeklyPlan(client, userId),
        loadRecipes(client, userId),
        loadInventoryItems(client, userId),
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
      await replaceInventoryItems(client, userId, nextInventory);

      const { error } = await client
        .from("weekly_plan_entries")
        .update({ cooked_at: new Date().toISOString() })
        .eq("id", action.id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
      break;
    }
    case "dismiss-expiring": {
      const currentMeta = await loadKitchenMeta(client, userId);
      const nextIds = Array.from(new Set([...(currentMeta?.dismissed_expiring_ids ?? []), ...action.ids]));

      await upsertKitchenMeta(client, userId, {
        dismissedExpiringIds: nextIds,
      });
      break;
    }
    default:
      break;
  }

  return await loadKitchenState(client, userId);
}

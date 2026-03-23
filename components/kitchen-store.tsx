"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";

import { useAuth } from "@/components/auth-store";
import { createInitialKitchenState } from "@/components/mock-data";
import type {
  IngredientDraft,
  InventoryItem,
  KitchenState,
  MealSlot,
  RecipeAnalysis,
  RecipeGapItem,
  RecipeRecord,
  ShoppingListItem,
  WeekDay,
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
import type { ConsumeMode, RemoteKitchenAction } from "@/lib/kitchen-remote-actions";

const STORAGE_KEY = "pantry-pilot-state-v2";

type StorageMode = "local" | "supabase";

type KitchenAction =
  | { type: "load"; state: KitchenState }
  | { type: "add-inventory"; items: IngredientDraft[] }
  | { type: "update-inventory"; item: InventoryItem }
  | { type: "delete-inventory"; id: string }
  | { type: "consume-inventory"; id: string; mode: ConsumeMode; amount?: number }
  | { type: "add-shopping"; items: RecipeGapItem[] }
  | { type: "purchase-shopping"; id: string; quantity?: number }
  | { type: "remove-shopping"; id: string }
  | { type: "set-analysis"; analysis: RecipeAnalysis | null }
  | { type: "add-recipe"; recipe: RecipeRecord }
  | { type: "delete-recipe"; id: string }
  | { type: "schedule-recipe"; recipeId: string; day: WeekDay; meal: MealSlot; entryId?: string }
  | { type: "remove-plan-entry"; id: string }
  | { type: "mark-plan-cooked"; id: string }
  | { type: "dismiss-expiring"; ids: string[] };

interface KitchenContextValue {
  state: KitchenState;
  isReady: boolean;
  storageMode: StorageMode;
  addInventoryItems: (items: IngredientDraft[]) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
  consumeInventoryItem: (id: string, mode: ConsumeMode, amount?: number) => void;
  addShoppingItems: (items: RecipeGapItem[]) => void;
  purchaseShoppingItem: (id: string, quantity?: number) => void;
  removeShoppingItem: (id: string) => void;
  setRecipeAnalysis: (analysis: RecipeAnalysis | null) => void;
  addRecipe: (recipe: RecipeRecord) => void;
  deleteRecipe: (id: string) => void;
  scheduleRecipe: (recipeId: string, day: WeekDay, meal: MealSlot) => void;
  removePlanEntry: (id: string) => void;
  markPlanCooked: (id: string) => void;
  dismissExpiring: (ids: string[]) => void;
}

const KitchenContext = createContext<KitchenContextValue | null>(null);

const EMPTY_KITCHEN_STATE: KitchenState = {
  inventory: [],
  shoppingList: [],
  recipeAnalysis: null,
  recipes: [],
  weeklyPlan: [],
  dismissedExpiringIds: [],
};

function getStorageKey(userId: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : `${STORAGE_KEY}:guest`;
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

function readLocalKitchenState(userId: string | null) {
  try {
    const storedState = window.localStorage.getItem(getStorageKey(userId));

    if (!storedState) {
      return null;
    }

    return coerceKitchenState(JSON.parse(storedState) as Partial<KitchenState>);
  } catch {
    window.localStorage.removeItem(getStorageKey(userId));
    return null;
  }
}

function kitchenReducer(state: KitchenState, action: KitchenAction): KitchenState {
  switch (action.type) {
    case "load":
      return action.state;
    case "add-inventory": {
      const nextInventory = action.items.reduce((collection, item) => {
        return upsertInventoryItem(collection, buildInventoryItem(item));
      }, state.inventory);

      return {
        ...state,
        inventory: nextInventory,
      };
    }
    case "update-inventory":
      return {
        ...state,
        inventory: state.inventory.map((item) =>
          item.id === action.item.id
            ? {
                ...action.item,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      };
    case "delete-inventory":
      return {
        ...state,
        inventory: state.inventory.filter((item) => item.id !== action.id),
      };
    case "consume-inventory":
      return {
        ...state,
        inventory: state.inventory.map((item) => {
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
        }),
      };
    case "add-shopping":
      return {
        ...state,
        shoppingList: mergeShoppingItems(state.shoppingList, action.items),
      };
    case "purchase-shopping": {
      const targetItem = state.shoppingList.find((item) => item.id === action.id);

      if (!targetItem) {
        return state;
      }

      const purchasedQuantity = roundQuantity(action.quantity ?? targetItem.quantity);
      const inventoryItem = buildInventoryItem({
        id: createId("inv"),
        name: targetItem.name,
        quantity: purchasedQuantity,
        unit: targetItem.unit,
        category: targetItem.category,
      });

      return {
        ...state,
        shoppingList: state.shoppingList.filter((item) => item.id !== action.id),
        inventory: upsertInventoryItem(state.inventory, {
          ...inventoryItem,
          expiryDate: dateDaysFromNow(5),
        }),
      };
    }
    case "remove-shopping":
      return {
        ...state,
        shoppingList: state.shoppingList.filter((item) => item.id !== action.id),
      };
    case "set-analysis":
      return {
        ...state,
        recipeAnalysis: action.analysis,
      };
    case "add-recipe":
      return {
        ...state,
        recipes: [action.recipe, ...state.recipes],
      };
    case "delete-recipe":
      return {
        ...state,
        recipes: state.recipes.filter((recipe) => recipe.id !== action.id),
        weeklyPlan: state.weeklyPlan.filter((entry) => entry.recipeId !== action.id),
      };
    case "schedule-recipe": {
      const existingEntry = state.weeklyPlan.find(
        (entry) => entry.day === action.day && entry.meal === action.meal,
      );

      if (!existingEntry) {
        return {
          ...state,
          weeklyPlan: [
            ...state.weeklyPlan,
            {
              id: action.entryId ?? createId("plan"),
              recipeId: action.recipeId,
              day: action.day,
              meal: action.meal,
              cookedAt: null,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }

      return {
        ...state,
        weeklyPlan: state.weeklyPlan.map((entry) =>
          entry.id === existingEntry.id
            ? {
                ...entry,
                recipeId: action.recipeId,
                cookedAt: null,
              }
            : entry,
        ),
      };
    }
    case "remove-plan-entry":
      return {
        ...state,
        weeklyPlan: state.weeklyPlan.filter((entry) => entry.id !== action.id),
      };
    case "mark-plan-cooked": {
      const planEntry = state.weeklyPlan.find((entry) => entry.id === action.id);
      if (!planEntry || planEntry.cookedAt) {
        return state;
      }

      const recipe = state.recipes.find((item) => item.id === planEntry.recipeId);
      if (!recipe) {
        return state;
      }

      return {
        ...state,
        inventory: consumeIngredientsFromInventory(state.inventory, recipe.ingredients),
        weeklyPlan: state.weeklyPlan.map((entry) =>
          entry.id === action.id
            ? {
                ...entry,
                cookedAt: new Date().toISOString(),
              }
            : entry,
        ),
      };
    }
    case "dismiss-expiring":
      return {
        ...state,
        dismissedExpiringIds: Array.from(new Set([...state.dismissedExpiringIds, ...action.ids])),
      };
    default:
      return state;
  }
}

export function KitchenProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isReady: isAuthReady, user } = useAuth();
  const [state, dispatch] = useReducer(kitchenReducer, undefined, createInitialKitchenState);
  const [isReady, setIsReady] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const remoteQueueRef = useRef(Promise.resolve());
  const scopeRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthReady) {
      setIsReady(false);
      return;
    }

    let isCancelled = false;

    async function hydrateKitchenState() {
      setIsReady(false);
      remoteQueueRef.current = Promise.resolve();
      scopeRef.current = userId;

      const scopedLocalState = readLocalKitchenState(userId);
      const guestLocalState = userId ? readLocalKitchenState(null) : null;
      const emptyCloudState = EMPTY_KITCHEN_STATE;
      const bootstrapState = scopedLocalState ?? guestLocalState ?? createInitialKitchenState();

      dispatch({ type: "load", state: bootstrapState });

      if (!userId || !accessToken) {
        setStorageMode("local");
        if (!isCancelled) {
          setIsReady(true);
        }
        return;
      }

      try {
        const response = await fetch("/api/kitchen", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("kitchen bootstrap failed");
        }

        const payload = (await response.json()) as {
          enabled?: boolean;
          state?: KitchenState | null;
        };

        if (isCancelled) {
          return;
        }

        if (payload.enabled) {
          setStorageMode("supabase");

          if (payload.state) {
            dispatch({ type: "load", state: coerceKitchenState(payload.state) });
          } else {
            const seedState = scopedLocalState ?? guestLocalState;

            if (!seedState) {
              dispatch({ type: "load", state: emptyCloudState });
            } else {
              const seedResponse = await fetch("/api/kitchen", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ state: seedState }),
              });

              if (!seedResponse.ok) {
                console.error("Failed to seed initial Supabase kitchen state", seedResponse.status);
                dispatch({ type: "load", state: emptyCloudState });
                return;
              }

              dispatch({ type: "load", state: seedState });
            }
          }
        } else {
          setStorageMode("local");
        }
      } catch {
        if (!isCancelled) {
          setStorageMode("local");
        }
      } finally {
        if (!isCancelled) {
          setIsReady(true);
        }
      }
    }

    void hydrateKitchenState();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, isAuthReady, userId]);

  useEffect(() => {
    if (!isReady || scopeRef.current !== userId) {
      return;
    }

    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  }, [isReady, state, userId]);

  function queueRemoteAction(remoteAction: RemoteKitchenAction, fallbackAction: KitchenAction) {
    if (storageMode !== "supabase" || !accessToken) {
      dispatch(fallbackAction);
      return;
    }

    remoteQueueRef.current = remoteQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/kitchen/actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action: remoteAction }),
        });

        if (!response.ok) {
          throw new Error("remote action failed");
        }

        const payload = (await response.json()) as { state?: KitchenState | null };

        if (payload.state) {
          dispatch({ type: "load", state: coerceKitchenState(payload.state) });
          return;
        }

        dispatch(fallbackAction);
      })
      .catch(() => {
        dispatch(fallbackAction);
      });
  }

  return (
    <KitchenContext.Provider
      value={{
        state,
        isReady,
        storageMode,
        addInventoryItems: (items) => {
          queueRemoteAction({ type: "add-inventory", items }, { type: "add-inventory", items });
        },
        updateInventoryItem: (item) => {
          queueRemoteAction({ type: "update-inventory", item }, { type: "update-inventory", item });
        },
        deleteInventoryItem: (id) => {
          queueRemoteAction({ type: "delete-inventory", id }, { type: "delete-inventory", id });
        },
        consumeInventoryItem: (id, mode, amount) => {
          queueRemoteAction({ type: "consume-inventory", id, mode, amount }, { type: "consume-inventory", id, mode, amount });
        },
        addShoppingItems: (items) => {
          queueRemoteAction({ type: "add-shopping", items }, { type: "add-shopping", items });
        },
        purchaseShoppingItem: (id, quantity) => {
          queueRemoteAction({ type: "purchase-shopping", id, quantity }, { type: "purchase-shopping", id, quantity });
        },
        removeShoppingItem: (id) => {
          queueRemoteAction({ type: "remove-shopping", id }, { type: "remove-shopping", id });
        },
        setRecipeAnalysis: (analysis) => {
          queueRemoteAction({ type: "set-analysis", analysis }, { type: "set-analysis", analysis });
        },
        addRecipe: (recipe) => {
          queueRemoteAction({ type: "add-recipe", recipe }, { type: "add-recipe", recipe });
        },
        deleteRecipe: (id) => {
          queueRemoteAction({ type: "delete-recipe", id }, { type: "delete-recipe", id });
        },
        scheduleRecipe: (recipeId, day, meal) => {
          const existingEntry = state.weeklyPlan.find((entry) => entry.day === day && entry.meal === meal);
          const entryId = existingEntry?.id ?? createId("plan");

          queueRemoteAction(
            { type: "schedule-recipe", recipeId, day, meal, entryId },
            { type: "schedule-recipe", recipeId, day, meal, entryId },
          );
        },
        removePlanEntry: (id) => {
          queueRemoteAction({ type: "remove-plan-entry", id }, { type: "remove-plan-entry", id });
        },
        markPlanCooked: (id) => {
          queueRemoteAction({ type: "mark-plan-cooked", id }, { type: "mark-plan-cooked", id });
        },
        dismissExpiring: (ids) => {
          queueRemoteAction({ type: "dismiss-expiring", ids }, { type: "dismiss-expiring", ids });
        },
      }}
    >
      {children}
    </KitchenContext.Provider>
  );
}

export function useKitchen() {
  const context = useContext(KitchenContext);

  if (!context) {
    throw new Error("useKitchen must be used inside KitchenProvider");
  }

  return context;
}


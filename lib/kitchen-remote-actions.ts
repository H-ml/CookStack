import type {
  IngredientDraft,
  InventoryItem,
  KitchenState,
  MealSlot,
  RecipeAnalysis,
  RecipeGapItem,
  RecipeRecord,
  WeekDay,
} from "@/components/kitchen-types";

export type ConsumeMode = "all" | "half" | "custom";

export type RemoteKitchenAction =
  | { type: "seed-state"; state: KitchenState }
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

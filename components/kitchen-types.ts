export const INVENTORY_CATEGORIES = ["蔬菜", "肉类", "调料", "干货", "其他"] as const;
export const INVENTORY_UNITS = ["个", "斤", "克", "公斤", "两", "升", "毫升", "根"] as const;
export const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
export const MEAL_SLOTS = ["早餐", "午餐", "晚餐"] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];
export type InventoryStatus = "in-stock" | "consumed";
export type InventoryFilter = "全部" | "临近过期" | InventoryCategory;
export type WeekDay = (typeof WEEK_DAYS)[number];
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface IngredientDraft {
  id: string;
  name: string;
  quantity: number;
  unit: InventoryUnit;
  category: InventoryCategory;
}

export interface InventoryItem extends IngredientDraft {
  expiryDate: string;
  status: InventoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem extends IngredientDraft {
  createdAt: string;
}

export interface RecipeGapItem extends IngredientDraft {
  currentQuantity: number;
  gapQuantity: number;
  enoughInStock: boolean;
}

export interface RecipeAnalysis {
  originalText: string;
  ingredients: IngredientDraft[];
  gaps: RecipeGapItem[];
  createdAt: string;
}

export interface RecipeRecord {
  id: string;
  title: string;
  ingredients: IngredientDraft[];
  originalText: string;
  createdAt: string;
  summary?: string;
}

export interface WeeklyPlanEntry {
  id: string;
  recipeId: string;
  day: WeekDay;
  meal: MealSlot;
  cookedAt: string | null;
  createdAt: string;
}

export interface KitchenState {
  inventory: InventoryItem[];
  shoppingList: ShoppingListItem[];
  recipeAnalysis: RecipeAnalysis | null;
  recipes: RecipeRecord[];
  weeklyPlan: WeeklyPlanEntry[];
  dismissedExpiringIds: string[];
}

import { createInitialKitchenState } from "@/components/mock-data";
import type { KitchenState } from "@/components/kitchen-types";

export function coerceKitchenState(rawState: Partial<KitchenState> | null | undefined): KitchenState {
  const initialState = createInitialKitchenState();

  return {
    inventory: rawState?.inventory ?? initialState.inventory,
    shoppingList: rawState?.shoppingList ?? initialState.shoppingList,
    recipeAnalysis: rawState?.recipeAnalysis ?? initialState.recipeAnalysis,
    recipes: rawState?.recipes ?? initialState.recipes,
    weeklyPlan: rawState?.weeklyPlan ?? initialState.weeklyPlan,
    dismissedExpiringIds: rawState?.dismissedExpiringIds ?? initialState.dismissedExpiringIds,
  };
}

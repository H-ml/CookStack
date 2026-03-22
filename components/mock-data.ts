import type { KitchenState, RecipeRecord } from "@/components/kitchen-types";

import { createId, dateDaysFromNow } from "@/components/kitchen-utils";

function createSeedRecipes(createdAt: string): RecipeRecord[] {
  return [
    {
      id: createId("recipe"),
      title: "番茄牛肉面",
      summary: "适合工作日晚餐的快手主食。",
      originalText: "番茄牛肉面：2个番茄、200克牛肉、0.5斤面条、2根小葱。",
      createdAt,
      ingredients: [
        { id: createId("ing"), name: "番茄", quantity: 2, unit: "个", category: "蔬菜" },
        { id: createId("ing"), name: "牛肉", quantity: 200, unit: "克", category: "肉类" },
        { id: createId("ing"), name: "面条", quantity: 0.5, unit: "斤", category: "干货" },
        { id: createId("ing"), name: "小葱", quantity: 2, unit: "根", category: "调料" },
      ],
    },
    {
      id: createId("recipe"),
      title: "土豆炖排骨",
      summary: "适合周末备菜，消耗临期肉类。",
      originalText: "土豆炖排骨：1斤排骨、2个土豆、1个洋葱。",
      createdAt,
      ingredients: [
        { id: createId("ing"), name: "排骨", quantity: 1, unit: "斤", category: "肉类" },
        { id: createId("ing"), name: "土豆", quantity: 2, unit: "个", category: "蔬菜" },
        { id: createId("ing"), name: "洋葱", quantity: 1, unit: "个", category: "蔬菜" },
      ],
    },
    {
      id: createId("recipe"),
      title: "香菇鸡蛋汤",
      summary: "轻量汤品，适合早餐或晚餐搭配。",
      originalText: "香菇鸡蛋汤：6个香菇、2个鸡蛋、2根小葱。",
      createdAt,
      ingredients: [
        { id: createId("ing"), name: "香菇", quantity: 6, unit: "个", category: "蔬菜" },
        { id: createId("ing"), name: "鸡蛋", quantity: 2, unit: "个", category: "其他" },
        { id: createId("ing"), name: "小葱", quantity: 2, unit: "根", category: "调料" },
      ],
    },
  ];
}

export function createInitialKitchenState(): KitchenState {
  const createdAt = new Date().toISOString();
  const seedRecipes = createSeedRecipes(createdAt);

  return {
    inventory: [
      {
        id: createId("inv"),
        name: "番茄",
        quantity: 2,
        unit: "个",
        category: "蔬菜",
        expiryDate: dateDaysFromNow(1),
        status: "in-stock",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createId("inv"),
        name: "牛肉",
        quantity: 0.5,
        unit: "斤",
        category: "肉类",
        expiryDate: dateDaysFromNow(2),
        status: "in-stock",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createId("inv"),
        name: "鸡蛋",
        quantity: 6,
        unit: "个",
        category: "其他",
        expiryDate: dateDaysFromNow(5),
        status: "in-stock",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createId("inv"),
        name: "土豆",
        quantity: 4,
        unit: "个",
        category: "蔬菜",
        expiryDate: dateDaysFromNow(7),
        status: "in-stock",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createId("inv"),
        name: "生抽",
        quantity: 500,
        unit: "毫升",
        category: "调料",
        expiryDate: dateDaysFromNow(120),
        status: "in-stock",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createId("inv"),
        name: "面条",
        quantity: 1,
        unit: "斤",
        category: "干货",
        expiryDate: dateDaysFromNow(180),
        status: "in-stock",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    shoppingList: [
      {
        id: createId("shop"),
        name: "香菇",
        quantity: 6,
        unit: "个",
        category: "蔬菜",
        createdAt,
      },
      {
        id: createId("shop"),
        name: "小葱",
        quantity: 2,
        unit: "根",
        category: "调料",
        createdAt,
      },
    ],
    recipeAnalysis: null,
    recipes: seedRecipes,
    weeklyPlan: [
      {
        id: createId("plan"),
        recipeId: seedRecipes[0].id,
        day: "周一",
        meal: "晚餐",
        cookedAt: null,
        createdAt,
      },
      {
        id: createId("plan"),
        recipeId: seedRecipes[2].id,
        day: "周三",
        meal: "早餐",
        cookedAt: null,
        createdAt,
      },
    ],
    dismissedExpiringIds: [],
  };
}

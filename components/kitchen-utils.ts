import type {
  IngredientDraft,
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
  MealSlot,
  RecipeAnalysis,
  RecipeGapItem,
  RecipeRecord,
  WeeklyPlanEntry,
} from "@/components/kitchen-types";

const weightUnits: Record<string, number> = {
  克: 1,
  两: 50,
  斤: 500,
  公斤: 1000,
};

const volumeUnits: Record<string, number> = {
  毫升: 1,
  升: 1000,
};

const countUnits = new Set<InventoryUnit>(["个", "根"]);

const categoryKeywords: Record<InventoryCategory, string[]> = {
  蔬菜: ["番茄", "土豆", "黄瓜", "青椒", "西兰花", "香菇", "菠菜", "茄子", "胡萝卜", "洋葱", "小葱", "蒜苗", "白菜"],
  肉类: ["牛肉", "猪肉", "排骨", "鸡胸", "鸡腿", "虾仁", "鱼片", "鸡翅", "羊肉"],
  调料: ["生抽", "老抽", "盐", "糖", "醋", "料酒", "蚝油", "胡椒", "辣椒", "花椒", "豆瓣酱", "芝麻油"],
  干货: ["面条", "挂面", "米粉", "粉丝", "木耳", "紫菜", "香料", "面粉"],
  其他: ["鸡蛋", "牛奶", "豆腐"],
};

const recipeLexicon: Array<IngredientDraft> = [
  { id: "lex-1", name: "番茄", quantity: 2, unit: "个", category: "蔬菜" },
  { id: "lex-2", name: "鸡蛋", quantity: 2, unit: "个", category: "其他" },
  { id: "lex-3", name: "牛肉", quantity: 200, unit: "克", category: "肉类" },
  { id: "lex-4", name: "土豆", quantity: 2, unit: "个", category: "蔬菜" },
  { id: "lex-5", name: "洋葱", quantity: 1, unit: "个", category: "蔬菜" },
  { id: "lex-6", name: "香菇", quantity: 6, unit: "个", category: "蔬菜" },
  { id: "lex-7", name: "小葱", quantity: 2, unit: "根", category: "调料" },
  { id: "lex-8", name: "黄瓜", quantity: 1, unit: "根", category: "蔬菜" },
  { id: "lex-9", name: "排骨", quantity: 1, unit: "斤", category: "肉类" },
  { id: "lex-10", name: "面条", quantity: 0.5, unit: "斤", category: "干货" },
];

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function roundQuantity(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : roundQuantity(value).toString();
}

export function formatMealLabel(slot: MealSlot) {
  return slot;
}

export function dateDaysFromNow(days: number) {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() + days);

  return baseDate.toISOString().slice(0, 10);
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

export function daysUntil(value: string) {
  const targetDate = new Date(value);
  targetDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((targetDate.getTime() - today.getTime()) / 86400000);
}

export function getItemUrgency(item: InventoryItem) {
  const remainingDays = daysUntil(item.expiryDate);

  if (item.status === "consumed") {
    return "muted";
  }

  if (remainingDays < 0) {
    return "expired";
  }

  if (remainingDays <= 3) {
    return "warning";
  }

  return "normal";
}

export function getExpiryLabel(value: string) {
  const remainingDays = daysUntil(value);

  if (remainingDays < 0) {
    return `已过期 ${Math.abs(remainingDays)} 天`;
  }

  if (remainingDays === 0) {
    return "今天到期";
  }

  if (remainingDays <= 3) {
    return `还剩 ${remainingDays} 天`;
  }

  return `${remainingDays} 天后过期`;
}

export function inferCategory(name: string): InventoryCategory {
  const trimmedName = name.trim();

  for (const [category, keywords] of Object.entries(categoryKeywords) as Array<[InventoryCategory, string[]]>) {
    if (keywords.some((keyword) => trimmedName.includes(keyword))) {
      return category;
    }
  }

  return "其他";
}

export function defaultUnitForName(name: string): InventoryUnit {
  if (/(牛肉|猪肉|鸡胸|排骨|面条)/.test(name)) {
    return "斤";
  }

  if (/(小葱|黄瓜)/.test(name)) {
    return "根";
  }

  if (/(生抽|老抽|牛奶|酸奶)/.test(name)) {
    return "毫升";
  }

  return "个";
}

export function defaultShelfLife(category: InventoryCategory) {
  switch (category) {
    case "蔬菜":
      return 5;
    case "肉类":
      return 3;
    case "调料":
      return 90;
    case "干货":
      return 180;
    default:
      return 7;
  }
}

export function buildInventoryItem(draft: IngredientDraft): InventoryItem {
  const now = new Date().toISOString();

  return {
    ...draft,
    expiryDate: dateDaysFromNow(defaultShelfLife(draft.category)),
    status: "in-stock",
    createdAt: now,
    updatedAt: now,
  };
}

function parseChineseNumber(token: string): number {
  if (!token) {
    return Number.NaN;
  }

  if (/^\d+(\.\d+)?$/.test(token)) {
    return Number.parseFloat(token);
  }

  if (token === "半") {
    return 0.5;
  }

  if (token.endsWith("半")) {
    const prefixValue = parseChineseNumber(token.slice(0, -1));
    if (!Number.isNaN(prefixValue)) {
      return prefixValue + 0.5;
    }
  }

  const map: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  if (token === "十") {
    return 10;
  }

  if (token.includes("十")) {
    const [left, right] = token.split("十");
    const tens = left ? (map[left] ?? Number.NaN) : 1;
    const ones = right ? (map[right] ?? Number.NaN) : 0;

    if (!Number.isNaN(tens) && !Number.isNaN(ones)) {
      return tens * 10 + ones;
    }
  }

  if (token.length === 1 && token in map) {
    return map[token];
  }

  return Number.NaN;
}

function normalizeName(rawName: string) {
  return rawName
    .replace(/^(了|有|又|买|入库|采购|新增|添加)/, "")
    .replace(/(一些|一点|若干|左右|大概|大约)$/g, "")
    .replace(/[^\u4e00-\u9fa5A-Za-z]/g, "")
    .trim();
}

function normalizeRecipeTitle(text: string) {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (firstLine && firstLine.length <= 24 && !/食材|步骤|做法/.test(firstLine)) {
    return firstLine.replace(/[：:。]/g, "");
  }

  return `AI 导入食谱 ${new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date())}`;
}

function buildIngredient(name: string, quantity: number, unit: InventoryUnit, category?: InventoryCategory): IngredientDraft {
  return {
    id: createId("ingredient"),
    name,
    quantity: roundQuantity(quantity),
    unit,
    category: category ?? inferCategory(name),
  };
}

function parseIngredientSegment(segment: string): IngredientDraft | null {
  const cleaned = segment.trim().replace(/^(买了|买回了|买回|冰箱里进了|冰箱进了|采购了|补了|新增了|添加了)/, "");

  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/^(\d+(?:\.\d+)?|半|[零一二两三四五六七八九十]+半?|[零一二两三四五六七八九十]+)?\s*(公斤|毫升|个|斤|克|两|升|根)?([\u4e00-\u9fa5A-Za-z]+)/);

  if (!match?.[3]) {
    return null;
  }

  const name = normalizeName(match[3]);
  if (!name) {
    return null;
  }

  const quantity = match[1] ? parseChineseNumber(match[1]) : 1;
  const unit = (match[2] as InventoryUnit | undefined) ?? defaultUnitForName(name);

  return buildIngredient(name, Number.isNaN(quantity) ? 1 : quantity, unit);
}

export function parseInventoryCommand(input: string) {
  const rawText = input.trim();

  if (!rawText) {
    return { type: "unknown" as const, items: [] as IngredientDraft[] };
  }

  if (/(快坏|快过期|快坏了|快到期|临近过期)/.test(rawText)) {
    return { type: "expiry-query" as const, items: [] as IngredientDraft[] };
  }

  const segments = rawText
    .replace(/[。！？?]/g, "")
    .split(/(?:，|,|、|和|以及|及|\n)/)
    .map((segment) => parseIngredientSegment(segment))
    .filter((segment): segment is IngredientDraft => Boolean(segment));

  if (segments.length === 0) {
    return { type: "unknown" as const, items: [] as IngredientDraft[] };
  }

  return { type: "inventory" as const, items: segments };
}

function convertQuantity(value: number, fromUnit: InventoryUnit, targetUnit: InventoryUnit) {
  if (fromUnit === targetUnit) {
    return value;
  }

  if (fromUnit in weightUnits && targetUnit in weightUnits) {
    return (value * weightUnits[fromUnit]) / weightUnits[targetUnit];
  }

  if (fromUnit in volumeUnits && targetUnit in volumeUnits) {
    return (value * volumeUnits[fromUnit]) / volumeUnits[targetUnit];
  }

  if (countUnits.has(fromUnit) && countUnits.has(targetUnit)) {
    return value;
  }

  return Number.NaN;
}

function toBaseUnit(value: number, unit: InventoryUnit) {
  if (unit in weightUnits) {
    return value * weightUnits[unit];
  }

  if (unit in volumeUnits) {
    return value * volumeUnits[unit];
  }

  return value;
}

function fromBaseUnit(value: number, unit: InventoryUnit) {
  if (unit in weightUnits) {
    return value / weightUnits[unit];
  }

  if (unit in volumeUnits) {
    return value / volumeUnits[unit];
  }

  return value;
}

function isCompatibleUnit(left: InventoryUnit, right: InventoryUnit) {
  if (left === right) {
    return true;
  }

  if (left in weightUnits && right in weightUnits) {
    return true;
  }

  if (left in volumeUnits && right in volumeUnits) {
    return true;
  }

  return countUnits.has(left) && countUnits.has(right);
}

export function availableQuantityForName(name: string, targetUnit: InventoryUnit, inventory: InventoryItem[]) {
  return roundQuantity(
    inventory
      .filter((item) => item.status === "in-stock" && item.name === name)
      .reduce((total, item) => {
        const converted = convertQuantity(item.quantity, item.unit, targetUnit);
        return Number.isNaN(converted) ? total : total + converted;
      }, 0),
  );
}

function ingredientKey(ingredient: Pick<IngredientDraft, "name" | "unit">) {
  return `${ingredient.name}::${ingredient.unit}`;
}

export function aggregateIngredients(ingredients: IngredientDraft[]) {
  const map = new Map<string, IngredientDraft>();

  for (const ingredient of ingredients) {
    const key = ingredientKey(ingredient);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...ingredient });
      continue;
    }

    existing.quantity = roundQuantity(existing.quantity + ingredient.quantity);
  }

  return Array.from(map.values());
}

export function extractRecipeIngredients(text: string) {
  const matches = text.matchAll(
    /(\d+(?:\.\d+)?|半|[零一二两三四五六七八九十]+半?|[零一二两三四五六七八九十]+)\s*(公斤|毫升|个|斤|克|两|升|根)\s*([\u4e00-\u9fa5A-Za-z]{1,12})/g,
  );

  const explicitIngredients: IngredientDraft[] = [];

  for (const match of matches) {
    const quantity = parseChineseNumber(match[1]);
    const unit = match[2] as InventoryUnit;
    const name = normalizeName(match[3]);

    if (!name || Number.isNaN(quantity)) {
      continue;
    }

    explicitIngredients.push(buildIngredient(name, quantity, unit));
  }

  const lexicalIngredients = recipeLexicon
    .filter((ingredient) => text.includes(ingredient.name))
    .map((ingredient) => ({ ...ingredient, id: createId("ingredient") }));

  const merged = aggregateIngredients(
    explicitIngredients.length > 0 ? [...explicitIngredients, ...lexicalIngredients] : lexicalIngredients,
  );

  if (merged.length > 0) {
    return merged;
  }

  return [
    buildIngredient("番茄", 2, "个", "蔬菜"),
    buildIngredient("鸡蛋", 2, "个", "其他"),
  ];
}

export function createRecipeRecordFromText(text: string, overrides?: Partial<Omit<RecipeRecord, "id" | "createdAt" | "originalText">>) {
  const ingredients = overrides?.ingredients ? aggregateIngredients(overrides.ingredients) : extractRecipeIngredients(text);

  return {
    id: createId("recipe"),
    title: overrides?.title?.trim() || normalizeRecipeTitle(text),
    summary: overrides?.summary?.trim() || `共 ${ingredients.length} 种食材，适合加入本周计划。`,
    originalText: text,
    createdAt: new Date().toISOString(),
    ingredients,
  } satisfies RecipeRecord;
}

export function analyzeRecipeText(text: string, inventory: InventoryItem[]): RecipeAnalysis {
  const ingredients = extractRecipeIngredients(text);
  const gaps = computeGapItemsFromIngredients(ingredients, inventory);

  return {
    originalText: text,
    ingredients,
    gaps,
    createdAt: new Date().toISOString(),
  };
}

export function computeGapItemsFromIngredients(ingredients: IngredientDraft[], inventory: InventoryItem[]) {
  return aggregateIngredients(ingredients).map<RecipeGapItem>((ingredient) => {
    const currentQuantity = availableQuantityForName(ingredient.name, ingredient.unit, inventory);
    const gapQuantity = roundQuantity(Math.max(ingredient.quantity - currentQuantity, 0));

    return {
      ...ingredient,
      currentQuantity,
      gapQuantity,
      enoughInStock: gapQuantity <= 0,
    };
  });
}

export function compareRecipeInventory(recipe: RecipeRecord, inventory: InventoryItem[]) {
  return recipe.ingredients.map((ingredient) => {
    const currentQuantity = availableQuantityForName(ingredient.name, ingredient.unit, inventory);
    const missing = currentQuantity <= 0;
    const shortage = !missing && currentQuantity < ingredient.quantity;

    return {
      ingredient,
      currentQuantity,
      missing,
      shortage,
    };
  });
}

export function aggregateWeeklyPlanIngredients(weeklyPlan: WeeklyPlanEntry[], recipes: RecipeRecord[]) {
  const ingredients = weeklyPlan
    .filter((entry) => !entry.cookedAt)
    .flatMap((entry) => recipes.find((recipe) => recipe.id === entry.recipeId)?.ingredients ?? []);

  return aggregateIngredients(ingredients);
}

export function consumeIngredientsFromInventory(inventory: InventoryItem[], ingredients: IngredientDraft[]) {
  const nextInventory = inventory.map((item) => ({ ...item }));

  for (const ingredient of ingredients) {
    let remainingBase = toBaseUnit(ingredient.quantity, ingredient.unit);

    const candidates = nextInventory.filter(
      (item) => item.status === "in-stock" && item.name === ingredient.name && isCompatibleUnit(item.unit, ingredient.unit),
    );

    for (const item of candidates) {
      if (remainingBase <= 0) {
        break;
      }

      const itemBase = toBaseUnit(item.quantity, item.unit);
      const consumedBase = Math.min(itemBase, remainingBase);
      const nextBase = itemBase - consumedBase;
      const nextQuantity = roundQuantity(Math.max(fromBaseUnit(nextBase, item.unit), 0));

      item.quantity = nextQuantity;
      item.status = nextQuantity <= 0 ? "consumed" : "in-stock";
      item.updatedAt = new Date().toISOString();
      remainingBase -= consumedBase;
    }
  }

  return nextInventory;
}

export function upsertInventoryItem(inventory: InventoryItem[], nextItem: InventoryItem) {
  const existing = inventory.find(
    (item) =>
      item.status === "in-stock" &&
      item.name === nextItem.name &&
      item.unit === nextItem.unit &&
      item.category === nextItem.category,
  );

  if (!existing) {
    return [nextItem, ...inventory];
  }

  return inventory.map((item) => {
    if (item.id !== existing.id) {
      return item;
    }

    return {
      ...item,
      quantity: roundQuantity(item.quantity + nextItem.quantity),
      expiryDate:
        new Date(item.expiryDate).getTime() <= new Date(nextItem.expiryDate).getTime()
          ? item.expiryDate
          : nextItem.expiryDate,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function sortInventory(items: InventoryItem[]) {
  return [...items].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "in-stock" ? -1 : 1;
    }

    return daysUntil(left.expiryDate) - daysUntil(right.expiryDate);
  });
}

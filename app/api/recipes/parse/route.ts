import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { createId, createRecipeRecordFromText } from "@/components/kitchen-utils";
import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from "@/components/kitchen-types";

export const runtime = "nodejs";

const DEFAULT_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_SILICONFLOW_MODEL = "Pro/Qwen/Qwen2.5-7B-Instruct";

const RecipeSchema = z.object({
  title: z.string().min(1).max(40),
  summary: z.string().max(120).optional(),
  ingredients: z.array(
    z.object({
      name: z.string().min(1).max(20),
      quantity: z.number().positive(),
      unit: z.enum(INVENTORY_UNITS),
      category: z.enum(INVENTORY_CATEGORIES),
    }),
  ).min(1),
});

function getLlmConfig() {
  const siliconFlowApiKey = process.env.SILICONFLOW_API_KEY?.trim();
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = siliconFlowApiKey || openAiApiKey;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseURL:
      process.env.SILICONFLOW_BASE_URL?.trim() ||
      process.env.OPENAI_BASE_URL?.trim() ||
      DEFAULT_SILICONFLOW_BASE_URL,
    model:
      process.env.SILICONFLOW_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      DEFAULT_SILICONFLOW_MODEL,
    source: siliconFlowApiKey ? ("siliconflow" as const) : ("llm" as const),
  };
}

function extractJsonPayload(content: string) {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || content.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const startIndex = candidate.indexOf("{");
    const endIndex = candidate.lastIndexOf("}");

    if (startIndex >= 0 && endIndex > startIndex) {
      return JSON.parse(candidate.slice(startIndex, endIndex + 1));
    }

    throw new Error("invalid json payload");
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { text?: string };
    const text = payload.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const fallbackRecipe = createRecipeRecordFromText(text);
    const llmConfig = getLlmConfig();

    if (!llmConfig) {
      return NextResponse.json({ recipe: fallbackRecipe, source: "fallback" as const });
    }

    try {
      const client = new OpenAI({
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.baseURL,
      });

      const completion = await client.chat.completions.create({
        model: llmConfig.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              `你是食谱结构化助手。请把用户输入的中文食谱文本提炼成一个 JSON 对象，不要输出 Markdown，不要输出额外解释。JSON 结构必须是 {"title":"", "summary":"", "ingredients":[{"name":"", "quantity":1, "unit":"个", "category":"蔬菜"}]}。unit 只能从 ${INVENTORY_UNITS.join("、")} 中选择，category 只能从 ${INVENTORY_CATEGORIES.join("、")} 中选择。quantity 必须是数字。`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      });

      const rawContent = completion.choices[0]?.message.content?.trim();

      if (!rawContent) {
        return NextResponse.json({ recipe: fallbackRecipe, source: "fallback" as const });
      }

      const parsed = RecipeSchema.parse(extractJsonPayload(rawContent));
      const recipe = createRecipeRecordFromText(text, {
        title: parsed.title,
        summary: parsed.summary,
        ingredients: parsed.ingredients.map((ingredient) => ({
          id: createId("ingredient"),
          ...ingredient,
        })),
      });

      return NextResponse.json({ recipe, source: llmConfig.source });
    } catch {
      return NextResponse.json({ recipe: fallbackRecipe, source: "fallback" as const });
    }
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}

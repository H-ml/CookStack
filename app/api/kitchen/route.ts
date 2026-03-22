import { NextResponse } from "next/server";

import type { KitchenState } from "@/components/kitchen-types";
import { coerceKitchenState } from "@/lib/kitchen-state";
import { loadKitchenState, saveKitchenState } from "@/lib/kitchen-supabase";
import { getSupabaseRequestUser, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ enabled: false });
  }

  const client = getSupabaseServerClient();
  const user = await getSupabaseRequestUser(request);

  if (!client || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const state = await loadKitchenState(client, user.id);

    return NextResponse.json({
      enabled: true,
      state,
    });
  } catch {
    return NextResponse.json({
      enabled: false,
      reason: "schema_not_ready",
    });
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const client = getSupabaseServerClient();
  const user = await getSupabaseRequestUser(request);

  if (!client || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { state?: Partial<KitchenState> };

    if (!payload.state) {
      return NextResponse.json({ error: "state is required" }, { status: 400 });
    }

    const state = coerceKitchenState(payload.state);
    await saveKitchenState(client, user.id, state);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}

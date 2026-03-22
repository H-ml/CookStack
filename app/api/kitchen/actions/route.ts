import { NextResponse } from "next/server";

import type { RemoteKitchenAction } from "@/lib/kitchen-remote-actions";
import { applyKitchenRemoteAction } from "@/lib/kitchen-supabase";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const client = getSupabaseServerClient();

  if (!client) {
    return NextResponse.json({ error: "Supabase client unavailable" }, { status: 503 });
  }

  try {
    const payload = (await request.json()) as { action?: RemoteKitchenAction };

    if (!payload.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const state = await applyKitchenRemoteAction(client, payload.action);

    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ error: "action failed" }, { status: 500 });
  }
}

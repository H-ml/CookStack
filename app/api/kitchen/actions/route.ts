import { NextResponse } from "next/server";

import type { RemoteKitchenAction } from "@/lib/kitchen-remote-actions";
import { applyKitchenRemoteAction } from "@/lib/kitchen-supabase";
import { getSupabaseRequestUser, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const client = getSupabaseServerClient();
  const user = await getSupabaseRequestUser(request);

  if (!client || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { action?: RemoteKitchenAction };

    if (!payload.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const state = await applyKitchenRemoteAction(client, user.id, payload.action);

    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ error: "action failed" }, { status: 500 });
  }
}

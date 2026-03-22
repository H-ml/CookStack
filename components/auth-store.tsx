"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/browser";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  isReady: boolean;
  isConfigured: boolean;
  signInWithPassword: (input: { email: string; password: string }) => Promise<{ error: string | null }>;
  signUpWithPassword: (input: { email: string; password: string }) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const isConfigured = isSupabaseBrowserConfigured();

  useEffect(() => {
    let isCancelled = false;

    async function bootstrapAuth() {
      if (!client) {
        setIsReady(true);
        return;
      }

      const { data } = await client.auth.getSession();

      if (!isCancelled) {
        setSession(data.session ?? null);
        setIsReady(true);
      }
    }

    void bootstrapAuth();

    if (!client) {
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsReady(true);
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [client]);

  async function signInWithPassword(input: { email: string; password: string }) {
    if (!client) {
      return { error: "Supabase Auth 未配置" };
    }

    const { error } = await client.auth.signInWithPassword(input);
    return { error: error?.message ?? null };
  }

  async function signUpWithPassword(input: { email: string; password: string }) {
    if (!client) {
      return { error: "Supabase Auth 未配置", needsEmailConfirmation: false };
    }

    const { data, error } = await client.auth.signUp(input);

    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !data.session,
    };
  }

  async function signOut() {
    if (!client) {
      return { error: "Supabase Auth 未配置" };
    }

    const { error } = await client.auth.signOut();
    return { error: error?.message ?? null };
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        accessToken: session?.access_token ?? null,
        isReady,
        isConfigured,
        signInWithPassword,
        signUpWithPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

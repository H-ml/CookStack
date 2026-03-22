"use client";

import { Toaster } from "sonner";

import { AuthProvider } from "@/components/auth-store";
import { KitchenProvider } from "@/components/kitchen-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <KitchenProvider>
        {children}
        <Toaster position="top-center" richColors />
      </KitchenProvider>
    </AuthProvider>
  );
}

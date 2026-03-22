"use client";

import { Toaster } from "sonner";

import { KitchenProvider } from "@/components/kitchen-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <KitchenProvider>
      {children}
      <Toaster position="top-center" richColors />
    </KitchenProvider>
  );
}



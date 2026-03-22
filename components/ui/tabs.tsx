"use client";

import { createContext, useContext, useMemo, useState } from "react";
import clsx from "clsx";

interface TabsContextValue {
  value: string;
  setValue: (nextValue: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  children: React.ReactNode;
  className?: string;
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ children, className, defaultValue, value, onValueChange }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: currentValue,
      setValue: (nextValue) => {
        if (value === undefined) {
          setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
      },
    }),
    [currentValue, onValueChange, value],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={clsx("tabs-root", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("tabs-list", className)} role="tablist">
      {children}
    </div>
  );
}

export function TabsTrigger({ children, className, value }: { children: React.ReactNode; className?: string; value: string }) {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("TabsTrigger must be used inside Tabs");
  }

  const isActive = context.value === value;

  return (
    <button
      aria-selected={isActive}
      className={clsx("tabs-trigger", isActive && "tabs-trigger--active", className)}
      onClick={() => context.setValue(value)}
      role="tab"
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, className, value }: { children: React.ReactNode; className?: string; value: string }) {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("TabsContent must be used inside Tabs");
  }

  if (context.value !== value) {
    return null;
  }

  return (
    <div className={clsx("tabs-content", className)} role="tabpanel">
      {children}
    </div>
  );
}

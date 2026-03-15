import React from "react";
import BottomNav from "./BottomNav";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
  headerLeft?: React.ReactNode;
  hideNav?: boolean;
}

export default function Layout({
  children,
  title,
  headerRight,
  headerLeft,
  hideNav = false,
}: LayoutProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-background-app">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-10 bg-background-surface border-b border-gray-100 px-4 h-14 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            {headerLeft}
          </div>
          <h1 className="text-lg font-semibold text-text-primary absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {headerRight}
          </div>
        </header>
      )}

      {/* Content */}
      <main className={`flex-1 max-w-[480px] md:max-w-3xl lg:max-w-5xl w-full mx-auto ${hideNav ? "pb-4" : "pb-safe"}`}>
        {children}
      </main>

      {/* Bottom Nav */}
      {!hideNav && <BottomNav />}
    </div>
  );
}

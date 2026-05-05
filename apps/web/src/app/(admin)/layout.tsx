"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic style for main content margin based on sidebar state
  const mainContentStyle = {
    marginLeft: isMobileOpen
      ? "0px"
      : isExpanded || isHovered
      ? "var(--sidebar-width-expanded)"
      : "var(--sidebar-width-collapsed)",
  };

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        style={mainContentStyle}
        className="flex-1 transition-all duration-300 ease-in-out"
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-(--main-padding) mx-auto max-w-(--breakpoint-2xl) md:p-(--main-padding-md)">
          {children}
        </div>
      </div>
    </div>
  );
}

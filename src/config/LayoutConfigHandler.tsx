"use client";

import { useEffect } from "react";
import { themeConfig } from "./themeConfig";

export const LayoutConfigHandler = () => {
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply sidebar widths
    root.style.setProperty("--sidebar-width-expanded", themeConfig.sidebar.widthExpanded);
    root.style.setProperty("--sidebar-width-collapsed", themeConfig.sidebar.widthCollapsed);
    
    // Apply spacing
    root.style.setProperty("--main-padding", themeConfig.spacing.containerPadding);
    root.style.setProperty("--main-padding-md", themeConfig.spacing.containerPaddingMd);
    root.style.setProperty("--section-gap", themeConfig.spacing.sectionGap);
    
    // Apply border radius
    root.style.setProperty("--border-radius-base", themeConfig.borderRadius.base);
    root.style.setProperty("--border-radius-large", themeConfig.borderRadius.large);

    // Apply colors
    root.style.setProperty("--color-brand-500", themeConfig.colors.primary);
    root.style.setProperty("--color-brand-600", themeConfig.colors.primaryHover);
  }, []);

  return null;
};

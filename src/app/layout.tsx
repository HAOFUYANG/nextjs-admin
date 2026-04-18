import { Outfit, Geist } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LayoutConfigHandler } from '@/config/LayoutConfigHandler';
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const globalStyles = {
    "--radius": "6px",
  } as React.CSSProperties;

  return (
    <html lang="en" className={cn("font-sans", geist.variable)} style={globalStyles}>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <LayoutConfigHandler />
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
